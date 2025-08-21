import { test, expect, RepositoriesApi, FeaturesApi } from 'test-utils';

/**
 * Pulp Fixture Repository Introspection Test using stable_sam_stage user
 * This test validates that existing Pulp project fixture repositories can be successfully
 * introspected via the API. The stable_sam_stage user already has access to these repositories.
 */

test.describe('Pulp Fixture Repository Introspection', () => {
  test.use({
    storageState: '.auth/stable-sam-stage-user.json',
    extraHTTPHeaders: process.env.STABLE_SAM_STAGE_TOKEN
      ? { Authorization: process.env.STABLE_SAM_STAGE_TOKEN }
      : {},
  });

  test('should check snapshot support for stable_sam_stage user', async ({ client }) => {
    await test.step('Check if stable_sam_stage user has snapshot support', async () => {
      const featuresApi = new FeaturesApi(client);
      const features = await featuresApi.listFeatures();

      console.log('Available features:', Object.keys(features));

      // Check if snapshots feature exists
      expect(features.snapshots).toBeDefined();

      // Check if snapshots are accessible - if not, skip the test
      if (!features.snapshots?.accessible) {
        test.skip(true, 'This account does not support snapshots.');
      }

      // Assert that snapshots are enabled
      expect(features.snapshots?.enabled).toBe(true);

      console.log(
        `Snapshots feature - accessible: ${features.snapshots?.accessible}, enabled: ${features.snapshots?.enabled}`,
      );
    });
  });

  test('should validate existing repositories with stable_sam_stage user', async ({ client }) => {
    await test.step('Get existing repositories for stable_sam_stage user', async () => {
      const repositoriesApi = new RepositoriesApi(client);
      const response = await repositoriesApi.listRepositories({
        search: 'pulpproject.org',
      });

      expect(response.data).toBeDefined();

      const repositories = response.data || [];
      console.log(`Found ${repositories.length} Pulp repositories`);
      expect(repositories.length).toBe(36);
    });
  });

  test('should verify introspection is completed and status is valid with stable_sam_stage user', async ({
    client,
  }) => {
    await test.step('Check that repositories are introspected and have valid status', async () => {
      const repositoriesApi = new RepositoriesApi(client);
      const response = await repositoriesApi.listRepositories({});

      expect(response.data).toBeDefined();
      const repositories = response.data || [];
      expect(repositories.length).toBeGreaterThan(0);

      // Prefer Pulp fixture repositories if available
      const testRepo =
        repositories.find((repo) => repo.url?.includes('fixtures.pulpproject.org')) ||
        repositories[0];

      console.log(`Checking introspection status for: ${testRepo.name} with stable_sam_stage user`);

      if (testRepo.uuid) {
        // Get detailed repository information to check status
        const repoDetails = await repositoriesApi.getRepository({ uuid: testRepo.uuid });

        // Assert that introspection is completed and status is valid
        expect(repoDetails).toBeDefined();
        expect(repoDetails.status).toBe('valid');

        console.log(`Repository ${testRepo.name} has valid status: ${repoDetails.status}`);
      }
    });
  });
});
