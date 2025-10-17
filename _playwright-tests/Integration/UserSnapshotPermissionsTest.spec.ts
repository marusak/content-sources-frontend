import { test, expect, RepositoriesApi, SnapshotsApi, ApiRepositoryResponse } from 'test-utils';

/**
 * User Snapshot Permissions Test using stable_sam user
 * Tests that a user with the snapshotting feature can list snapshots API.
 * The stable_sam user already has access to repositories with snapshots.
 * Need to pass headers to the API calls to authenticate the request.
 */

test.describe('User Snapshot Permissions Test', () => {
  test.use({
    storageState: '.auth/stable_sam.json',
    extraHTTPHeaders: process.env.STABLE_SAM_TOKEN
      ? { Authorization: process.env.STABLE_SAM_TOKEN }
      : {},
  });

  test('Test user has permissions to use snapshot APIs', async ({ client }) => {
    const repositoriesApi = new RepositoriesApi(client);
    const snapshotsApi = new SnapshotsApi(client);

    let testRhelRepo: ApiRepositoryResponse | null = null;
    let testCustomRepo: ApiRepositoryResponse | null = null;

    await test.step('Find one RHEL repo with snapshots for testing', async () => {
      const redHatRepoList = await repositoriesApi.listRepositories({
        origin: 'red_hat',
        limit: 10,
      });

      testRhelRepo = redHatRepoList.data?.find((repo) => repo.snapshot === true) || null;
    });

    await test.step('Find one custom repo with snapshots for testing', async () => {
      const customRepoList = await repositoriesApi.listRepositories({
        origin: 'external',
        limit: 10,
      });

      testCustomRepo = customRepoList.data?.find((repo) => repo.snapshot === true) || null;
    });

    await test.step('Test user can list snapshots for RHEL repo', async () => {
      if (!testRhelRepo?.uuid) {
        throw new Error('No RHEL repository with snapshots found for testing');
      }

      const snapshots = await snapshotsApi.listSnapshotsForRepo({
        uuid: testRhelRepo.uuid,
      });

      expect(snapshots).toBeDefined();
      expect(snapshots.data).toBeDefined();
    });

    await test.step('Test user can list snapshots for custom repo', async () => {
      if (!testCustomRepo?.uuid) {
        throw new Error('No custom repository with snapshots found for testing');
      }

      const snapshots = await snapshotsApi.listSnapshotsForRepo({
        uuid: testCustomRepo.uuid,
      });

      expect(snapshots).toBeDefined();
      expect(snapshots.data).toBeDefined();
    });
  });
});
