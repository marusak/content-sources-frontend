import { test, expect } from 'test-utils';
import { cleanupRepositories } from 'test-utils/helpers';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl, getRowCellByHeader } from './helpers/helpers';

test.describe('Introspect Repositories', () => {
  const repoName = 'introspection-test';
  const repoUrl = 'https://fedorapeople.org/groups/katello/fakerepos/zoo/';
  const repoPackageCount = '8';
  const repoVersion = '0.3';
  const repoRelease = '0.8';
  const repoArch = 'noarch';
  const testPackage = 'cheetah';

  test('Create and delete an introspection repository', async ({ page, client, cleanup }) => {
    await cleanup.runAndAdd(() => cleanupRepositories(client, repoName, repoUrl));
    await navigateToRepositories(page);
    await closePopupsIfExist(page);

    await test.step('Open the add repository modal', async () => {
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByText('Add custom repositories')).toBeVisible();
    });

    await test.step('Fill the create repository form', async () => {
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(repoName);
      await page.getByRole('textbox', { name: 'URL', exact: true }).fill(repoUrl);
    });

    await test.step('Submit the form and wait for modal to disappear', async () => {
      await Promise.all([
        page.getByRole('button', { name: 'Save' }).first().click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
        ),
        expect(page.getByText('Add custom repositories')).toBeHidden(),
      ]);
    });

    await test.step('Wait for status to be "Valid"', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 180_000 });
    });

    await test.step('Open the packages modal', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await row.getByRole('gridcell', { name: repoPackageCount, exact: true }).locator('a').click();
      await expect(page.getByText('View list of packages')).toBeVisible();
      await expect(page.getByText('Version').first()).toBeVisible();
    });

    await test.step('Check the modal for expected content', async () => {
      const modal = page.getByTestId('rpm_package_modal');
      const row = modal.getByRole('row').filter({ has: page.getByText(testPackage) });
      await Promise.all([
        expect(modal.locator('tbody')).toHaveCount(8),
        expect((await getRowCellByHeader(page, row, 'Name')).getByText(testPackage)).toBeVisible(),
        expect(
          (await getRowCellByHeader(page, row, 'Version')).getByText(repoVersion),
        ).toBeVisible(),
        expect(
          (await getRowCellByHeader(page, row, 'Release')).getByText(repoRelease),
        ).toBeVisible(),
        expect((await getRowCellByHeader(page, row, 'Arch')).getByText(repoArch)).toBeVisible(),
      ]);
      await page.getByRole('button', { name: 'close' }).first().click();
    });

    await test.step('Delete the created repository', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Delete repositories?')).toBeVisible();

      await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes('bulk_delete') && resp.status() >= 200 && resp.status() < 300,
        ),
        page.getByRole('button', { name: 'Delete' }).click(),
      ]);
      // Ensure the specific row is removed
      await expect(row).toBeHidden();
    });
  });
});
