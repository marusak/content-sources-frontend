import { test, expect } from 'test-utils';
import { navigateToRepositories } from '../UI/helpers/navHelpers';
import { clearFilters, closePopupsIfExist, getRowByNameOrUrl } from '../UI/helpers/helpers';

const repos = [
  'https://cdn.redhat.com/content/dist/layered/rhel9/x86_64/rhocp-ironic/4.16/os/',
  'https://cdn.redhat.com/content/dist/layered/rhel8/x86_64/rhocp/4.16/os/',
  'https://cdn.redhat.com/content/dist/layered/rhel9/x86_64/rhocp/4.16/os/',
  'https://cdn.redhat.com/content/dist/rhel10/10/x86_64/highavailability/os/',
  'https://cdn.redhat.com/content/dist/rhel8/8/x86_64/highavailability/os/',
  'https://cdn.redhat.com/content/dist/rhel9/9/x86_64/highavailability/os/',
];

test.describe('Test layered repos access is restricted', async () => {
  test.use({
    storageState: '.auth/rhel-only-user.json',
    extraHTTPHeaders: process.env.RHEL_ONLY_TOKEN
      ? { Authorization: process.env.RHEL_ONLY_TOKEN }
      : {},
  });

  test('Test user with only a RHEL subscription cannot access layered repos', async ({ page }) => {
    await test.step('Show only the Red Hat repos', async () => {
      await navigateToRepositories(page);
      await closePopupsIfExist(page);
      await page.getByRole('button', { name: 'Custom', exact: true }).click();
      await page.getByRole('button', { name: 'Red Hat', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await expect(page.getByRole('button', { name: 'Red Hat', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByTestId('custom_repositories_table')).toBeVisible();
    });

    await test.step('Verify layered repos do not appear in the UI', async () => {
      let rows = page.getByLabel('Custom repositories table').locator('tbody tr');
      let initialRowCount = await rows.count();
      expect(initialRowCount).toBeGreaterThan(0);
      await page.getByPlaceholder(/^Filter by name.*$/).fill('openshift');
      await expect(page.getByText(/No.*repositories match the filter criteria/)).toBeVisible({
        timeout: 10000,
      });
      await clearFilters(page);

      rows = page.getByLabel('Custom repositories table').locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
      initialRowCount = await rows.count();
      expect(initialRowCount).toBeGreaterThan(0);
      await page.getByPlaceholder(/^Filter by name.*$/).fill('high availability');
      await expect(page.getByText(/No.*repositories match the filter criteria/)).toBeVisible({
        timeout: 10000,
      });
      await clearFilters(page);
    });
  });
});

test.describe('Test layered repos access is granted', async () => {
  test.use({
    storageState: '.auth/layered-repo-user.json',
    extraHTTPHeaders: process.env.LAYERED_REPO_TOKEN
      ? { Authorization: process.env.LAYERED_REPO_TOKEN }
      : {},
  });

  test('Test user with necessary subscriptions can access layered repos', async ({ page }) => {
    await test.step('Show only the Red Hat repos', async () => {
      await navigateToRepositories(page);
      await closePopupsIfExist(page);
      await page.getByRole('button', { name: 'Custom', exact: true }).click();
      await page.getByRole('button', { name: 'Red Hat', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await expect(page.getByRole('button', { name: 'Red Hat', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByTestId('custom_repositories_table')).toBeVisible();
    });

    await test.step('Verify layered repos appear and are valid', async () => {
      let rows = page.getByLabel('Custom repositories table').locator('tbody tr');
      await expect(rows.nth(repos.length)).toBeVisible({ timeout: 10000 });
      let initialRowCount = await rows.count();
      expect(initialRowCount).toBeGreaterThan(repos.length);
      await page.getByPlaceholder(/^Filter by name.*$/).fill('openshift');
      await expect(rows).toHaveCount(3, { timeout: 10000 });
      await clearFilters(page);

      rows = page.getByLabel('Custom repositories table').locator('tbody tr');
      await expect(rows.nth(repos.length)).toBeVisible({ timeout: 10000 });
      initialRowCount = await rows.count();
      expect(initialRowCount).toBeGreaterThan(repos.length);
      await page.getByPlaceholder(/^Filter by name.*$/).fill('high availability');
      await expect(rows).toHaveCount(3, { timeout: 10000 });
      await clearFilters(page);

      for (const repoUrl of repos) {
        const row = await getRowByNameOrUrl(page, repoUrl);
        await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      }
    });
  });
});
