import path from 'path';
import {
  test,
  expect,
  cleanupRepositories,
  cleanupTemplates,
  ensureValidToken,
  randomName,
  waitWhileRepositoryIsPending,
} from 'test-utils';
import {
  BULK_TASK_TIMEOUT_MS,
  LONG_TEST_TIMEOUT_MS,
  MODAL_VISIBILITY_TIMEOUT_MS,
  REPO_VALID_STATUS_TIMEOUT_MS,
  TEMPLATE_VALID_STATUS_TIMEOUT_MS,
  UPLOAD_COMPLETION_TIMEOUT_MS,
  YUM_INSTALL_QUICK_TIMEOUT_MS,
} from '../testConstants';
import { RHSMClient, refreshSubscriptionManager } from './helpers/rhsmClient';
import { runCmd, installAndVerifyPackage } from './helpers/helpers';
import { navigateToRepositories, navigateToTemplates } from '../UI/helpers/navHelpers';
import {
  closeGenericPopupsIfExist,
  retry,
  closeNotificationPopup,
  waitForValidStatus,
} from '../UI/helpers/helpers';
import { setupSystemWithTemplate } from './helpers/templateActions';
import { createApiConfigWithDynamicToken } from './helpers/apiHelpers';

const uploadRepoNamePrefix = 'Upload_Repo';

test.describe('Install Upload Repo Content', () => {
  test('Install Upload Repo Content', async ({ page, client, cleanup }) => {
    // Increase timeout for CI environment because template validation can take up to 11 minutes
    test.setTimeout(LONG_TEST_TIMEOUT_MS);

    const uploadRepoName = `${uploadRepoNamePrefix}_${randomName()}`;
    const templateNamePrefix = 'integration_test_upload_repo';
    const templateName = `${templateNamePrefix}_${randomName()}`;
    const hostname = `RHSMClientTest_${randomName()}`;
    const regClient = new RHSMClient(hostname);

    await test.step('Set up cleanup for repositories, templates, and RHSM client', async () => {
      cleanup.add(() => regClient.Destroy('rhc'));
      await cleanup.runAndAdd(async () => {
        await ensureValidToken(page, 'ADMIN_TOKEN.json', 5);
        const apiBasePath = process.env.BASE_URL + '/api/content-sources/v1';
        const cleanupClient = createApiConfigWithDynamicToken('ADMIN_TOKEN', apiBasePath);
        await cleanupRepositories(cleanupClient, uploadRepoNamePrefix);
        await cleanupTemplates(cleanupClient, templateNamePrefix);
      });
    });

    await closeGenericPopupsIfExist(page);
    await navigateToRepositories(page);

    // Custom+EPEL are selected by default; turn EPEL off so the upload repo is on the list
    // (and visible in traces) instead of buried under community repos.
    const epelToggle = page.getByRole('button', { name: 'EPEL', exact: true });
    if ((await epelToggle.getAttribute('aria-pressed')) === 'true') {
      await epelToggle.click();
      await expect(epelToggle).toHaveAttribute('aria-pressed', 'false');
    }

    await test.step('Create upload repository', async () => {
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByRole('dialog', { name: 'Add custom repositories' })).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(uploadRepoName);
      await page.getByLabel('Upload', { exact: true }).check();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'RHEL 9' }).click();
      const [, bulkCreateResponse] = await Promise.all([
        page.getByRole('button', { name: 'Save and upload content' }).click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
          { timeout: BULK_TASK_TIMEOUT_MS },
        ),
      ]);

      // Upload can fail if repository is not valid HMS-9856
      // Poll API until repository is no longer pending, then verify it's Valid
      const bulkCreateData = await bulkCreateResponse.json();
      const repoUuid = bulkCreateData[0]?.uuid;
      expect(repoUuid).toBeTruthy();
      const repo = await waitWhileRepositoryIsPending(client, repoUuid);
      expect(repo.status).toBe('Valid');

      await expect(page.getByText('Drag and drop files here')).toBeVisible();
      const filePath = path.join(__dirname, '../UI/fixtures/bear-4.1-1.noarch.rpm');
      await retry(page, async (page) => {
        const fileInput = page.locator('input[type=file]').first();
        await fileInput.setInputFiles(filePath);
      });
      await expect(page.getByText('All uploads completed!')).toBeVisible({
        timeout: UPLOAD_COMPLETION_TIMEOUT_MS,
      });
      await page.getByRole('button', { name: 'Confirm changes' }).click();
      await expect(page.getByRole('dialog', { name: 'Upload content' })).toBeHidden({
        timeout: MODAL_VISIBILITY_TIMEOUT_MS,
      });
      await closeNotificationPopup(page, `One rpm successfully uploaded to ${uploadRepoName}`);
      // Snapshot after upload can take several minutes in overnight CI
      const row = await waitForValidStatus(page, uploadRepoName, REPO_VALID_STATUS_TIMEOUT_MS);
      await expect(row.getByTestId('package_count_button')).toHaveText('1');
    });

    await test.step('Navigate to templates, and create a template with the upload repository', async () => {
      await navigateToTemplates(page);
      await expect(page.getByRole('button', { name: 'Create template' })).toBeVisible();
      await page.getByRole('button', { name: 'Create template' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'RHEL 9' }).click();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Additional Red Hat repositories', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Other repositories', exact: true }),
      ).toBeVisible();
      const modalPage = page.getByTestId('add_template_modal');
      const rowUploadRepo = await waitForValidStatus(modalPage, uploadRepoName);
      await rowUploadRepo.getByLabel('Select row').click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByText('Use the latest content', { exact: true }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Enter template details')).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(`${templateName}`);
      await page.getByPlaceholder('Description').fill('Template test for upload repository');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Create other options' }).click();
      await page.getByText('Create template only', { exact: true }).click();
      await waitForValidStatus(page, templateName, TEMPLATE_VALID_STATUS_TIMEOUT_MS);
    });

    await test.step('Register system with template using RHSM client', async () => {
      await setupSystemWithTemplate({
        regClient,
        templateName,
      });

      await refreshSubscriptionManager(regClient);
      await runCmd('Clean cached metadata', ['dnf', 'clean', 'all'], regClient);
    });

    await test.step('Install from the template and verify the upload repository content is installed', async () => {
      await installAndVerifyPackage({
        regClient,
        packageName: 'bear',
      });

      const dnfVerifyRepo = await runCmd(
        'Verify that bear was installed from the upload repo',
        ['sh', '-c', "dnf info bear | grep '^From repo' | cut -d ':' -f2-"],
        regClient,
        YUM_INSTALL_QUICK_TIMEOUT_MS,
      );
      expect(dnfVerifyRepo?.stdout?.toString().trim()).toBe(uploadRepoName);
    });
  });
});
