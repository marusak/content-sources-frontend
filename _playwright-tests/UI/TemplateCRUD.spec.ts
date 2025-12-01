import { test, expect } from 'test-utils';
import { cleanupRepositories, cleanupTemplates, randomName } from 'test-utils/helpers';

import { navigateToRepositories, navigateToTemplates } from './helpers/navHelpers';
import { closeGenericPopupsIfExist, getRowByNameOrUrl } from './helpers/helpers';
import { createCustomRepo } from './helpers/createRepositories';
import { randomUrl } from './helpers/repoHelpers';

const templateNamePrefix = 'template_CRUD';
const repoNamePrefix = 'custom_repo-template';

const repoName = `${repoNamePrefix}-aarch64-${randomName()}`;
const repoNameX86 = `${repoNamePrefix}-x86_64-${randomName()}`;
const repoNameNoSnaps = `${repoNamePrefix}-introspect-only-${randomName()}`;
const templateName = `${templateNamePrefix}-${randomName()}`;

const smallRHRepo = 'Red Hat CodeReady Linux Builder for RHEL 9 ARM 64 (RPMs)';

test.describe('Templates CRUD', () => {
  test('Add, Read, update, delete a template', async ({ page, client, cleanup }) => {
    await test.step('Delete any templates and template test repos that exist', async () => {
      await cleanup.runAndAdd(() => cleanupRepositories(client, repoNamePrefix));
      await cleanup.runAndAdd(() => cleanupTemplates(client, templateNamePrefix));
    });
    await test.step('Create repositories', async () => {
      await navigateToRepositories(page);
      await closeGenericPopupsIfExist(page);

      // Create first repo (aarch64, with snapshot)
      await createCustomRepo(page, repoName);
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60_000 });

      // Create second repo (x86_64, with snapshot)
      const repoDataX86 = {
        distribution_arch: 'x86_64',
        distribution_versions: ['8', '9'],
        name: repoNameX86,
        origin: 'external',
        snapshot: true,
        url: randomUrl(),
      };
      await page.request.post('/api/content-sources/v1/repositories/', {
        data: repoDataX86,
        headers: { 'Content-Type': 'application/json' },
      });
      const rowX86 = await getRowByNameOrUrl(page, repoNameX86);
      await expect(rowX86.getByText('Valid')).toBeVisible({ timeout: 60_000 });

      // Create third repo ( Any arch, introspect only, no snapshots )
      const repoDataNoSnaps = {
        distribution_arch: '',
        distribution_versions: ['8', '9'],
        name: repoNameNoSnaps,
        origin: 'external',
        snapshot: false,
        url: randomUrl(),
      };
      await page.request.post('/api/content-sources/v1/repositories/', {
        data: repoDataNoSnaps,
        headers: { 'Content-Type': 'application/json' },
      });
      const rowNoSnaps = await getRowByNameOrUrl(page, repoNameNoSnaps);
      await expect(rowNoSnaps.getByText('Valid')).toBeVisible({ timeout: 60_000 });
    });
    await test.step('Create a template', async () => {
      await navigateToTemplates(page);
      await page.getByRole('button', { name: 'Create template' }).click();
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'aarch64' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      const modalPage = page.getByTestId('add_template_modal');
      const rowRHELRepo = await getRowByNameOrUrl(modalPage, smallRHRepo);
      await rowRHELRepo.getByLabel('Select row').click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      // Select first custom repo (aarch64)
      const rowRepo = await getRowByNameOrUrl(modalPage, repoName);
      await rowRepo.getByLabel('Select row').click();

      // Verify repo without snapshots appears but checkbox is disabled
      const rowNoSnaps = await getRowByNameOrUrl(modalPage, repoNameNoSnaps);
      await expect(rowNoSnaps).toBeVisible();
      const noSnapsCheckbox = rowNoSnaps.getByLabel('Select row');
      await expect(noSnapsCheckbox).toBeDisabled();
      // Verify warning message appears on hover
      await noSnapsCheckbox.hover();
      await expect(page.getByText('Snapshot not yet available for this repository')).toBeVisible();

      // Verify x86 repo cannot be added due to architecture mismatch (should not appear)
      await modalPage.getByRole('searchbox', { name: 'Filter by name/url' }).clear();
      await modalPage.getByRole('searchbox', { name: 'Filter by name/url' }).fill(repoNameX86);
      await expect(
        modalPage.getByText('No custom repositories match the filter criteria', { exact: false }),
      ).toBeVisible();
      // Also verify the x86 repo row is not visible in the table
      await expect(modalPage.getByText(repoNameX86)).toBeHidden();

      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByText('Use the latest content', { exact: true }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Enter template details')).toBeVisible();
      await page.getByPlaceholder('Enter name').fill(`${templateName}`);
      await page.getByPlaceholder('Enter name').press('Enter');
      await page.getByPlaceholder('Description').fill('Template test');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Create other options' }).click();
      await page.getByText('Create template only', { exact: true }).click();
      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await expect(rowTemplate.getByText('Valid')).toBeVisible({ timeout: 60000 });
    });
    await test.step('Read and update values in the template', async () => {
      const rowTemplate = await getRowByNameOrUrl(page, templateName);
      await rowTemplate.getByRole('button', { name: templateName }).click();
      await expect(page.getByLabel('Breadcrumb').first()).toHaveText('RHELContentTemplates');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(templateName);
      await expect(page.getByText('Description:Template test')).toBeVisible();
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
      // Verify only the aarch64 custom repo is in the template
      const modalPage = page.getByTestId('edit_template_modal');
      await expect(modalPage.getByRole('button', { name: 'Selected' })).toBeEnabled();
      await modalPage.getByRole('button', { name: 'Selected' }).click();
      await expect(page.getByText(`${repoName}`)).toBeVisible();
      await expect(
        modalPage.getByRole('grid', { name: 'custom repositories table' }).locator('tbody tr'),
      ).toHaveCount(1);
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Set up date', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByText('Enter template details')).toBeVisible();
      await expect(page.getByPlaceholder('Enter name')).toHaveValue(`${templateName}`);
      await expect(page.getByPlaceholder('Description')).toHaveValue('Template test');
      await page.getByPlaceholder('Enter name').fill(`${templateName}-edited`);
      await page.getByPlaceholder('Description').fill('Template test edited');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
    });
    await test.step('Delete the template', async () => {
      await navigateToTemplates(page);
      const rowTemplate = await getRowByNameOrUrl(page, `${templateName}-edited`);
      await expect(rowTemplate.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await rowTemplate.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Delete template?')).toBeVisible();
      await page.getByRole('button', { name: 'Delete' }).click();
      await expect(rowTemplate.getByText('Valid')).toBeHidden();
    });
  });
});
