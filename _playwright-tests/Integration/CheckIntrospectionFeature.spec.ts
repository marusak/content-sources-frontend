import { test, expect, RepositoriesApi } from 'test-utils';

test.describe('Verify Repository Introspection Feature with pulp repo', () => {
  test.use({
    storageState: '.auth/stable_sam.json',
    extraHTTPHeaders: process.env.STABLE_SAM_TOKEN
      ? { Authorization: process.env.STABLE_SAM_TOKEN }
      : {},
  });
  test('Verify Repository Introspection Feature with pulp repo', async ({ client }) => {
    const repositoriesApi = new RepositoriesApi(client);
    const pulpReposResponse = await repositoriesApi.listRepositories({
      search: 'fixtures.pulpproject.org',
    });

    // need only 1 repo
    const existingPulpRepo = pulpReposResponse.data?.[0];
    expect(existingPulpRepo).toBeDefined();
    // Check if status is Valid, or if introspection happened within 24 hours
    if (existingPulpRepo) {
      const current_time = new Date();
      const twentyFourHoursAgo = new Date(current_time.getTime() - 24 * 60 * 60 * 1000);

      if (existingPulpRepo.status != 'Valid') {
        expect(existingPulpRepo.lastSuccessIntrospectionTime).toBeDefined();
        const lastIntrospection = new Date(existingPulpRepo.lastSuccessIntrospectionTime!);
        expect(lastIntrospection.getTime()).toBeGreaterThanOrEqual(twentyFourHoursAgo.getTime());
      } else {
        expect(existingPulpRepo.status).toBe('Valid');
      }
    }
  });
});
