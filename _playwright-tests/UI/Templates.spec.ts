import { test } from '@playwright/test';
import { navigateToTemplates } from './helpers/navHelpers';
import { closePopupsIfExist } from './helpers/helpers';

test.describe('Templates', () => {
  test('Navigate to templates, make sure the Add content template button can be clicked', async ({
    page,
  }) => {
    await navigateToTemplates(page);
    await closePopupsIfExist(page);

    const AddButton = page.locator('[data-ouia-component-id="crexxate_content_template"]');

    // Wait for the Add button to become enabled (up to 10 seconds)
    await AddButton.first().isEnabled({ timeout: 10000 });
  });
});
