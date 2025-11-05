import { test, expect, RepositoriesApi } from 'test-utils';

test.describe('Nightly check for RHEL repos snapshot task', () => {
  test('Verify RHEL repos have a snapshot task and it is under an hour old', async ({ client }) => {
    const repositoriesApi = new RepositoriesApi(client);

    await test.step('Get RHEL repositories', async () => {
      const rhelRepos = (
        await repositoriesApi.listRepositories({
          origin: 'red_hat',
        })
      ).data;
      expect(rhelRepos!.length).toBeGreaterThan(0);

      for (const repo of rhelRepos!) {
        // Check that a snapshot was attempted (lastSnapshotTask exists)
        expect(repo.lastSnapshotTask?.createdAt).toBeDefined();

        // Check if the snapshot task is under an hour old in UTC
        const taskCreatedAt = new Date(repo.lastSnapshotTask!.createdAt!);
        const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
        expect(taskCreatedAt > oneHourAgo).toBeTruthy();
      }
    });
  });
});
