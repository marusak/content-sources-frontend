import { test, expect, RepositoriesApi, FeaturesApi } from 'test-utils';

/**
 * Pulp Fixture Repository Introspection Test using stable_sam_stage user
 * This test validates that existing Pulp project fixture repositories can be successfully
 * introspected via the API. The stable_sam_stage user already has access to these repositories.
 * Need to pass headers to the API calls to authenticate the request.
 */

test.describe('Pulp Fixture Repository Introspection', () => {
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
      const features = await featuresApi.listFeatures({
        headers: {
          Authorization: process.env.STABLE_SAM_STAGE_TOKEN || '',
        },
      });

      // Check if snapshots feature exists
      expect(features.snapshots).toBeDefined();
      // Check if snapshots are accessible
      expect(features.snapshots?.accessible).toBe(true);
      // Assert that snapshots are enabled
      expect(features.snapshots?.enabled).toBe(true);
    });

    // Get pulp repositories once and reuse across steps
    const pulpReposResponse = await repositoriesApi.listRepositories(
      { search: 'fixtures.pulpproject.org' },
      {
        headers: {
          Authorization: process.env.STABLE_SAM_STAGE_TOKEN || '',
        },
      },
    );
    const existingPulpRepos = pulpReposResponse.data || [];

    await test.step('Validate existing pulp repositories count', async () => {
      expect(pulpReposResponse.data).toBeDefined();
      expect(existingPulpRepos.length).toBe(36);
    });

    await test.step('Check that repositories are introspected and have valid status', async () => {
      let allReposValid = true;

      // Look for valid introspection status of pulp repos
      for (const repo of existingPulpRepos) {
        const lastSuccessIntrospectionTime = repo.lastSuccessIntrospectionTime;

        try {
          // Check that repo has the snapshot flag
          expect(repo.snapshot).toBe(true);
        } catch {
          allReposValid = false;
        }

        try {
          // Check the status of the repo
          expect(['Pending', 'Valid']).toContain(repo.status);
        } catch {
          allReposValid = false;
        }

        try {
          // Assert last introspection was today or yesterday
          if (lastSuccessIntrospectionTime) {
            const introspectionDate = lastSuccessIntrospectionTime.split('T')[0];
            expect([today, yesterday]).toContain(introspectionDate);
          } else {
            throw new Error('No introspection time found');
          }
        } catch {
          allReposValid = false;
        }
      }

      // After all repos are checked in the loop, then assert they all passed the checks
      expect(allReposValid).toBe(true);
    });
  });
});
