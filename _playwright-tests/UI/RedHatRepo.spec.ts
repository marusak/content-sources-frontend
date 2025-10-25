import { test, expect } from 'test-utils';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl } from './helpers/helpers';

test.describe('Red Hat Repositories', () => {
  const smallRHRepo = 'Red Hat CodeReady Linux Builder for RHEL 9 ARM 64 (RPMs)';

  test.beforeEach(async ({ page }) => {
    await test.step('Navigate to repositories page', async () => {
      await navigateToRepositories(page);
      await closePopupsIfExist(page);
    });

    await test.step('Navigate to Red Hat repositories', async () => {
      await page.getByRole('button', { name: 'Red Hat', exact: true }).click();
    });
  });

  test('Verify snapshotting of Red Hat repositories', async ({ page }) => {
    await test.step('Wait for status to be "Valid"', async () => {
      const row = await getRowByNameOrUrl(page, smallRHRepo);
      await expect(row.getByText('Valid', { exact: true })).toBeVisible({ timeout: 210_000 });
    });

    await test.step('Check repository snapshots', async () => {
      await page
        .getByRole('row')
        .filter({ hasText: smallRHRepo })
        .getByLabel('Kebab toggle')
        .click();
      await page.getByRole('menuitem', { name: 'View all snapshots' }).click();
      await expect(
        page.getByTestId('snapshot_list_modal').filter({ hasText: smallRHRepo }),
      ).toBeVisible();
    });

    await test.step('Close the snapshots list modal', async () => {
      // Using testId here because the modal has 2 close buttons
      await page.getByTestId('snapshot_list_modal-ModalBoxCloseButton').click();
    });
  });
});
