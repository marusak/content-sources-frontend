import { test, expect, type Page } from '@playwright/test';
import { navigateToRepositories } from './helpers/navHelpers';
import { deleteAllRepos } from './helpers/deleteRepositories';
import { closePopupsIfExist } from './helpers/helpers';

test.describe('Custom Repositories', () => {
  test('Clean - Delete any current repos that exist', async ({ page }) => {
    await deleteAllRepos(page);
  });

  test('Create two custom repositories', async ({ page }) => {
    await navigateToRepositories(page);
    await closePopupsIfExist(page);
    const nameList = ['one', 'current'];

    // Do not use chain methods when using await (like foreach/map/etc..)
    for (const name of nameList) {
      await addRepository(
        page,
        name,
        'https://jlsherrill.fedorapeople.org/fake-repos/revision/' + name,
      );
    }
  });

  test('Delete one custom repository', async ({ page }) => {
    await navigateToRepositories(page);
    await closePopupsIfExist(page);

    if (await page.getByLabel('Kebab toggle').first().isDisabled())
      throw Error("Kebab is disabled when it really shouldn't be");
    await page.getByLabel('Kebab toggle').first().click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByText('Remove repositories?')).toBeVisible();

    await Promise.all([
      // Wait for the successful API call
      page.waitForResponse(
        (resp) => resp.url().includes('bulk_delete') && resp.status() >= 200 && resp.status() < 300,
      ),
      page.getByRole('button', { name: 'Remove' }).click(),
    ]);
  });
});

const addRepository = async (page: Page, name: string, url: string) => {
  // Click on the 'Add repositories' button
  await page.getByRole('button', { name: 'Add repositories' }).first().click();

  // Wait for the modal to be visible
  const repositoryModal = page.locator('div[id^="pf-modal-part"]').first();
  await expect(repositoryModal).toBeVisible();

  // Fill in the repository details
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('URL').fill(url);

  // Filter by architecture
  const architectureFilterButton = page.getByRole('button', { name: 'filter architecture' });
  await architectureFilterButton.click();
  await page.getByRole('option', { name: 'x86_64' }).click();

  // Filter by version
  const versionFilterButton = page.getByRole('button', { name: 'filter version' });
  await versionFilterButton.click();
  await page.getByRole('menuitem', { name: 'el9' }).locator('label').click();
  await page.getByRole('menuitem', { name: 'el8' }).locator('label').click();
  await versionFilterButton.click(); // Close the version filter dropdown

  // Wait for the successful API call
  const errorElement = page.locator('.pf-v5-c-helper-text__item.pf-m-error');

  if (await errorElement.isVisible()) {
    throw new Error('Error message in element is visible');
  }

  await Promise.all([
    // Click on 'Save'
    page.getByRole('button', { name: 'Save' }).first().click(),
    page.waitForResponse(
      (resp) => resp.url().includes('/bulk_create/') && resp.status() >= 200 && resp.status() < 300,
    ),
    expect(repositoryModal).not.toBeVisible(),
  ]);
};
