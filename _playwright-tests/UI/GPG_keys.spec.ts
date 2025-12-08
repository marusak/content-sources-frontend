import { test, expect } from 'test-utils';
import { cleanupRepositories, randomName } from 'test-utils/helpers';

import { navigateToRepositories } from './helpers/navHelpers';
import { closeGenericPopupsIfExist, waitForValidStatus } from './helpers/helpers';

const repoNamePrefix = 'GPG-key';
const repoName = `${repoNamePrefix}-${randomName()}`;

const url = 'https://jlsherrill.fedorapeople.org/fake-repos/signed/';
const packages_key =
  'http://jlsherrill.fedorapeople.org/fake-repos/needed-errata/RPM-GPG-KEY-dummy-packages-generator';
const meta_key = 'https://jlsherrill.fedorapeople.org/fake-repos/signed/GPG-KEY.gpg';

test.describe('Test GPG keys', () => {
  test('Create a repo, add a GPG Key, toggle metadata', async ({ page, client, cleanup }) => {
    await test.step('Delete any GPG key test repos that exist', async () => {
      await cleanup.runAndAdd(() => cleanupRepositories(client, repoName, url));
      await navigateToRepositories(page);
      await closeGenericPopupsIfExist(page);
    });

    await test.step('Create a repository', async () => {
      // Click on the 'Add repositories' button
      // HMS-5268 There are two buttons on the ZeroState page
      await page.getByRole('button', { name: 'Add repositories' }).first().click();
      await expect(page.getByRole('heading', { name: 'Add custom repositories' })).toBeVisible();
      // Fill in the repository details
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill(`${repoName}`);
      await page.getByLabel('Introspect only').click();
      await page.getByRole('textbox', { name: 'URL', exact: true }).fill(url);
      await page.getByPlaceholder('Paste GPG key or URL here').fill(packages_key);
      await expect(page.getByRole('textbox', { name: 'gpgkey_file_to_upload' })).toContainText(
        '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      );
      // Check that validate fails if you select the metadata option
      await page.getByText('Package and metadata').click();
      await expect(page.getByText('Error validating signature:')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await page.getByText('Package verification only').click();
      // Save button would be disabled for bad or incorrect gpg key
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
      await page.getByPlaceholder('Paste GPG key or URL here').fill('I am not a GPG Key');
      await expect(
        page.getByText('Error loading GPG Key: no gpg key was found. Is this a valid GPG Key?'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
      await page.getByPlaceholder('Paste GPG key or URL here').fill(packages_key);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
    });

    await test.step('Change to Metadata GPG Key', async () => {
      // Search for the created repo
      const row = await waitForValidStatus(page, repoName);
      // Open edit modal
      await row.getByRole('button', { name: 'Kebab toggle' }).click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(page.getByRole('dialog', { name: 'Edit custom repository' })).toBeVisible();
      await page.getByPlaceholder('Paste GPG key or URL here').fill(meta_key);
      await expect(page.getByRole('textbox', { name: 'gpgkey_file_to_upload' })).toContainText(
        '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      );
      await page.getByText('Package and metadata').click();
      // Save button would be disabled for bad or incorrect gpg key
      await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    });
  });
});
