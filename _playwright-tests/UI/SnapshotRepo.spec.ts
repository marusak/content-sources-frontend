import { expect, test } from 'test-utils';
import { cleanupRepositories, randomName } from 'test-utils/helpers';
import { navigateToRepositories, navigateToTemplates } from './helpers/navHelpers';
import {
  closePopupsIfExist,
  getRowByNameOrUrl,
  validateSnapshotTimestamp,
} from './helpers/helpers';

test.describe('Snapshot Repositories', () => {
  test('Snapshot a repository', async ({ page, client, cleanup }) => {
    const repoName = 'one';
    const editedRepoName = `${repoName}-edited`;
    const repoUrl = 'https://jlsherrill.fedorapeople.org/fake-repos/revision/' + repoName;

    await cleanup.runAndAdd(() => cleanupRepositories(client, repoName, repoUrl));
    await navigateToRepositories(page);
    await closePopupsIfExist(page);

    await test.step('Open the add repository modal', async () => {
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByRole('dialog', { name: 'Add custom repositories' })).toBeVisible();
    });

    await test.step('Fill in the repository details', async () => {
      await page.getByLabel('Name').fill(repoName);
      await page.getByLabel('Introspect only').click();
      await page.getByLabel('URL').fill(repoUrl);
    });

    await test.step('Filter by architecture', async () => {
      await page.getByRole('button', { name: 'filter architecture' }).click();
      await page.getByRole('menuitem', { name: 'x86_64' }).click();
    });

    await test.step('Filter by OS version', async () => {
      await page.getByRole('button', { name: 'filter OS version' }).click();
      await page.getByRole('menuitem', { name: 'el9' }).click();
      await page.getByRole('menuitem', { name: 'el8' }).click();
      await page.getByRole('button', { name: 'filter OS version' }).click();
    });

    await test.step('Submit the form and wait for modal to disappear', async () => {
      await Promise.all([
        page.getByRole('button', { name: 'Save' }).first().click(),
        page.waitForResponse(
          (resp) =>
            resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
        ),
        expect(page.getByRole('dialog', { name: 'Add custom repositories' })).not.toBeVisible(),
      ]);
    });

    await test.step('Enable snapshotting for the created repository', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await row.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Edit' }).click({ timeout: 60000 });
      await page.getByLabel('Name').fill(editedRepoName);
      await page.getByLabel('Snapshotting').click();
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    });

    await test.step('Trigger snapshot manually', async () => {
      const edited_row = await getRowByNameOrUrl(page, editedRepoName);
      await expect(edited_row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await edited_row.getByLabel('Kebab toggle').click();
      // Trigger a snapshot manually
      await page.getByRole('menuitem', { name: 'Trigger snapshot' }).click();
      await expect(edited_row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await edited_row.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'View all snapshots' }).click();
      // Verify that snapshot is in snapshots list
      await expect(page.getByRole('dialog', { name: 'Snapshots' }).locator('tbody')).toBeVisible();
      const snapshotTimestamp = await page
        .getByRole('dialog', { name: 'Snapshots' })
        .locator('tbody')
        .textContent();
      if (snapshotTimestamp != null) {
        if ((await validateSnapshotTimestamp(snapshotTimestamp, 10)) == false) {
          throw new Error('Most recent snapshot timestamp is older than 10 minutes!');
        }
      } else {
        throw new Error('Snapshot timestamp not found!');
      }
      await page.getByLabel('Close', { exact: true }).click();
    });

    await test.step('Delete created repository', async () => {
      const edited_row = await getRowByNameOrUrl(page, repoUrl);
      await edited_row.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Delete repositories?')).toBeVisible();

      await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes('delete') && resp.status() >= 200 && resp.status() < 300,
        ),
        page.getByRole('button', { name: 'Delete' }).click(),
      ]);

      await expect(edited_row).not.toBeVisible();
    });
  });

  test('Snapshot deletion', async ({ page, client, cleanup }) => {
    const smallRHRepo = 'Red Hat CodeReady Linux Builder for RHEL 9 ARM 64 (RPMs)';
    const repoNamePrefix = 'snapshot-deletion';
    const repoName = `${repoNamePrefix}-${randomName()}`;
    const templateName = `Test-template-for-snapshot-deletion-${randomName()}`;

    await test.step('Cleanup repositories using "zoo" URLs', async () => {
      await cleanup.runAndAdd(() =>
        cleanupRepositories(
          client,
          repoNamePrefix,
          'https://fedorapeople.org/groups/katello/fakerepos/zoo',
        ),
      );
    });
    await navigateToRepositories(page);
    await closePopupsIfExist(page);

    await test.step('Create a repository', async () => {
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByRole('dialog', { name: 'Add custom repositories' })).toBeVisible();
      await page.getByLabel('Name').fill(`${repoName}`);
      await page.getByLabel('Snapshotting').click();
      await page.getByLabel('URL').fill('https://fedorapeople.org/groups/katello/fakerepos/zoo/');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 70000 });
    });

    await test.step('Edit the repository', async () => {
      for (let i = 2; i <= 4; i++) {
        const row = await getRowByNameOrUrl(page, repoName);
        await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
        await test.step(`Edit repository and create snapshot ${i}`, async () => {
          // Open the edit modal
          await row.getByLabel('Kebab toggle').click();
          await page.getByRole('menuitem', { name: 'Edit' }).click({ timeout: 60000 });
          await page
            .getByLabel('URL')
            .fill(`https://fedorapeople.org/groups/katello/fakerepos/zoo${i}/`);
          await page.getByRole('button', { name: 'Save changes', exact: true }).click();
          await expect(row.getByText('Valid')).toBeVisible({ timeout: 70000 });
        });
      }
    });

    await test.step('Create a template', async () => {
      const row = await getRowByNameOrUrl(page, repoName);
      await expect(row.getByText('Valid')).toBeVisible({ timeout: 60000 });
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'View all snapshots' }).click();
      await expect(page.getByRole('button', { name: '1 - 4 of 4' }).first()).toBeVisible({
        timeout: 60000,
      });
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
      // wait till next button is enabled
      await page.getByRole('button', { name: 'Next', exact: true }).isEnabled();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByTestId('custom_repositories_step')).toBeVisible();
      await row.click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(page.getByTestId('set_up_date')).toBeVisible();
      await page.getByTestId('use-latest-snapshot-radio').click();
      await page.getByRole('radio', { name: 'Use the latest content' }).check();
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByPlaceholder('Enter name').fill(`${templateName}`);
      await page.getByPlaceholder('Description').fill('Template test');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: 'Create other options' }).click();
      await page.getByText('Create template only', { exact: true }).click();
      const templateRow = await getRowByNameOrUrl(page, templateName);
      await expect(templateRow.getByText('Valid')).toBeVisible({ timeout: 60000 });
      // Verify the template is created and uses the latest snapshot
      await expect(templateRow.getByText('Use latest')).toBeVisible();
    });

    // Test deletion of a single snapshot.
    await test.step('Delete a single snapshot', async () => {
      await navigateToRepositories(page);
      const row = await getRowByNameOrUrl(page, repoName);
      await row.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'View all snapshots' }).click();
      await expect(page.getByRole('dialog', { name: 'Snapshots' }).locator('tbody')).toBeVisible();
      await page
        .getByTestId('snapshot_list_table')
        .locator('tbody tr')
        .first()
        .getByLabel('Kebab toggle')
        .click();
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      await expect(page.getByText('Delete snapshots?')).toBeVisible();
      await page.getByText('Delete', { exact: true }).click();
      await expect(page.getByRole('button', { name: '1 - 3 of 3' }).first()).toBeVisible({
        timeout: 60000,
      });
      await page.getByText('Close').click();
    });

    await test.step('Bulk delete snapshot', async () => {
      // Test bulk deletion of multiple snapshots.
      // Before bulk delete we need to wait for previous deletion to finish or it will fail.
      await page.waitForTimeout(6000);
      const row = await getRowByNameOrUrl(page, repoName);
      await row.getByLabel('Kebab toggle').click();
      await page.getByRole('menuitem', { name: 'View all snapshots' }).click();
      await expect(page.getByRole('dialog', { name: 'Snapshots' }).locator('tbody')).toBeVisible();
      await page.getByRole('row', { name: 'select-snapshot-checkbox' }).locator('label').click();
      // Verify that you can't delete all snapshots
      // Bulk delete button is disabled
      await expect(page.getByTestId('remove_snapshots_bulk')).toBeDisabled();
      // Therefore uncheck the first snapshot
      await page.getByRole('checkbox', { name: 'Select row 0' }).uncheck();
      await page.getByTestId('remove_snapshots_bulk').click();
      await expect(page.getByText('Delete snapshots?')).toBeVisible();
      await page.getByText('Delete', { exact: true }).click();
      await expect(page.getByRole('button', { name: '1 - 1 of 1' }).first()).toBeVisible({
        timeout: 60000,
      });
      await page.getByText('Close').click();
    });
  });
});
