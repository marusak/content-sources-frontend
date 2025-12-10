import {
  test,
  expect,
  cleanupTemplates,
  randomName,
} from '../test-utils/_playwright-tests/test-utils/src';
import { RHSMClient, refreshSubscriptionManager, waitForRhcdActive } from './helpers/rhsmClient';
import { navigateToTemplates } from '../UI/helpers/navHelpers';
import { closeGenericPopupsIfExist, getRowByNameOrUrl } from '../UI/helpers/helpers';
import { pollForSystemTemplateAttachment, isInInventory } from './helpers/systemHelpers';
import { performance } from 'perf_hooks';

const templateNamePrefix = 'associated_template_test';
const templateName = `${templateNamePrefix}-${randomName()}`;
const regClient = new RHSMClient(`AssociatedTemplateCRUDTest-${randomName()}`);

test.describe('Associated Template CRUD', () => {
  test('Warn against template deletion when associated to a system and not warn after unregistration', async ({
    page,
    client,
    cleanup,
  }) => {
    // Increase timeout for CI environment because template validation can take up to 11 minutes
    test.setTimeout(900000); // 15 minutes

    let hostname: string;
    await test.step('Set up cleanup for templates and RHSM client', async () => {
      await cleanup.runAndAdd(() => cleanupTemplates(client, templateNamePrefix));
      cleanup.add(() => regClient.Destroy('rhc'));
    });

    await test.step('Navigate to templates and create a new template', async () => {
      await navigateToTemplates(page);
      await closeGenericPopupsIfExist(page);
      await expect(page.getByRole('button', { name: 'Create template' })).toBeVisible();
      await page.getByRole('button', { name: 'Create template' }).click();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await expect(
        page.getByRole('heading', { name: 'Additional Red Hat repositories', exact: true }),
        'should be on the RHEL repo tab',
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await expect(
        page.getByRole('heading', { name: 'Other repositories', exact: true }),
        'should be on the Other repositories tab',
      ).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await page.getByText('Use the latest content', { exact: true }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await expect(
        page.getByText('Enter template details'),
        'should be on the Enter template details tab',
      ).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(`${templateName}`);
      await page.getByPlaceholder('Description').fill('Template test for associated system CRUD');
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await page.getByRole('button', { name: 'Create other options' }).click();
      await page.getByText('Create template only', { exact: true }).click();
      const rowTemplate = await getRowByNameOrUrl(page, `${templateName}`);
      await expect(rowTemplate.getByText('Valid'), 'repo should show Valid status').toBeVisible({
        timeout: 660000,
      });
    });

    await test.step('Register system with template using RHSM client', async () => {
      await regClient.Boot('rhel9');

      hostname = await regClient.GetHostname();
      console.log('System hostname:', hostname);

      const reg = await regClient.RegisterRHC(
        process.env.ACTIVATION_KEY_1,
        process.env.ORG_ID_1,
        templateName,
      );
      if (reg?.exitCode != 0) {
        console.log('Registration stdout:', reg?.stdout);
        console.log('Registration stderr:', reg?.stderr);
      }
      expect(reg?.exitCode, 'registration should be successful').toBe(0);

      const start = performance.now();

      await expect
        .poll(async () => await isInInventory(page, hostname, true), {
          message: 'System did not appear in inventory in time',
          timeout: 600_000,
          intervals: [10_000],
        })
        .toBe(true);

      const durationSec = (performance.now() - start) / 1000;
      console.log(`⏰ Waiting on host to appear in Patch took ${durationSec.toFixed(3)} seconds`);

      // await waitForRhcdActive(regClient);
      // await refreshSubscriptionManager(regClient);

    });

    await test.step('Verify system is attached to template', async () => {
      const isAttached = await pollForSystemTemplateAttachment(page, hostname, true, 10_000, 12);
      expect(isAttached, 'system should be attached to template').toBe(true);
    });

    await test.step('Attempt to delete template and verify warning appears', async () => {
      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await rowTemplate.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      await test.step('Verify deletion warning appears for template with associated systems', async () => {
        await expect(
          page.getByText('Delete template?'),
          'delete template warning should be visible',
        ).toBeVisible();

        const modal = page.getByRole('dialog');
        await expect(modal, 'delete template modal should be visible').toBeVisible();

        const removeButton = modal.getByRole('button', { name: 'Delete' });
        await expect(removeButton, 'delete button should be enabled').toBeEnabled();

        await expect(
          modal.getByRole('link', { name: /This template is assigned to \d+ system/i }),
          'system assignment link should be visible',
        ).toBeVisible();

        await modal.getByRole('button', { name: 'Cancel' }).click();
      });
    });

    await test.step('Unregister the system', async () => {
      const unreg = await regClient.Unregister(true);
      if (unreg?.exitCode != 0) {
        console.log('Unregistration stdout:', unreg?.stdout);
        console.log('Unregistration stderr:', unreg?.stderr);
      }
      expect(unreg?.exitCode, 'unregistration should be successful').toBe(0);
    });

    await test.step('Wait for system to be removed from inventory', async () => {
      // Poll until system is not found or not attached to template
      // This should ensure the backend has processed the unregistration before checking UI
      const isAttached = await pollForSystemTemplateAttachment(page, hostname, false, 10_000, 6);
      expect(isAttached, 'system should be removed from inventory').toBe(true);
    });

    // https://issues.redhat.com/browse/HMS-9731: backend cache issue with template deletion
    await test.step('Reload page to ensure UI reflects system removal', async () => {
      await page.reload();
      await expect(page.getByRole('button', { name: 'Create template' })).toBeVisible();
    });

    await test.step('Verify template can now be deleted without warning', async () => {
      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await rowTemplate.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      await test.step('Verify no warning appears and deletion succeeds', async () => {
        await expect(
          page.getByText('Delete template?'),
          'delete template confirmation modal should be visible',
        ).toBeVisible();

        const modal = page.getByRole('dialog');

        await expect(
          modal.getByText(
            `Template ${templateName} and all its data will be deleted. This action cannot be undone.`,
          ),
          'delete template modal body should be visible',
        ).toBeVisible();

        await expect(
          modal.getByRole('link', { name: /This template is assigned to \d+ system/i }),
          'system assignment link should not be present',
        ).toHaveCount(0);

        const removeButton = modal.getByRole('button', { name: 'Delete' });
        await expect(removeButton, 'delete button should be enabled').toBeEnabled();
        await removeButton.click();
      });

      await test.step('Verify template is removed from the list', async () => {
        await expect(
          rowTemplate.getByText('Valid'),
          'template should be removed from the list',
        ).toHaveCount(0, { timeout: 30000 });
      });
    });
  });
});
