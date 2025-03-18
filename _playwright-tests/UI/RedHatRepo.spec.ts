import { test, expect } from '@playwright/test';
import { navigateToRepositories } from './helpers/navHelpers';
import { closePopupsIfExist } from './helpers/helpers';

test.describe('Red Hat Repositories', () => {
  const smallRHRepo = 'Red Hat CodeReady Linux Builder for RHEL 9 ARM 64 (RPMs)';

  test.beforeEach(async ({ page }) => {
    await test.step('Navigate to repositories page', async () => {
      await navigateToRepositories(page);
      await closePopupsIfExist(page);
    });

    await test.step('Navigate to Red Hat repositories', async () => {
      await page.getByRole('button', { name: 'Red Hat' }).click();
    });
  });

  test('Wait for repository status to be "Valid"', async ({ page }, testinfo) => {
    testinfo.setTimeout(600000);
    const status = page
      .getByRole('row')
      .filter({ hasText: smallRHRepo })
      .getByRole('gridcell')
      .filter({ hasText: 'Valid' });

    await test.step('Filter repos by name', async () => {
      await page.getByPlaceholder('Filter by name/url').fill(smallRHRepo);
    });

    await test.step('Wait for a valid status', async () => {
      await status.waitFor({ state: 'visible', timeout: 600_000 });
    });
  });

  test('Check repository snapshots', async ({ page }) => {
    await test.step('Open the snapshots list modal', async () => {
      await page
        .getByRole('row')
        .filter({ hasText: smallRHRepo })
        .getByLabel('Kebab toggle')
        .click();
      await expect(page.getByRole('menuitem', { name: 'View all snapshots' })).toBeVisible();
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
