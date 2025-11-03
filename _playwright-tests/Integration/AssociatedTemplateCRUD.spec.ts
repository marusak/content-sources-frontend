import {
  test,
  expect,
  cleanupTemplates,
  randomName,
} from '../test-utils/_playwright-tests/test-utils/src';
import { RHSMClient, refreshSubscriptionManager } from './helpers/rhsmClient';
import { navigateToTemplates } from '../UI/helpers/navHelpers';
import { closePopupsIfExist, getRowByNameOrUrl } from '../UI/helpers/helpers';

const templateNamePrefix = 'associated_template_test';
const templateName = `${templateNamePrefix}-${randomName()}`;
const regClient = new RHSMClient(`AssociatedTemplateCRUDTest-${randomName()}`);

test.describe('Associated Template CRUD', () => {
  test('Warn against template deletion when associated to a system and not warn after unregistration', async ({
    page,
    client,
    cleanup,
  }) => {
    await test.step('Set up cleanup for templates and RHSM client', async () => {
      await cleanup.runAndAdd(() => cleanupTemplates(client, templateNamePrefix));
      cleanup.add(() => regClient.Destroy('rhc'));
    });

    await test.step('Navigate to templates and create a new template', async () => {
      await navigateToTemplates(page);
      await closePopupsIfExist(page);
      await page.getByRole('button', { name: 'Create template' }).click();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
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
      await page.getByPlaceholder('Enter name').fill(`${templateName}`);
      await page.getByPlaceholder('Description').fill('Template test for associated system CRUD');
      await page.getByRole('button', { name: 'Next', exact: true }).click();

      await page.getByRole('button', { name: 'Create other options' }).click();
      await page.getByText('Create template only', { exact: true }).click();
      const rowTemplate = await getRowByNameOrUrl(page, `${templateName}`);
      await expect(rowTemplate.getByText('Valid')).toBeVisible({ timeout: 660000 });
    });

    await test.step('Register system with template using RHSM client', async () => {
      await regClient.Boot('rhel9');

      const reg = await regClient.RegisterRHC(
        process.env.ACTIVATION_KEY_1,
        process.env.ORG_ID_1,
        templateName,
      );
      if (reg?.exitCode != 0) {
        console.log('Registration stdout:', reg?.stdout);
        console.log('Registration stderr:', reg?.stderr);
      }
      expect(reg?.exitCode).toBe(0);

      await refreshSubscriptionManager(regClient);
    });

    await test.step('Attempt to delete template and verify warning appears', async () => {
      await navigateToTemplates(page);

      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await rowTemplate.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      await test.step('Verify deletion warning appears for template with associated systems', async () => {
        await expect(page.getByText('Delete template?')).toBeVisible();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        const removeButton = modal.getByRole('button', { name: 'Delete' });
        await expect(removeButton).toBeEnabled();

        await expect(
          modal.getByRole('link', { name: /This template is assigned to \d+ system/i }),
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
      expect(unreg?.exitCode).toBe(0);
    });

    await test.step('Verify template can now be deleted without warning', async () => {
      await navigateToTemplates(page);

      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await rowTemplate.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();

      await test.step('Verify no warning appears and deletion succeeds', async () => {
        await expect(page.getByText('Delete template?')).toBeVisible();

        const modal = page.getByRole('dialog');

        await expect(
          modal.getByText(
            `Template ${templateName} and all its data will be deleted. This action cannot be undone.`,
          ),
        ).toBeVisible();

        await expect(
          modal.getByRole('link', { name: /This template is assigned to \d+ system/i }),
        ).toBeHidden();

        const removeButton = modal.getByRole('button', { name: 'Delete' });
        await expect(removeButton).toBeEnabled();
        await removeButton.click();
      });

      await test.step('Verify template is removed from the list', async () => {
        await expect(rowTemplate.getByText('Valid')).not.toBeVisible({ timeout: 30000 });
      });
    });
  });
});
