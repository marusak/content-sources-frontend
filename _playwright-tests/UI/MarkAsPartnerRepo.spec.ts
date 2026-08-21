import { test, expect, cleanupRepositories, waitWhileRepositoryIsPending } from 'test-utils';
import { navigateToRepositories } from './helpers/navHelpers';
import {
  closeGenericPopupsIfExist,
  getRowByNameOrUrl,
  randomName,
  waitForValidStatus,
} from './helpers/helpers';

const uploadRepoNamePrefix = 'Partner-Mark';

test.describe('Mark upload repository as partner', () => {
  test.use({ storageState: '.auth/ADMIN_TOKEN.json' });

  test('Mark as partner from kebab shows Partnered label', async ({ page, client, cleanup }) => {
    const featuresResponse = await page.request.get('/api/content-sources/v1/features/');
    const features = await featuresResponse.json();
    test.skip(
      !(
        features.adminpartnerrepositories?.enabled && features.adminpartnerrepositories?.accessible
      ),
      'adminpartnerrepositories not accessible',
    );

    const uploadRepoName = `${uploadRepoNamePrefix}-${randomName()}`;
    await cleanup.runAndAdd(() => cleanupRepositories(client, uploadRepoNamePrefix));
    await closeGenericPopupsIfExist(page);
    await navigateToRepositories(page);

    await test.step('Create upload repository', async () => {
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.locator('div[id^="pf-modal-part"]').first()).toBeVisible();

      await page.getByPlaceholder('Enter name').fill(uploadRepoName);
      await page.getByLabel('Upload', { exact: true }).check();

      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();

      const versionFilterButton = page.getByRole('button', { name: 'filter OS version' });
      await versionFilterButton.click();
      await page.getByRole('menuitem', { name: 'RHEL 9' }).click();
      await versionFilterButton.click();

      const [, bulkCreateResponse] = await Promise.all([
        page.getByRole('button', { name: 'Save and upload content' }).click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
        ),
      ]);

      const bulkCreateData = await bulkCreateResponse.json();
      const repoUuid = bulkCreateData[0]?.uuid;
      expect(repoUuid).toBeTruthy();
      const repo = await waitWhileRepositoryIsPending(client, repoUuid);
      expect(repo.status).toBe('Valid');

      // Close upload content modal without uploading packages
      await page.getByRole('button', { name: 'Cancel' }).click();
      await waitForValidStatus(page, uploadRepoName);
    });

    await test.step('Mark repository as partner', async () => {
      const row = await getRowByNameOrUrl(page, uploadRepoName);
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Mark as partner repository' }).click();

      const dialog = page.getByRole('dialog');
      await expect(dialog.getByText('Mark as partner repository').first()).toBeVisible();

      const confirm = dialog.getByRole('button', { name: 'Mark as partner repository' });
      await expect(confirm).toBeDisabled();

      await dialog.getByLabel('I understand that snapshots must be published manually.').check();
      await expect(confirm).toBeEnabled();

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/admin/repositories/') &&
            resp.url().includes('/partner') &&
            resp.request().method() === 'PATCH' &&
            resp.status() === 200,
        ),
        confirm.click(),
      ]);

      await expect(row.getByText('Partnered')).toBeVisible();
    });

    await test.step('Mark as partner action is hidden after partnered', async () => {
      const row = await getRowByNameOrUrl(page, uploadRepoName);
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await expect(page.getByRole('menuitem', { name: 'Mark as partner repository' })).toBeHidden();
    });
  });
});
