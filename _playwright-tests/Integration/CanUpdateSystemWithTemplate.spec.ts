import { test, expect, cleanupTemplates, randomName } from 'test-utils';
import { RHSMClient, refreshSubscriptionManager } from './helpers/rhsmClient';
import { runCmd } from './helpers/helpers';
import { navigateToTemplates } from '../UI/helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl } from '../UI/helpers/helpers';

const templateNamePrefix = 'integration_test_template';
const templateName = `${templateNamePrefix}-${randomName()}`;
const regClient = new RHSMClient(`RHSMClientTest-${randomName()}`);
let firstVersion;

test.describe('Test System With Template', async () => {
  test.use({
    storageState: '.auth/layered-repo-user.json',
    extraHTTPHeaders: process.env.LAYERED_REPO_TOKEN
      ? { Authorization: process.env.LAYERED_REPO_TOKEN }
      : {},
  });
  test('Verify system updates with template', async ({ page, client, cleanup }) => {
    const HARepo = 'Red Hat Enterprise Linux 9 for x86_64 - High Availability';

    await test.step('Add cleanup, delete any templates and template test repos that exist', async () => {
      await cleanup.runAndAdd(() => cleanupTemplates(client, templateNamePrefix));
      cleanup.add(() => regClient.Destroy('rhc'));
    });
    await test.step('Navigate to templates, ensure the Create template button can be clicked', async () => {
      await navigateToTemplates(page);
      await closePopupsIfExist(page);
      await expect(page.getByRole('button', { name: 'Create template' })).toBeVisible();
    });
    await test.step('Create a template with oldest snapshots', async () => {
      await page.getByRole('button', { name: 'Create template' }).click();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Additional Red Hat repositories', exact: true }),
      ).toBeVisible();
      const modalPage = page.getByTestId('add_template_modal');
      await page.getByRole('searchbox', { name: 'Filter by name' }).fill(HARepo);
      const rowHARepo = await getRowByNameOrUrl(modalPage, HARepo);
      await rowHARepo.getByLabel('Select row').click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Other repositories', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByText('Use up to a specific date', { exact: true }).click();
      await page.getByPlaceholder('YYYY-MM-DD', { exact: true }).fill('2021-05-17'); // Older than any snapshot date
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Enter template details')).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(`${templateName}`);
      await page.getByPlaceholder('Description').fill('Template test');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Create other options' }).click();
      await page.getByText('Create template only', { exact: true }).click();
      const rowTemplate = await getRowByNameOrUrl(page, `${templateName}`);
      await expect(rowTemplate.getByText('Valid')).toBeVisible({ timeout: 660000 });
    });

    await test.step('Create RHSM client and register the template', async () => {
      // Start the rhel9 container
      await regClient.Boot('rhel9');

      // Register, overriding the default key and org
      const reg = await regClient.RegisterRHC(
        process.env.LAYERED_REPO_ACCESS_ACTIVATION_KEY,
        process.env.LAYERED_REPO_ACCESS_ORG_ID,
        templateName,
      );
      if (reg?.exitCode != 0) {
        console.log(reg?.stdout);
        console.log(reg?.stderr);
      }
      expect(reg?.exitCode, 'Expect registering to be successful').toBe(0);

      await refreshSubscriptionManager(regClient);

      await runCmd('Clean cached metadata', ['dnf', 'clean', 'all'], regClient);

      const exist = await runCmd(
        'List available packages',
        ['sh', '-c', 'dnf updateinfo --list --all | grep RH | sort | tail -n 1'],
        regClient,
        10 * 60 * 1000,
      );
      firstVersion = exist?.stdout?.toString();
    });

    await test.step('Update the template date to latest', async () => {
      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await rowTemplate.getByRole('button', { name: templateName }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(templateName);
      await page.getByRole('button', { name: 'Actions' }).click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(
        page.getByRole('heading', { name: 'Define template content', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Additional Red Hat repositories', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Other repositories', exact: true }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByText('Use the latest content', { exact: true }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Enter template details')).toBeVisible();
      await expect(page.getByPlaceholder('Enter name')).toHaveValue(`${templateName}`);
      await expect(page.getByPlaceholder('Description')).toHaveValue('Template test');
      await page.getByPlaceholder('Description').fill('Template test edited');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
    });

    await test.step('Install from the updated template', async () => {
      await refreshSubscriptionManager(regClient);

      await runCmd('Clean cached metadata', ['dnf', 'clean', 'all'], regClient);

      const updateInfo = await runCmd(
        'List available packages',
        ['sh', '-c', 'dnf updateinfo --list --all | grep RH | sort | tail -n 1'],
        regClient,
        10 * 60 * 1000,
      );
      const secondVersion = updateInfo?.stdout?.toString();
      expect(secondVersion, 'Expect that there is a new errata').not.toBe(firstVersion);

      await runCmd(
        'vim-enhanced should not be installed',
        ['rpm', '-q', 'vim-enhanced'],
        regClient,
        60000,
        1,
      );

      await runCmd(
        'Install vim-enhanced',
        ['yum', 'install', '-y', 'vim-enhanced'],
        regClient,
        60000,
      );

      await runCmd('vim-enhanced should be installed', ['rpm', '-q', 'vim-enhanced'], regClient);

      await runCmd(
        'Install booth from the HA layered repo',
        ['yum', 'install', '-y', 'booth'],
        regClient,
        60000,
      );

      await runCmd('booth should be installed', ['rpm', '-q', 'booth'], regClient);

      const dnfVerifyRepo = await runCmd(
        'Verify that booth was installed from the HA repo',
        ['sh', '-c', "dnf info booth | grep '^From repo' | cut -d ':' -f2-"],
        regClient,
      );
      expect(dnfVerifyRepo?.stdout?.toString().trim()).toBe(
        'rhel-9-for-x86_64-highavailability-rpms',
      );
    });
  });
});
