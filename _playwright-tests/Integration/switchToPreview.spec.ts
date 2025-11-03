import { test, expect } from '@playwright/test';
import { navigateToRepositories } from '../UI/helpers/navHelpers';
import { ensureInPreview } from '../helpers/loginHelpers';

test.describe('Switch to preview', { tag: '@switch-to-preview' }, () => {
  test('Click preview button', async ({ page }) => {
    await navigateToRepositories(page);
    await ensureInPreview(page);
    const toggle = page.locator('div').filter({ hasText: 'Preview mode' }).getByRole('switch');
    await expect(toggle).toBeChecked();
  });
});
