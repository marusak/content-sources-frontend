import { type Page, type Locator } from '@playwright/test';
import { test } from 'test-utils';
import { retry } from './helpers';

const navigateToRepositoriesFunc = async (page: Page) => {
  await page.goto('/insights/content/repositories', { timeout: 200000 });

  const zeroState = page.getByText('Start using Content management now');

  const repositoriesListPage = page.getByText('View all repositories within your organization.');

  // Wait for either list page or zerostate
  try {
    await Promise.race([
      repositoriesListPage.waitFor({ state: 'visible', timeout: 30000 }),
      zeroState.waitFor({ state: 'visible', timeout: 30000 }),
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
  await test.step(
    `Navigating to repositories`,
    async () => {
      try {
        await page.route('https://consent.trustarc.com/**', (route) => route.abort());
        await page.route('https://smetrics.redhat.com/**', (route) => route.abort());

        const repositoriesNavLink = page
          .getByRole('navigation', { name: 'Breadcrumb' })
          .getByRole('link', { name: 'Repositories' });
        await repositoriesNavLink.waitFor({ state: 'visible', timeout: 1500 });
        await repositoriesNavLink.click();
      } catch {
        await retry(page, navigateToRepositoriesFunc, 5);
      }
    },
    {
      box: true,
    },
  );
};

const navigateToTemplatesFunc = async (page: Page) => {
  await page.goto('/insights/content/templates', { timeout: 10000 });

  const templateText = page.getByText('View all content templates within your organization.');

  // Wait for either list page or zerostate
  await templateText.waitFor({ state: 'visible', timeout: 30000 });
};

export const navigateToTemplates = async (page: Page) => {
  await test.step(
    `Navigating to templates`,
    async () => {
      try {
        await page.route('https://consent.trustarc.com/**', (route) => route.abort());
        await page.route('https://smetrics.redhat.com/**', (route) => route.abort());

        const templatesNavLink = page
          .getByRole('navigation')
          .getByRole('link', { name: 'Templates' });
        await templatesNavLink.waitFor({ state: 'visible', timeout: 1500 });
        await templatesNavLink.click();
      } catch {
        await retry(page, navigateToTemplatesFunc, 5);
      }
    },
    {
      box: true,
    },
  );
};

export const navigateToSnapshotsOfRepository = async (page: Page, row: Locator) => {
  await test.step(`Navigating to snapshots of repository`, async () => {
    await row.getByRole('button', { name: 'Kebab toggle' }).click();
    await page.getByRole('menuitem', { name: 'View all snapshots' }).click();
  });
};
