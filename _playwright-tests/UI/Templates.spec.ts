import { test, expect } from 'test-utils';
import { navigateToTemplates } from './helpers/navHelpers';
import { closePopupsIfExist } from './helpers/helpers';

test.describe('Templates', () => {
  test('Navigate to templates, make sure the Create template button can be clicked', async ({
    page,
  }) => {
    await navigateToTemplates(page);
    await closePopupsIfExist(page);

    const AddButton = page.locator('[data-ouia-component-id="create_content_template"]');

    // Wait for the Add button to become enabled (up to 10 seconds)
    await AddButton.first().isEnabled({ timeout: 10000 });
  });

  test('Validate documentation link in empty state', async ({ page }) => {
    await test.step('Mock template list API to get to empty state', async () => {
      await page.route('**/api/content-sources/*/templates/**', async (route) => {
        const response = await route.fetch();
        const json = {
          data: [],
          links: {
            first: '/api/content-sources/v1.0/templates/?limit=20&offset=0',
            last: '/api/content-sources/v1.0/templates/?limit=20&offset=0',
          },
          meta: { count: 0, limit: 20, offset: 0 },
        };
        await route.fulfill({ response, json });
      });
    });

    await test.step('Navigate to the templates page', async () => {
      await navigateToTemplates(page);
      await closePopupsIfExist(page);
    });

    await test.step(`Click the 'Learn more about templates' link and verify the destination`, async () => {
      await page.getByRole('button', { name: 'Learn more about templates' }).click();
      expect(
        page.url().startsWith('https://docs.redhat.com/en/documentation/red_hat_lightspeed/'),
      ).toBeTruthy();
      expect(page.url().includes('content-template')).toBeTruthy();
      await expect(page.getByText(/^.*Using content templates.*$/).first()).toBeVisible();
      await expect(
        page.getByText('A content template is a set of repository snapshots').first(),
      ).toBeVisible();
    });
  });
});
