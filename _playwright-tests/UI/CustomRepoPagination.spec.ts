import { test, expect } from 'test-utils';
import { cleanupRepositories } from 'test-utils/helpers';

import { closePopupsIfExist } from './helpers/helpers';
import { navigateToRepositories } from './helpers/navHelpers';
import { bulkCreateRepos } from './helpers/createRepositories';

const repoNamePrefix = 'custom_repo-pagination';

test.describe('Custom repositories pagination', () => {
  test('Verify pagination on custom repo page', async ({ page, client, cleanup }) => {
    await test.step('Populate the custom repo table', async () => {
      await cleanup.runAndAdd(() => cleanupRepositories(client, repoNamePrefix));
      await bulkCreateRepos(page, 12, repoNamePrefix);
      await navigateToRepositories(page);
      await closePopupsIfExist(page);
      await page.getByPlaceholder(/^Filter by name.*$/).fill(repoNamePrefix);
    });

    await test.step('Set pagination to 10 using top paginator', async () => {
      await expect(page.locator('button#topPaginationWidgetId-top-toggle')).toHaveText(
        '1 - 12 of 12',
      );
      await page.click('button#topPaginationWidgetId-top-toggle');
      await page.getByRole('menuitem', { name: '10 per page' }).click();
    });

    await test.step('Assert there are only ten repos displayed', async () => {
      await expect(page.locator('button#topPaginationWidgetId-top-toggle')).toHaveText(
        '1 - 10 of 12',
      );
      await expect(page.getByText(`${repoNamePrefix}-10`)).toBeVisible();
      await expect(page.getByText(`${repoNamePrefix}-11`)).toBeHidden();
      const targetRows = page.getByRole('row').filter({ has: page.getByText(repoNamePrefix) });
      await expect(targetRows).toHaveCount(10);
    });

    await test.step('Move to second page and assert only two repos are displayed', async () => {
      await page.getByLabel('Go to next page').first().click();
      await expect(page.locator('button#topPaginationWidgetId-top-toggle')).toHaveText(
        '11 - 12 of 12',
      );
      await expect(page.getByText(`${repoNamePrefix}-11`)).toBeVisible();
      await expect(page.getByText(`${repoNamePrefix}-12`)).toBeVisible();
      await expect(page.getByText(`${repoNamePrefix}-10`)).toBeHidden();
      const targetRows = page.getByRole('row').filter({ has: page.getByText(repoNamePrefix) });
      await expect(targetRows).toHaveCount(2);
    });

    await test.step('Move back to first page and assert only two repos are displayed', async () => {
      await page.getByLabel('Go to previous page').first().click();
      await expect(page.locator('button#topPaginationWidgetId-top-toggle')).toHaveText(
        '1 - 10 of 12',
      );
      await expect(page.getByText(`${repoNamePrefix}-10`)).toBeVisible();
      await expect(page.getByText(`${repoNamePrefix}-11`)).toBeHidden();
      const targetRows = page.getByRole('row').filter({ has: page.getByText(repoNamePrefix) });
      await expect(targetRows).toHaveCount(10);
    });
  });
});
