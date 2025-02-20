import { test, expect } from '@playwright/test';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByName, getRowCellByHeader } from './helpers/helpers';
import { deleteAllRepos } from './helpers/deleteRepositories';

test.describe('Introspect Repositories', () => {
  const repoName = 'introspection-test';
  const repoUrl = 'https://fedorapeople.org/groups/katello/fakerepos/zoo/';
  const repoPackageCount = '8';
  const repoVersion = '0.3';
  const repoRelease = '0.8';
  const repoArch = 'noarch';
  const testPackage = 'cheetah';

  test.beforeEach(async ({ page }) => {
    await test.step('Navigate to the repository page', async () => {
      await navigateToRepositories(page);
      await closePopupsIfExist(page);
    });
  });

  test('Create an introspection repository', async ({ page }) => {
    await test.step('Cleanup repository, if using the same url', async () => {
      await deleteAllRepos(page, `&url=${repoUrl}`);
    });

    await test.step('Open the add repository modal', async () => {
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByText('Add custom repositories')).toBeVisible();
    });

    await test.step('Fill the create repository form', async () => {
      await page.getByLabel('Name').fill(repoName);
      await page.getByLabel('URL').fill(repoUrl);
    });

    await test.step('Submit the form and wait for modal to disappear', async () => {
      await Promise.all([
        page.getByRole('button', { name: 'Save' }).first().click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
        ),
        expect(page.getByText('Add custom repositories')).not.toBeVisible(),
      ]);
    });

    await test.step('Wait for status to be "Valid"', async () => {
      const row = await getRowByName(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible();
    });
  });

  test('Check introspected repository packages', async ({ page }) => {
    await test.step('Open the packages modal', async () => {
      const row = await getRowByName(page, repoName);
      await row.getByRole('gridcell', { name: repoPackageCount, exact: true }).locator('a').click();
      await expect(page.getByText('View list of packages')).toBeVisible();
      await expect(page.getByText('Version').first()).toBeVisible();
    });

    await test.step('Check the modal for expected content', async () => {
      const row = page.getByRole('row').filter({ has: page.getByText(testPackage) });
      await Promise.all([
        expect(page.getByText(repoArch)).toHaveCount(8),
        expect((await getRowCellByHeader(row, 'Name')).getByText(testPackage)).toBeVisible(),
        expect((await getRowCellByHeader(row, 'Version')).getByText(repoVersion)).toBeVisible(),
        expect((await getRowCellByHeader(row, 'Release')).getByText(repoRelease)).toBeVisible(),
        expect((await getRowCellByHeader(row, 'Arch')).getByText(repoArch)).toBeVisible(),
      ]);
    });
  });

  test('Delete introspected repository', async ({ page }) => {
    await test.step('Delete created repository', async () => {
      const row = await getRowByName(page, repoName);
      await row.getByLabel('Kebab toggle').click();
      await row.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Remove repositories?')).toBeVisible();

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('bulk_delete') && resp.status() >= 200 && resp.status() < 300,
        ),
        page.getByRole('button', { name: 'Remove' }).click(),
      ]);

      await expect(
        page.getByText('No custom repositories match the filter criteria'),
      ).toBeVisible();
    });
  });
});
