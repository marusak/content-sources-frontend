import { type Page } from '@playwright/test';
import { retry } from './helpers';

const navigateToRepositoriesFunc = async (page: Page) => {
  await page.goto('/insights/content/repositories', { timeout: 5000 });

  const zeroState = page.getByText('Start using Content management now');

  const repositoriesListPage = page.getByText('View all repositories within your organization.');

  // Wait for either list page or zerostate
  try {
    await Promise.race([
      repositoriesListPage.waitFor({ state: 'visible', timeout: 20000 }),
      zeroState.waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  } catch (error) {
    throw new Error(
      `Neither repositories list nor zero state appeared: ${(error as Error)?.message}`,
    );
  }

  if (await zeroState.isVisible()) {
    await page.getByRole('button', { name: 'Add repositories now' }).click();
  }
};

export const navigateToRepositories = async (page: Page) => {
  await retry(page, navigateToRepositoriesFunc);
};

const navigateToTemplatesFunc = async (page: Page) => {
  await page.goto('/insights/content/templates');

  const templateText = page.getByText('View all content templates within your organization.');

  // Wait for either list page or zerostate
  await templateText.waitFor({ state: 'visible' });
};

export const navigateToTemplates = async (page: Page) => {
  await retry(page, navigateToTemplatesFunc);
};
