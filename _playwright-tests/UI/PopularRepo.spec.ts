import { test, expect } from 'test-utils';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl } from './helpers/helpers';
import { deleteAllPopularRepos } from './helpers/deletePopularRepositories';

const repoName10 = 'EPEL 10 Everything x86_64';
const repoName9 = 'EPEL 9 Everything x86_64';
const repoName8 = 'EPEL 8 Everything x86_64';
const repos = [repoName10, repoName9, repoName8];

test.describe('Popular Repositories', () => {
  test('Test adding and removing popular repos', async ({ page, cleanup }) => {
    // Skip if community repos feature is enabled
    const response = await page.request.get('/api/content-sources/v1/features/');
    const features = await response.json();
    test.skip(
      features?.communityrepos?.enabled,
      'Community repositories feature is enabled, skipping test',
    );

    // Ensure no popular repos are selected.
    await cleanup.runAndAdd(() => deleteAllPopularRepos(page));

    await navigateToRepositories(page);
    await closePopupsIfExist(page);
    await expect(page).toHaveTitle('Repositories - Content | RHEL');

    await test.step('Select the Popular repos tab', async () => {
      await page.getByRole('link', { name: 'Popular repositories' }).click();
      await expect(page.getByTestId('popular_repos_table')).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Add selected repositories' })).toBeVisible();
    });

    await test.step('Add the 3 popular repos without snapshotting', async () => {
      for (let i = 0; i < repos.length; i++) {
        await page
          .getByRole('row', { name: repos[i] })
          .getByLabel(`Select row ${i}`, { exact: true })
          .click();
      }
      await page.getByTestId('add-selected-dropdown-toggle-no-snap').click();
      await page.getByRole('menuitem', { name: 'Add 3 repositories without snapshotting' }).click();
    });

    await test.step('Check buttons have changed from Add to Delete', async () => {
      for (const repoName of repos) {
        await expect(
          page
            .getByRole('row', { name: repoName })
            .getByTestId('remove_popular_repo')
            .getByText('Delete'),
        ).toBeVisible();
      }
    });

    await test.step('Apply filter and clear it', async () => {
      // Testing filtering and clearing directly, don't use getRowByNameOrURL
      await page.getByRole('textbox', { name: 'Name/URL filter', exact: true }).fill(repoName8);
      const rows = page.locator('table tbody tr');
      await expect(rows).toHaveCount(1);
      await expect(page.getByRole('row').filter({ hasText: repoName9 })).not.toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: repoName8 })).toBeVisible();
      await page.getByRole('button', { name: 'Clear filters' }).click();
      await expect(rows).not.toHaveCount(1);
      await expect(page.getByRole('row').filter({ hasText: repoName9 })).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: repoName8 })).toBeVisible();
    });

    await test.step('Move to Custom repo tab', async () => {
      await page.getByRole('link', { name: 'Your repositories' }).click();
      await expect(page.getByTestId('custom_repositories_table')).toBeVisible();
    });

    await test.step('Check all popular repos have valid status', async () => {
      for (const repoName of repos) {
        const row = await getRowByNameOrUrl(page, repoName);
        await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      }
    });

    await test.step('Use kebab menu to delete all repos', async () => {
      for (const repoName of repos) {
        const row = await getRowByNameOrUrl(page, repoName);
        await row.getByRole('checkbox', { name: 'Select row' }).check();

        await page.getByTestId('delete-kebab').click();
      }
      await page.getByRole('menuitem', { name: 'Delete 3 repositories' }).click();
      // Confirm the removal in the pop-up
      await page
        .getByRole('dialog', { name: 'Delete repositories?' })
        .getByRole('button', { name: 'Delete' })
        .click();
    });
  });

  test('Test shared EPEL repos exist and cannot be edited', async ({ page }) => {
    // Skip if community repos feature is disabled
    const response = await page.request.get('/api/content-sources/v1/features/');
    const features = await response.json();
    test.skip(
      !features?.communityrepos?.enabled,
      'Community repositories feature is disabled, skipping test',
    );

    await navigateToRepositories(page);
    await closePopupsIfExist(page);
    await expect(page).toHaveTitle('Repositories - Content | RHEL');

    await test.step('Custom and EPEL tabs are selected by default', async () => {
      await expect(page.getByRole('link', { name: 'Popular repositories' })).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('button', { name: 'EPEL', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    await test.step('EPEL tab shows only the shared EPEL repository', async () => {
      await page.getByRole('button', { name: 'Custom', exact: true }).click();
      const rowsWithoutEPEL = page.locator('table tbody tr').filter({ hasNotText: 'EPEL' });
      await expect(rowsWithoutEPEL).toHaveCount(0);
      await expect(page.getByRole('row', { name: repoName10 })).toBeVisible();
    });

    await test.step('Shared EPEL repository cannot be edited or deleted', async () => {
      const row = await getRowByNameOrUrl(page, repoName10);
      await row.getByLabel('Kebab toggle').click();
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(
        page
          .getByRole('menuitem', { name: 'View all snapshots' })
          .or(page.getByRole('menuitem', { name: 'No snapshots yet' })),
      ).toBeVisible(); // No snapshot in CI due to time constraints
      await expect(page.getByRole('menuitem', { name: 'Edit' })).not.toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Delete' })).not.toBeVisible();
      await expect(page.getByRole('menuitem')).toHaveCount(1);
    });
  });
});
