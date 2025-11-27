import { test, expect, RepositoriesApi } from 'test-utils';

test.describe('Check RHEL repos have hourly snapshot tasks', () => {
  test('Verify RHEL repos have a snapshot task queued within the last 60 minutes', async ({
    client,
  }) => {
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
        const createdAt = repo.lastSnapshotTask?.createdAt;
        expect(createdAt).toBeDefined();

        // Check if the snapshot task is under 60 minutes old (queued every 45 min + 15 min guard time)
        const taskQueuedAt = new Date(createdAt!);

        const timestamp = taskQueuedAt.getTime();
        expect(isNaN(timestamp)).toBeFalsy();

        const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
        console.log(
          `Repo: ${repo.name}, Task queued at: ${taskQueuedAt.toISOString()} (${taskQueuedAt.toUTCString()}), Age: ${Math.round((Date.now() - taskQueuedAt.getTime()) / 60000)} minutes`,
        );
        expect(taskQueuedAt > sixtyMinutesAgo).toBeTruthy();
      }
    });
  });
});
