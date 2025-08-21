import { expect, test as setup } from '@playwright/test';
import {
  ensureNotInPreview,
  storeStorageStateAndToken,
  throwIfMissingEnvVariables,
  logout,
  logInWithReadOnlyUser,
  logInWithAdminUser,
  logInWithRHELOperatorUser,
  logInWithLayeredRepoUser,
  logInWithRHELOnlyUser,
  logInWithNoSubsUser,
  logInWithStableSamStageUser,
} from './helpers/loginHelpers';

import { existsSync, mkdirSync } from 'fs';
import path from 'path';
const authDir = '.auth';
if (!existsSync(authDir)) {
  mkdirSync(authDir);
}

setup.describe('Setup Authentication States', async () => {
  setup.describe.configure({ retries: 3 });

  setup('Ensure needed ENV variables exist', async () => {
    expect(() => throwIfMissingEnvVariables()).not.toThrow();
  });

  setup('Authenticate rhel-operator user and save state', async ({ page }) => {
    setup.skip(!process.env.RBAC, `Skipping as the RBAC environment variable isn't set to true.`);
    setup.setTimeout(60_000);

    // Login rhel-operator user
    await logInWithRHELOperatorUser(page);

    // Save state for rhel-operator user
    const { cookies } = await page
      .context()
      .storageState({ path: path.join(__dirname, '../../.auth', 'rhel_operator.json') });
    const rhelOperatorToken = cookies.find((cookie) => cookie.name === 'cs_jwt')?.value;

    process.env.RHEL_OPERATOR_TOKEN = `Bearer ${rhelOperatorToken}`;

    await storeStorageStateAndToken(page, 'rhel_operator.json');
    await logout(page);
  });

  setup('Authenticate read-only user and save state', async ({ page }) => {
    setup.skip(!process.env.RBAC, `Skipping as the RBAC environment variable isn't set to true.`);
    setup.setTimeout(60_000);

    // Login read-only user
    await logInWithReadOnlyUser(page);

    // Save state for read-only user
    const { cookies } = await page
      .context()
      .storageState({ path: path.join(__dirname, '../../.auth', 'read-only.json') });
    const readOnlyToken = cookies.find((cookie) => cookie.name === 'cs_jwt')?.value;

    process.env.READONLY_TOKEN = `Bearer ${readOnlyToken}`;

    await storeStorageStateAndToken(page, 'read-only.json');
    await logout(page);
  });

  setup('Authenticate user with additional subscriptions and save state', async ({ page }) => {
    setup.skip(
      !process.env.INTEGRATION,
      `Skipping as the INTEGRATION environment variable isn't set to true.`,
    );
    setup.setTimeout(60_000);

    // Login layered repo user
    await logInWithLayeredRepoUser(page);

    // Save state for layered repo user
    const { cookies } = await page
      .context()
      .storageState({ path: path.join(__dirname, '../../.auth', 'layered-repo-user.json') });
    const layeredRepoToken = cookies.find((cookie) => cookie.name === 'cs_jwt')?.value;

    process.env.LAYERED_REPO_TOKEN = `Bearer ${layeredRepoToken}`;

    await storeStorageStateAndToken(page, 'layered-repo-user.json');
    await logout(page);
  });

  setup('Authenticate user with only RHEL subscription and save state', async ({ page }) => {
    setup.skip(
      !process.env.INTEGRATION,
      `Skipping as the INTEGRATION environment variable isn't set to true.`,
    );
    setup.setTimeout(60_000);

    // Login RHEL-only user
    await logInWithRHELOnlyUser(page);

    // Save state for RHEL-only user
    const { cookies } = await page
      .context()
      .storageState({ path: path.join(__dirname, '../../.auth', 'rhel-only-user.json') });
    const rhelOnlyToken = cookies.find((cookie) => cookie.name === 'cs_jwt')?.value;

    process.env.RHEL_ONLY_TOKEN = `Bearer ${rhelOnlyToken}`;

    await storeStorageStateAndToken(page, 'rhel-only-user.json');
    await logout(page);
  });

  setup('Authenticate no-subs user and save state', async ({ page }) => {
    setup.skip(
      !process.env.RBAC || !process.env.INTEGRATION,
      `Skipping as the RBAC and INTEGRATION environment variables aren't both set to true.`,
    );
    setup.setTimeout(60_000);

    // Login no-subs user
    await logInWithNoSubsUser(page);

    // Save state for no-subs user
    const { cookies } = await page
      .context()
      .storageState({ path: path.join(__dirname, '../../.auth', 'no_subs_user.json') });
    const noSubsToken = cookies.find((cookie) => cookie.name === 'cs_jwt')?.value;

    process.env.NO_SUBS_TOKEN = `Bearer ${noSubsToken}`;

    await storeStorageStateAndToken(page, 'no_subs_user.json');
    await logout(page);
  });

  setup('Authenticate stable_sam_stage user and save state', async ({ page }) => {
    setup.skip(
      !process.env.INTEGRATION ||
        !process.env.STABLE_SAM_STAGE_USERNAME ||
        !process.env.STABLE_SAM_STAGE_PASSWORD,
      'Skipping as INTEGRATION is not set or stable_sam_stage credentials are not configured.',
    );
    setup.setTimeout(60_000);

    // Login stable_sam_stage user
    await logInWithStableSamStageUser(page);

    // Save state for stable_sam_stage user
    const { cookies } = await page
      .context()
      .storageState({ path: path.join(__dirname, '../../.auth', 'stable_sam_stage.json') });
    const stableSamStageToken = cookies.find((cookie) => cookie.name === 'cs_jwt')?.value;

    process.env.STABLE_SAM_STAGE_TOKEN = `Bearer ${stableSamStageToken}`;

    await storeStorageStateAndToken(page, 'stable_sam_stage.json');
    await logout(page);
  });

  setup('Authenticate Default User and Save State', async ({ page }) => {
    setup.setTimeout(60_000);

    // Login default admin user
    await logInWithAdminUser(page);
    await ensureNotInPreview(page);

    // Save state for default admin user
    // This also sets process.env.TOKEN, which is picked up by main config.
    await storeStorageStateAndToken(page, 'admin_user.json');
  });
});
