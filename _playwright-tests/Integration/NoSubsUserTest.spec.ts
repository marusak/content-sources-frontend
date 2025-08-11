import { test, expect } from '@playwright/test';
import { navigateToTemplates } from '../UI/helpers/navHelpers';
import { closePopupsIfExist } from '../UI/helpers/helpers';

test.describe('Template use requires a RHEL subscription', () => {
  test.skip(
    !process.env.INTEGRATION || !process.env.RBAC,
    `Skipping as the INTEGRATION and RBAC environment variables aren't both set to true.`,
  );
  test.use({
    storageState: '.auth/no_subs_user.json',
    extraHTTPHeaders: process.env.NO_SUBS_TOKEN ? { Authorization: process.env.NO_SUBS_TOKEN } : {},
  });

  test('Navigate to Templates, ensure the "Create template" button is disabled for no-subs user', async ({
    page,
  }) => {
    await navigateToTemplates(page);
    await closePopupsIfExist(page);

    const AddButton = page.getByRole('button', { name: 'Create template', exact: true });
    await expect(AddButton).toBeVisible();
    await expect(AddButton).not.toBeEnabled({ timeout: 1000 });
    await AddButton.hover({ force: true });
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveText(
      'You do not have the required subscription (RHEL) to perform this action.',
    );
  });
});
