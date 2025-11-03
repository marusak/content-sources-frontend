import { test, expect } from 'test-utils';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl } from './helpers/helpers';

const repoName10 = 'EPEL 10 Everything x86_64';

test.describe('Community EPEL repositories', () => {
  test('Verify community EPEL repos exist and cannot be edited', async ({ page }) => {
    await navigateToRepositories(page);
    await closePopupsIfExist(page);
    await expect(page).toHaveTitle('Repositories - Content | RHEL');

    await test.step('Custom and EPEL tabs are selected by default', async () => {
      await expect(page.getByRole('link', { name: 'Popular repositories' })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('button', { name: 'EPEL', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    await test.step('EPEL tab shows only the community EPEL repository', async () => {
      await page.getByRole('button', { name: 'Custom', exact: true }).click();
      const rowsWithoutEPEL = page.locator('table tbody tr').filter({ hasNotText: 'EPEL' });
      await expect(rowsWithoutEPEL).toHaveCount(0);
      await expect(page.getByRole('row', { name: repoName10 })).toBeVisible();
    });

    await test.step('Community EPEL repository cannot be edited or deleted', async () => {
      const row = await getRowByNameOrUrl(page, repoName10);
      await row.getByLabel('Kebab toggle').click();
      await expect(page.getByRole('menu')).toBeVisible();
      await expect(
        page
          .getByRole('menuitem', { name: 'View all snapshots' })
          .or(page.getByRole('menuitem', { name: 'No snapshots yet' })),
      ).toBeVisible(); // No snapshot in CI due to time constraints
      await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeHidden();
      await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeHidden();
      await expect(page.getByRole('menuitem')).toHaveCount(1);
    });
  });
});
