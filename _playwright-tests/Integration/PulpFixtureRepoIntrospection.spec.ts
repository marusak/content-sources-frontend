import { test, expect, RepositoriesApi, FeaturesApi } from 'test-utils';
import pulpFixtures from './data/pulp_fixtures.json';

/**
 * Pulp Fixture Repository Introspection Test using stable_sam user
 * This test validates that existing Pulp project fixture repositories are being successfully
 * introspected. The stable_sam user already has these repositories created.
 *
 * If repositories are missing, they will be automatically created with snapshot enabled.
 *
 * Pulp fixtures repository data is stored in: ./data/pulp_fixtures.json
 * This list was selected by jsherrill to test the introspection feature.
 * https://fixtures.pulpproject.org/
 */

test.describe('Pulp Fixture Repository Introspection', () => {
  test.use({
    storageState: '.auth/stable_sam.json',
    extraHTTPHeaders: process.env.STABLE_SAM_TOKEN
      ? { Authorization: process.env.STABLE_SAM_TOKEN }
      : {},
  });

  test('should validate pulp fixture repository introspection for stable_sam user', async ({
    client,
  }) => {
    const repositoriesApi = new RepositoriesApi(client);
    const featuresApi = new FeaturesApi(client);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await test.step('Check if stable_sam user has snapshot support', async () => {
      const features = await featuresApi.listFeatures();

      expect(features.snapshots).toBeDefined();
      expect(features.snapshots?.accessible).toBe(true);
      expect(features.snapshots?.enabled).toBe(true);
    });

    await test.step('Ensure all pulp fixture repos exist (create if missing)', async () => {
      const createdRepos: string[] = [];

      for (const [name, repoUrl] of Object.entries(pulpFixtures)) {
        // Check if repo with this URL already exists
        const existingRepos = await repositoriesApi.listRepositories({
          search: repoUrl,
        });

        if (existingRepos.meta?.count === 0) {
          console.log(`Repo url ${repoUrl} not found. Creating...`);
          try {
            await repositoriesApi.createRepository({
              apiRepositoryRequest: {
                name: name,
                url: repoUrl,
                snapshot: true,
              },
            });
            createdRepos.push(name);
            console.log(`Created repository: ${name}`);
          } catch (error) {
            // Repository might already exist with a different name
            console.log(
              `Failed to create repository ${name} with url ${repoUrl}: ${error instanceof Error ? error.message : error}`,
            );
          }
        }
      }

      if (createdRepos.length > 0) {
        console.log(`Created ${createdRepos.length} new repositories: ${createdRepos.join(', ')}`);
      } else {
        console.log('All pulp fixture repositories already exist');
      }
    });

    const pulpReposResponse = await repositoriesApi.listRepositories({
      search: 'fixtures.pulpproject.org',
    });
    const existingPulpRepos = pulpReposResponse.data || [];

    await test.step('Validate existing pulp repositories count', async () => {
      expect(pulpReposResponse.data).toBeDefined();
      expect(existingPulpRepos.length).toBe(36);
    });

    await test.step('Check that repositories are introspected and have valid status', async () => {
      // Verify all pulp repos are being introspected (status can be Pending, Valid, or Unavailable)
      const failures: string[] = [];
      const unavailableRepos: string[] = [];

      for (const repo of existingPulpRepos) {
        const lastSuccessIntrospectionTime = repo.lastSuccessIntrospectionTime;

        // Check snapshot flag
        if (!repo.snapshot) {
          failures.push(
            `Repository "${repo.name}" (UUID: ${repo.uuid}) has snapshot flag set to false`,
          );
        }

        // Check status; log if Unavailable, fail if unexpected status
        if (repo.status === 'Unavailable') {
          unavailableRepos.push(
            `Repository "${repo.name}" (UUID: ${repo.uuid}, URL: ${repo.url}) is Unavailable`,
          );
        } else if (!['Pending', 'Valid'].includes(repo.status || '')) {
          failures.push(
            `Repository "${repo.name}" (UUID: ${repo.uuid}, URL: ${repo.url}) has unexpected status: ${repo.status || 'undefined'}`,
          );
        }

        // Check last introspection time
        if (lastSuccessIntrospectionTime) {
          const introspectionDate = lastSuccessIntrospectionTime.split('T')[0];
          if (![today, yesterday].includes(introspectionDate)) {
            failures.push(
              `Repository "${repo.name}" (UUID: ${repo.uuid}) was not introspected in the last 24 hours. Last introspection: ${introspectionDate}`,
            );
          }
        } else {
          failures.push(
            `Repository "${repo.name}" (UUID: ${repo.uuid}) has no introspection time - introspection may not be working`,
          );
        }
      }

      // Log unavailable repos as warnings
      if (unavailableRepos.length > 0) {
        console.log(
          `\nWarning: ${unavailableRepos.length} repo(s) are unavailable but being introspected:\n` +
            unavailableRepos.map((msg) => `  - ${msg}`).join('\n'),
        );
      }

      // Fail the test only if there were introspection failures (not just unavailable repos)
      if (failures.length > 0) {
        throw new Error(
          `${failures.length} pulp fixture repo(s) failed validation:\n` +
            failures.map((msg) => `  - ${msg}`).join('\n'),
        );
      }
    });
  });
});
