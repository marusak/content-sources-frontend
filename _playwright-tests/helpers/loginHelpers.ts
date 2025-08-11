import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

// This file can only contain functions that are referenced by authentication.

export const logout = async (page: Page) => {
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('img', { name: 'User Avatar' }) })
    .click();

  await expect(async () => page.getByRole('menuitem', { name: 'Log out' }).isVisible()).toPass();

  await page.getByRole('menuitem', { name: 'Log out' }).click();

  await expect(async () => {
    expect(page.url()).not.toBe('/insights/content/repositories');
  }).toPass();
  await expect(async () =>
    expect(page.getByText('Log in to your Red Hat account')).toBeVisible(),
  ).toPass();
};

export const logInWithUsernameAndPassword = async (
  page: Page,
  username?: string,
  password?: string,
) => {
  if (!username || !password) {
    throw new Error('Username or password not found');
  }

  await page.goto('/insights/content/repositories');

  await expect(async () =>
    expect(page.getByText('Log in to your Red Hat account')).toBeVisible(),
  ).toPass();

  const login = page.getByRole('textbox');
  await login.fill(username);
  await login.press('Enter');
  const passwordField = page.getByRole('textbox', { name: 'Password' });
  await passwordField.fill(password);
  await passwordField.press('Enter');

  await expect(async () => {
    expect(page.url()).toContain(`${process.env.BASE_URL}/insights/content/repositories`);

    const cookies = await page.context().cookies();
    const found = cookies.find((cookie) => cookie.name === 'cs_jwt');
    expect(found).not.toBe(undefined);
  }).toPass({
    intervals: [1_000],
    timeout: 30_000,
  });
};

export const logInWithAdminUser = async (page: Page) =>
  await logInWithUsernameAndPassword(page, process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);

export const storeStorageStateAndToken = async (page: Page, fileName: string) => {
  const { cookies } = await page
    .context()
    .storageState({ path: path.join(__dirname, '../../.auth', fileName) });
  process.env.TOKEN = `Bearer ${cookies.find((cookie) => cookie.name === 'cs_jwt')?.value}`;
  await page.waitForTimeout(100);
};

export const logInWithRHELOperatorUser = async (page: Page) =>
  await logInWithUsernameAndPassword(
    page,
    process.env.RHEL_OPERATOR_USERNAME,
    process.env.RHEL_OPERATOR_PASSWORD,
  );

export const logInWithReadOnlyUser = async (page: Page) =>
  await logInWithUsernameAndPassword(
    page,
    process.env.READONLY_USERNAME,
    process.env.READONLY_PASSWORD,
  );

export const logInWithLayeredRepoUser = async (page: Page) =>
  await logInWithUsernameAndPassword(
    page,
    process.env.LAYERED_REPO_ACCESS_USERNAME,
    process.env.LAYERED_REPO_ACCESS_PASSWORD,
  );

export const logInWithRHELOnlyUser = async (page: Page) =>
  await logInWithUsernameAndPassword(
    page,
    process.env.RHEL_ONLY_ACCESS_USERNAME,
    process.env.RHEL_ONLY_ACCESS_PASSWORD,
  );

export const logInWithNoSubsUser = async (page: Page) =>
  await logInWithUsernameAndPassword(
    page,
    process.env.NO_SUBS_USER_USERNAME,
    process.env.NO_SUBS_USER_PASSWORD,
  );

export const getUserAuthToken = (name: string) => {
  const userPath = path.join(__dirname, `../../.auth/${name}.json`);
  const fileContent = readFileSync(userPath, { encoding: 'utf8' });

  const regex = /"name":\s*"cs_jwt",\s*"value":\s*"(.*?)"/;

  const match = fileContent.match(regex);
  if (match && match[1]) {
    return `Bearer ${match[1]}`;
  }

  return '';
};

export const throwIfMissingEnvVariables = () => {
  const MandatoryEnvVariables = [
    'BASE_URL',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    ...(process.env.RBAC
      ? [
          'READONLY_USERNAME',
          'READONLY_PASSWORD',
          'RHEL_OPERATOR_USERNAME',
          'RHEL_OPERATOR_PASSWORD',
          'NO_SUBS_USER_USERNAME',
          'NO_SUBS_USER_PASSWORD',
        ]
      : []),
    ...(process.env.INTEGRATION
      ? [
          'PROXY',
          'ORG_ID_1',
          'ACTIVATION_KEY_1',
          'LAYERED_REPO_ACCESS_USERNAME',
          'LAYERED_REPO_ACCESS_PASSWORD',
          'RHEL_ONLY_ACCESS_USERNAME',
          'RHEL_ONLY_ACCESS_PASSWORD',
          'LAYERED_REPO_ACCESS_ORG_ID',
          'LAYERED_REPO_ACCESS_ACTIVATION_KEY',
        ]
      : []),
  ];

  const missing: string[] = [];
  MandatoryEnvVariables.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  });

  if (missing.length > 0) {
    throw new Error('Missing env variables:' + missing.join(','));
  }
};

export const ensureNotInPreview = async (page: Page) => {
  const toggle = page.locator('div').filter({ hasText: 'Preview mode' }).getByRole('switch');
  if ((await toggle.isVisible()) && (await toggle.isChecked())) {
    await toggle.click();
  }
};

export const ensureInPreview = async (page: Page) => {
  const toggle = page.locator('div').filter({ hasText: 'Preview mode' }).getByRole('switch');
  await expect(toggle).toBeVisible();
  if (!(await toggle.isChecked())) {
    await toggle.click();
  }
  const turnOnButton = page.getByRole('button', { name: 'Turn on' });
  if (await turnOnButton.isVisible()) {
    await turnOnButton.click();
  }
  await expect(toggle).toBeChecked();
};
