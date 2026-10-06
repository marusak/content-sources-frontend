import path from 'path';
import type { Page } from '@playwright/test';

import {
  test,
  expect,
  cleanupRepositories,
  randomName,
  waitWhileRepositoryIsPending,
} from 'test-utils';
import { BULK_TASK_TIMEOUT_MS, REPO_VALID_STATUS_TIMEOUT_MS } from '../testConstants';
import {
  closeGenericPopupsIfExist,
  getRowByNameOrUrl,
  retry,
  waitForValidStatus,
} from './helpers/helpers';
import { navigateToRepositories } from './helpers/navHelpers';

const uploadRepoNamePrefix = 'package-modal-delete-upload';
const externalRepoNamePrefix = 'package-modal-delete-external';
const externalRepoUrl = 'https://jlsherrill.fedorapeople.org/fake-repos/signed/';
const packageName = 'bear';

const openPackagesModal = async (page: Page, repoName: string) => {
  const row = await getRowByNameOrUrl(page, repoName);
  await row.getByTestId('package_count_button').click();
  const packagesModal = page.getByRole('dialog', { name: 'Packages' });
  await expect(packagesModal).toBeVisible();
  await expect(packagesModal.getByTestId('packages_table')).toBeVisible();
  return packagesModal;
};

test.describe('PackageModal delete packages', () => {
  test('Upload repository can delete a package from PackageModal', async ({
    page,
    client,
    cleanup,
  }) => {
    const uploadRepoName = `${uploadRepoNamePrefix}-${randomName()}`;

    await cleanup.runAndAdd(() => cleanupRepositories(client, uploadRepoNamePrefix));
    await closeGenericPopupsIfExist(page);
    await navigateToRepositories(page);

    await test.step('Create upload repository and upload an RPM', async () => {
      // click add button
      await page.getByRole('button', { name: 'Add repositories' }).first().click();

      // fill name and check upload checkbox, that is all that is needed
      await page.getByPlaceholder('Enter name').fill(uploadRepoName);
      await page.getByLabel('Upload', { exact: true }).check();

      // click save and other modal will get shown
      const [, bulkCreateResponse] = await Promise.all([
        page.getByRole('button', { name: 'Save and upload content' }).click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
          { timeout: BULK_TASK_TIMEOUT_MS },
        ),
      ]);

      // wait until check repository status becomes valid and "drag and drop" with upload button shows
      const bulkCreateData = await bulkCreateResponse.json();
      const repoUuid = bulkCreateData[0]?.uuid;
      expect(repoUuid).toBeTruthy();
      const repo = await waitWhileRepositoryIsPending(client, repoUuid);
      expect(repo.status).toBe('Valid');
      await expect(page.getByText('Drag and drop files here')).toBeVisible();

      // put in the file to upload
      const filePath = path.join(__dirname, './fixtures/bear-4.1-1.noarch.rpm');
      await retry(page, async (page) => {
        await page.locator('input[type=file]').first().setInputFiles(filePath);
      });
      await expect(page.getByText('All uploads completed!')).toBeVisible();
      await page.getByRole('button', { name: 'Confirm changes' }).click();

      await waitForValidStatus(page, uploadRepoName, REPO_VALID_STATUS_TIMEOUT_MS);
    });

    await test.step('Delete package via row actions in PackageModal', async () => {
      // click on number of package to open the packages modal
      let packagesModal = await openPackagesModal(page, uploadRepoName);

      let row = await getRowByNameOrUrl(packagesModal, packageName);

      // check that bulk select and delete kebab is visible
      await expect(packagesModal.locator('.pf-v6-c-table__td.pf-v6-c-table__check')).toBeVisible();
      await expect(packagesModal.getByTestId('delete-kebab')).toBeVisible();

      // click on the package to delete
      const packageRow = packagesModal.getByRole('row').filter({ hasText: packageName });
      await expect(packageRow).toBeVisible();
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Delete package' }).click();

      // expect that new delete packages? confirm modal shows up
      await expect(page.getByTestId('delete_packages')).toBeVisible();
      await expect(page.getByText('Delete packages?')).toBeVisible();
      await expect(
        page.getByTestId('confirm_delete_packages_table').getByText(packageName),
      ).toBeVisible();

      // confirm to delete the package
      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/rpms/bulk_remove') && resp.status() >= 200 && resp.status() < 300,
        ),
        page.getByTestId('delete_packages_confirm').click(),
      ]);

      row = await getRowByNameOrUrl(page, uploadRepoName);
      await waitForValidStatus(page, uploadRepoName, REPO_VALID_STATUS_TIMEOUT_MS);
      await expect(row.getByTestId('package_count_button').getByText('0')).toBeVisible();

      // verify that no packages show up in the package modal
      packagesModal = await openPackagesModal(page, uploadRepoName);
      await expect(packagesModal.getByRole('heading', { name: 'No packages' })).toBeVisible();
      await packagesModal.getByRole('button').getByText('Close').click();
    });
  });

  test('Non-upload repository does not show delete controls in PackageModal', async ({
    page,
    client,
    cleanup,
  }) => {
    const externalRepoName = `${externalRepoNamePrefix}-${randomName()}`;

    await cleanup.runAndAdd(() =>
      cleanupRepositories(client, externalRepoNamePrefix, externalRepoUrl),
    );
    await closeGenericPopupsIfExist(page);
    await navigateToRepositories(page);

    await test.step('Create external snapshot repository', async () => {
      // create external repository
      await page.getByRole('button', { name: 'Add repositories' }).first().click();

      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(externalRepoName);
      await page.getByLabel('Snapshotting').click();
      await page.getByRole('textbox', { name: 'URL', exact: true }).fill(externalRepoUrl);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await waitForValidStatus(page, externalRepoName);
    });

    await test.step('Verify delete controls are not available in PackageModal', async () => {
      const packagesModal = await openPackagesModal(page, externalRepoName);

      await expect(
        packagesModal
          .getByTestId('packages_table')
          .getByRole('row')
          .filter({ has: page.getByRole('gridcell') })
          .first(),
      ).toBeVisible();
      await expect(
        packagesModal
          .getByTestId('packages_table')
          .getByRole('row')
          .filter({ has: page.getByRole('gridcell') })
          .first()
          .getByRole('button', { name: 'Kebab toggle' }),
      ).toBeHidden();
    });
  });
});
