import { test, expect, RepositoriesApi, FeaturesApi } from 'test-utils';

/**
 * Pulp Fixture Repository Introspection Test using stable_sam_stage user
 * This test validates that existing Pulp project fixture repositories can be successfully
 * introspected via the API. The stable_sam_stage user already has access to these repositories.
 */

test.describe('Pulp Fixture Repository Introspection', () => {
  test.use({
    storageState: '.auth/stable_sam_stage.json',
    extraHTTPHeaders: process.env.STABLE_SAM_STAGE_TOKEN
      ? { Authorization: process.env.STABLE_SAM_STAGE_TOKEN }
      : {},
  });

  test('should validate pulp fixture repository introspection for stable_sam_stage user', async ({
    client,
  }) => {
    // Initialize APIs once for the entire test
    const repositoriesApi = new RepositoriesApi(client);
    const featuresApi = new FeaturesApi(client);

    // Date constants for introspection validation
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await test.step('Check if stable_sam_stage user has snapshot support', async () => {
      const features = await featuresApi.listFeatures();

      console.log('Available features:', Object.keys(features));

      // Check if snapshots feature exists
      expect(features.snapshots).toBeDefined();
      // Check if snapshots are accessible
      expect(features.snapshots?.accessible).toBe(true);
      // Assert that snapshots are enabled
      expect(features.snapshots?.enabled).toBe(true);

      console.log(
        `Snapshots feature - accessible: ${features.snapshots?.accessible}, enabled: ${features.snapshots?.enabled}`,
      );
    });

    // Get pulp repositories once and reuse across steps
    const pulpReposResponse = await repositoriesApi.listRepositories({
      search: 'fixtures.pulpproject.org',
    });
    console.log('pulpReposResponse', pulpReposResponse.data?.length);
    const existingPulpRepos = pulpReposResponse.data || [];

    await test.step('Validate existing pulp repositories count', async () => {
      expect(pulpReposResponse.data).toBeDefined();
      console.log('existingPulpRepos.length', existingPulpRepos.length);
      //   expect(existingPulpRepos.length).toBe(36);
      console.log(`Found ${existingPulpRepos.length} existing pulp fixture repositories`);
    });

    await test.step('Ensure pulp fixture repositories are created', async () => {
      for (const repo of existingPulpRepos) {
        if (repo.url && repo.name) {
          console.log(`Processing existing repository: ${repo.name} with URL: ${repo.url}`);

          // Create repository with snapshot enabled if it doesn't already exist in our organization
          try {
            await repositoriesApi.createRepository({
              apiRepositoryRequest: {
                snapshot: true,
                name: repo.name,
                url: repo.url,
              },
            });
            console.log(`Successfully created repository: ${repo.name}`);
          } catch (error) {
            console.log(`Repository ${repo.name} may already exist in organization: ${error}`);
          }
        }
      }
    });

    await test.step('Check that repositories are introspected and have valid status', async () => {
      // Reuse the existing pulp repositories data
      //   expect(existingPulpRepos.length).toBe(36);
      console.log(`Validating introspection status for ${existingPulpRepos.length} repositories`);

      let allReposValid = true;

      // Look for valid introspection status of pulp repos
      for (const repo of existingPulpRepos) {
        if (repo.uuid) {
          console.log(`Checking repository: ${repo.name}`);

          // Get detailed repository information
          const repoDetails = await repositoriesApi.getRepository({ uuid: repo.uuid });
          const lastSuccessIntrospectionTime = repoDetails.lastSuccessIntrospectionTime;

          try {
            // Check that repo has the snapshot flag
            expect(repo.snapshot).toBe(true);
            console.log(`✓ ${repo.name} has snapshot enabled`);
          } catch {
            console.error(`✗ ${repo.name} has no snapshot`);
            allReposValid = false;
          }

          try {
            // Check the status of the repo
            expect(['Pending', 'Valid']).toContain(repo.status);
            console.log(`✓ ${repo.name} status is ${repo.status}`);
          } catch {
            console.error(`✗ ${repo.name} is invalid with status: ${repo.status}`);
            allReposValid = false;
          }

          try {
            // Assert last introspection was today or yesterday
            if (lastSuccessIntrospectionTime) {
              const introspectionDate = lastSuccessIntrospectionTime.split('T')[0];
              expect([today, yesterday]).toContain(introspectionDate);
              console.log(`✓ ${repo.name} was introspected recently: ${introspectionDate}`);
            } else {
              throw new Error('No introspection time found');
            }
          } catch {
            console.error(`✗ ${repo.name} was not introspected in the last 24 hours`);
            allReposValid = false;
          }
        }
      }

      // After all repos are checked in the loop, then assert they all passed the checks
      expect(allReposValid).toBe(true);
      console.log('All repositories passed introspection validation');
    });
  });
});
