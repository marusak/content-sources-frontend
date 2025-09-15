import { test, expect } from 'test-utils';
import { cleanupRepositories, randomName, randomUrl } from 'test-utils/helpers';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl } from './helpers/helpers';

const repoNamePrefix = 'Repo-CRUD';
const repoName = `${repoNamePrefix}-${randomName()}`;
const url = randomUrl();

test.describe('Custom Repositories CRUD', () => {
  test('Add, Read, update, delete a repo', async ({ page, client, cleanup }) => {
    await cleanup.runAndAdd(() => cleanupRepositories(client, repoNamePrefix));
    await navigateToRepositories(page);
    await closePopupsIfExist(page);

    await test.step('Create a repository', async () => {
      // Click on the 'Add repositories' button
      // HMS-5268 There are two buttons on the ZeroState page
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByRole('dialog', { name: 'Add custom repositories' })).toBeVisible();

      // Fill in the repository details
      await page.getByLabel('Name').fill(`${repoName}`);
      await page.getByLabel('Introspect only').click();
      await page.getByLabel('URL').fill(url);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
    });

    await test.step('Wait for status to be "Valid"', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
    });

    await test.step('Read the repo', async () => {
      // Search for the created repo
      await page.getByRole('searchbox', { name: 'Filter by name/url' }).fill(repoName);
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await row.getByLabel('Kebab toggle').click();
      // Click on the Edit button to see the repo
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(page.getByRole('dialog', { name: 'Edit custom repository' })).toBeVisible();
      // Assert we can read some values
      await expect(page.getByPlaceholder('Enter name', { exact: true })).toHaveValue(`${repoName}`);
      await expect(page.getByPlaceholder('https://', { exact: true })).toHaveValue(`${url}`);
    });

    await test.step('Update the repository', async () => {
      await page.getByPlaceholder('Enter name', { exact: true }).fill(`${repoName}-Edited`);
      // Remove trailing slash from URL to test URL normalization (HMS-1118 regression)
      const urlWithoutSlash = url.endsWith('/') ? url.slice(0, -1) : url;
      await page.getByPlaceholder('https://', { exact: true }).fill(urlWithoutSlash);
      await page.getByLabel('Snapshotting').click();
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    });

    await test.step('Wait for status to be "Valid"', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
    });

    await test.step('Confirm repo was updated', async () => {
      await page.getByRole('searchbox', { name: 'Filter by name/url' }).fill(`${repoName}-Edited`);
      const row = await getRowByNameOrUrl(page, `${repoName}-Edited`);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await row.getByLabel('Kebab toggle').click();
      // Click on the Edit button to see the repo
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(page.getByText('Edit custom repository')).toBeVisible();
      // Assert we can read some values
      await expect(page.getByPlaceholder('Enter name', { exact: true })).toHaveValue(
        `${repoName}-Edited`,
      );
      await expect(page.getByPlaceholder('https://', { exact: true })).toHaveValue(`${url}`);
      await page.getByRole('button', { name: 'Close' }).first().click();
    });

    await test.step('Delete one custom repository', async () => {
      await page.getByRole('searchbox', { name: 'Filter by name/url' }).fill(`${repoName}-Edited`);
      const row = await getRowByNameOrUrl(page, `${repoName}-Edited`);
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Delete repositories?')).toBeVisible();
      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByRole('row', { name: repoName })).not.toBeVisible();
    });
  });
});
