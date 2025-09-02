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
    const repositoriesApi = new RepositoriesApi(client);
    const featuresApi = new FeaturesApi(client);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await test.step('Check if stable_sam_stage user has snapshot support', async () => {
      const features = await featuresApi.listFeatures({
        headers: {
          Authorization: process.env.STABLE_SAM_STAGE_TOKEN || '',
        },
      });

      expect(features.snapshots).toBeDefined();
      expect(features.snapshots?.accessible).toBe(true);
      expect(features.snapshots?.enabled).toBe(true);
    });

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
      // Look for valid introspection status of pulp repos
      for (const repo of existingPulpRepos) {
        const lastSuccessIntrospectionTime = repo.lastSuccessIntrospectionTime;

        expect(repo.snapshot).toBe(true);

        expect(['Pending', 'Valid']).toContain(repo.status);

        // Assert last introspection was today or yesterday
        if (lastSuccessIntrospectionTime) {
          const introspectionDate = lastSuccessIntrospectionTime.split('T')[0];
          expect([today, yesterday]).toContain(introspectionDate);
        } else {
          throw new Error('No introspection time found');
        }
      }
    });
  });
});
