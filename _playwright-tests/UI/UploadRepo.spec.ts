import path from 'path';
import { test, expect, cleanupRepositories } from 'test-utils';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl, retry } from './helpers/helpers';

const uploadRepoName = 'Upload Repo!';

test.describe('Upload Repositories', () => {
  test('Upload repo creation and deletion', async ({ page, client, cleanup }) => {
    await cleanup.runAndAdd(() => cleanupRepositories(client, uploadRepoName));
    await closePopupsIfExist(page);
    await navigateToRepositories(page);

    await test.step('Create upload repository', async () => {
      // Click 'Add repositories' button
      await page.getByRole('button', { name: 'Add repositories' }).first().click();

      // Wait for the modal to be visible
      await expect(page.locator('div[id^="pf-modal-part"]').first()).toBeVisible();

      // Fill in the 'Enter name' input
      const nameInput = page.getByPlaceholder('Enter name');
      await nameInput.click();
      await nameInput.fill(uploadRepoName);

      // Check the 'Upload' checkbox
      await page.getByLabel('Upload', { exact: true }).check();

      // Filter by architecture
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();

      // Filter by version
      const versionFilterButton = page.getByRole('button', { name: 'filter OS version' });
      await versionFilterButton.click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
      await page.getByRole('menuitem', { name: 'el8' }).click();
      await versionFilterButton.click(); // Close the filter dropdown

      // Wait for the successful API call
      const errorElement = page.locator('.pf-v5-c-helper-text__item.pf-m-error');

      if (await errorElement.isVisible()) {
        throw new Error('Error message in element is visible');
      }

      // Click 'Save and upload content'
      await Promise.all([
        page.getByRole('button', { name: 'Save and upload content' }).click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
        ),
      ]);

      // Handle the file chooser and upload the file
      await retry(page, async (page) => {
        await page
          .locator('#pf-modal-part-1  > div')
          .locator('input[type=file]')
          .setInputFiles(path.join(__dirname, './fixtures/libreOffice.rpm'));
      });

      // Verify the upload completion message
      await expect(page.getByText('All uploads completed!')).toBeVisible();

      // Confirm changes
      await page.getByRole('button', { name: 'Confirm changes' }).click();

      // There might be many rows at this point, we need to ensure that we filter the repo
      const row = await getRowByNameOrUrl(page, uploadRepoName);
      // Verify the 'Valid' status
      await expect(row.getByText('Valid')).toBeVisible();
    });

    await test.step('Delete one upload repository', async () => {
      const row = await getRowByNameOrUrl(page, uploadRepoName);
      // Check if the 'Kebab toggle' button is disabled
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      // Click on the 'Delete' button
      await Promise.all([
        // Verify the 'Delete repositories?' dialog is visible
        expect(page.getByText('Delete repositories?')).toBeVisible(),
        // Wait for the successful API call
        page.waitForResponse(
          (resp) =>
            resp.url().includes('bulk_delete') && resp.status() >= 200 && resp.status() < 300,
        ),
        // Click the 'Delete' button
        page.getByRole('button', { name: 'Delete' }).click(),
        expect(row).not.toBeVisible(),
      ]);
    });
  });
});
