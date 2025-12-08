import path from 'path';
import { test, expect, cleanupRepositories, waitWhileRepositoryIsPending } from 'test-utils';
import { navigateToRepositories } from './helpers/navHelpers';
import {
  closeGenericPopupsIfExist,
  getRowByNameOrUrl,
  retry,
  waitForValidStatus,
} from './helpers/helpers';

const uploadRepoName = 'Upload Repo!';

test.describe('Upload Repositories', () => {
  test('Upload repo creation and deletion', async ({ page, client, cleanup }) => {
    await cleanup.runAndAdd(() => cleanupRepositories(client, uploadRepoName));
    await closeGenericPopupsIfExist(page);
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
      const [, bulkCreateResponse] = await Promise.all([
        page.getByRole('button', { name: 'Save and upload content' }).click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
        ),
      ]);

      // Upload can fail if repository is not valid HMS-9856
      // Poll API until repository is no longer pending, then verify it's Valid
      const bulkCreateData = await bulkCreateResponse.json();
      const repoUuid = bulkCreateData[0]?.uuid;
      expect(repoUuid).toBeTruthy();
      const repo = await waitWhileRepositoryIsPending(client, repoUuid);
      expect(repo.status).toBe('Valid');

      // Handle the file chooser and upload the file
      await expect(page.getByText('Drag and drop files here')).toBeVisible();
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

      // Verify the 'Valid' status
      await waitForValidStatus(page, uploadRepoName);
    });

    await test.step('Delete one upload repository', async () => {
      const row = await getRowByNameOrUrl(page, uploadRepoName);
      // Check if the 'Kebab toggle' button is disabled
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      // Wait for the delete modal to fully load (shows repo name when data is ready)
      await expect(page.getByText('Delete repositories?')).toBeVisible();
      await expect(page.getByRole('dialog').getByText(uploadRepoName)).toBeVisible();

      // Click Delete and wait for the API response
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('bulk_delete') && resp.status() >= 200 && resp.status() < 300,
        ),
        page.getByRole('button', { name: 'Delete' }).click(),
      ]);

      await expect(row).toBeHidden();
    });
  });
});
