import { test, expect, cleanupTemplates, randomName } from 'test-utils';
import { refreshSubscriptionManager, RHSMClient } from './helpers/rhsmClient';
import { runCmd } from './helpers/helpers';
import { navigateToTemplates } from '../UI/helpers/navHelpers';
import { closeGenericPopupsIfExist, getRowByNameOrUrl } from '../UI/helpers/helpers';
import { isInInventory } from './helpers/systemHelpers';

test.describe('Assign Template to System via UI', () => {
  const templateNamePrefix = 'Template_test_for_system_assignment';

  test('Create template and assign it to a system using the "Via system list" method', async ({
    page,
    client,
    cleanup,
  }) => {
    const templateName = `${templateNamePrefix}-${randomName()}`;
    const containerName = `RHSMClientTest-${randomName()}`;
    const regClient = new RHSMClient(containerName);
    let hostname = '';

    await test.step('Boot and register RHSM client', async () => {
      await regClient.Boot('rhel9');
      hostname = await regClient.GetHostname();
      console.log('Container hostname:', hostname);

      const reg = await regClient.RegisterRHC(process.env.ACTIVATION_KEY_1, process.env.ORG_ID_1);
      if (reg?.exitCode != 0) {
        console.log('Registration stdout:', reg?.stdout);
        console.log('Registration stderr:', reg?.stderr);
      }

      await expect
        .poll(async () => await isInInventory(page, hostname, true), {
          message: 'System did not appear in inventory in time',
          timeout: 600_000,
          intervals: [10_000],
        })
        .toBe(true);

      const ff = await runCmd('ff', ['sh', '-c', 'subscription-manager identity'], regClient);
      console.log(ff);

      const packageUrl = await runCmd(
        'Get download URL for vim-enhanced from base CDN',
        ['dnf', 'repoquery', '--location', 'vim-enhanced'],
        regClient,
        120000,
      );
      console.log('Package download URL from base CDN:', packageUrl?.stdout);
      expect(
        packageUrl?.stdout,
        'Package download URL should be from base CDN, not template',
      ).not.toContain('/templates/');
    });

    await test.step('Create template', async () => {
      await cleanup.runAndAdd(() => cleanupTemplates(client, templateName));
      cleanup.add(() => regClient.Destroy('rhc'));

      await closeGenericPopupsIfExist(page);
      await navigateToTemplates(page);

      const nextButton = page.getByRole('button', { name: 'Next', exact: true });

      page.getByRole('button', { name: 'Create template' }).click();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
      await nextButton.click();

      await expect(
        page.getByRole('heading', { name: 'Additional Red Hat repositories', exact: true }),
      ).toBeVisible();
      await nextButton.click();

      await expect(
        page.getByRole('heading', { name: 'Other repositories', exact: true }),
      ).toBeVisible();
      await nextButton.click();

      await page.getByRole('radio', { name: 'Use the latest content' }).check();
      await nextButton.click();

      await expect(page.getByText('Enter template details')).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(templateName);
      await page.getByPlaceholder('Description').fill('Test template for system assignment');
      await nextButton.click();

      await page.getByRole('button', { name: 'Create template and add to systems' }).click();
    });

    await test.step('Assign template to systems', async () => {
      const modalPage = page.getByRole('dialog', { name: 'Assign template to systems' });
      await expect(modalPage).toBeVisible({ timeout: 30000 });

      await expect(modalPage.getByRole('button', { name: 'Save', exact: true })).toBeDisabled({
        timeout: 30000,
      });

      const rowSystem = await getRowByNameOrUrl(modalPage, hostname);
      await rowSystem.getByRole('checkbox').check();

      await modalPage.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(modalPage).toBeHidden({ timeout: 30000 });

      const systemRow = await getRowByNameOrUrl(page, hostname);
      await expect(systemRow).toBeVisible({ timeout: 30000 });
    });

    await test.step('Verify the host can install packages from the template', async () => {
      await refreshSubscriptionManager(regClient);
      await runCmd('Clean cached metadata', ['dnf', 'clean', 'all'], regClient);

      await runCmd(
        'vim-enhanced should not be installed',
        ['rpm', '-q', 'vim-enhanced'],
        regClient,
        120000,
        1,
      );

      const packageUrl = await runCmd(
        'Get download URL for vim-enhanced from template',
        ['dnf', 'repoquery', '--location', 'vim-enhanced'],
        regClient,
        120000,
      );
      console.log('Package download URL from template:', packageUrl?.stdout);
      expect(
        packageUrl?.stdout,
        'Package download URL should be from template, not base CDN',
      ).toContain('/templates/');

      await runCmd(
        'Install vim-enhanced',
        ['yum', 'install', '-y', 'vim-enhanced'],
        regClient,
        120000,
      );

      await runCmd('vim-enhanced should be installed', ['rpm', '-q', 'vim-enhanced'], regClient);
    });
  });
});
