import { test, expect, RepositoriesApi, SnapshotsApi } from 'test-utils';
import { RHSMClient } from './helpers/rhsmClient';

test.describe('No Cross Organization Access', () => {
  test.skip(
    !process.env.INTEGRATION,
    'Skipping as the INTEGRATION environment variable is not set to true.',
  );

  let client: RHSMClient;
  const containerName = 'no-cross-org-test-container';

  test.beforeEach(async () => {
    client = new RHSMClient(containerName);
  });

  test.afterEach(async () => {
    // Clean up container after each test
    if (client) {
      await client.Destroy('sm');
    }
  });

  test('Using a RHEL9 container, obtain identity certificate and test cross-org repository access', async () => {
    await test.step('Start new RHEL9 container', async () => {
      const bootResult = await client.Boot('rhel9');
      console.log('Container started:', bootResult);
    });

    await test.step('Register to obtain consumer identity certificate', async () => {
      const noSubsActivationKey = process.env.NO_SUBS_USER_ACTIVATION_KEY;
      const noSubsOrgId = process.env.NO_SUBS_USER_ORG_ID;

      console.log('Attempting registration with NO_SUBS_USER credentials to get identity cert');
      const registerResult = await client.RegisterSubMan(noSubsActivationKey, noSubsOrgId);
      console.log('Registration completed with NO_SUBS_USER credentials');
      console.log('Registration exit code:', registerResult?.exitCode);

      const identityCertCheck = await client.Exec(['ls', '/etc/pki/consumer/cert.pem'], 5000);
      const identityKeyCheck = await client.Exec(['ls', '/etc/pki/consumer/key.pem'], 5000);
      if (identityCertCheck?.exitCode !== 0 || identityKeyCheck?.exitCode !== 0) {
        console.log('Identity certificate not obtained');
        console.log('Identity cert check exit code:', identityCertCheck?.exitCode);
        console.log('Identity key check exit code:', identityKeyCheck?.exitCode);
        throw new Error('Identity certificate is required for cross-org access testing');
      }
      console.log('Identity certificate obtained');

      expect(registerResult?.exitCode).toBe(0);
    });

    await test.step('Get identity certificate from /etc/pki/consumer directory', async () => {
      const listResult = await client.Exec(['ls', '-la', '/etc/pki/consumer/'], 10000);

      if (listResult?.exitCode !== 0) {
        console.log('Directory /etc/pki/consumer/ does not exist or is inaccessible');
        throw new Error('Consumer certificate directory not found');
      }
      expect(listResult?.exitCode).toBe(0);

      const certResult = await client.Exec(['ls', '/etc/pki/consumer/cert.pem'], 10000);
      const keyResult = await client.Exec(['ls', '/etc/pki/consumer/key.pem'], 10000);
      console.log('Identity cert check exit code:', certResult?.exitCode);
      console.log('Identity key check exit code:', keyResult?.exitCode);

      if (certResult?.exitCode !== 0 || keyResult?.exitCode !== 0) {
        console.log('Identity certificate or key not found');
        console.log('Identity cert check exit code:', certResult?.exitCode);
        console.log('Identity key check exit code:', keyResult?.exitCode);
        throw new Error('Identity certificate and key are required for cross-org access testing');
      }
      expect(certResult?.exitCode).toBe(0);
      expect(keyResult?.exitCode).toBe(0);

      console.log('Identity certificate and key found');

      const certContent = await client.Exec(['cat', '/etc/pki/consumer/cert.pem'], 10000);
      console.log(
        'Identity certificate content preview:',
        certContent?.stdout?.substring(0, 200) + '...',
      );

      expect(certContent?.exitCode).toBe(0);
      expect(certContent?.stdout).toContain('-----BEGIN CERTIFICATE-----');
      expect(certContent?.stdout).toContain('-----END CERTIFICATE-----');
      console.log('Valid identity certificate found');
    });

    await test.step('Test cross-org repository access using identity certificate', async () => {
      const certResult = await client.Exec(['ls', '/etc/pki/consumer/cert.pem'], 10000);
      const keyResult = await client.Exec(['ls', '/etc/pki/consumer/key.pem'], 10000);

      if (certResult?.exitCode !== 0 || keyResult?.exitCode !== 0) {
        console.log('Identity certificate or key not found');
        console.log('Identity cert check exit code:', certResult?.exitCode);
        console.log('Identity key check exit code:', keyResult?.exitCode);
        throw new Error('Identity certificate and key are required for cross-org access testing');
      }
      expect(certResult?.exitCode).toBe(0);
      expect(keyResult?.exitCode).toBe(0);

      console.log('Using identity certificate for cross-org access testing');

      const curlResult = await client.Exec(
        [
          'curl',
          '--cert',
          '/etc/pki/consumer/cert.pem',
          '--key',
          '/etc/pki/consumer/key.pem',
          '--cacert',
          '/etc/rhsm/ca/redhat-uep.pem', // Use RHSM CA cert for verification
          '-s',
          '-w',
          'HTTP_CODE:%{http_code}',
          'https://cdn.redhat.com/content/dist/rhel/server/7/7Server/x86_64/os/repodata/repomd.xml',
        ],
        30000,
      );

      const httpCodeMatch = curlResult?.stdout?.match(/HTTP_CODE:(\d+)/);
      if (httpCodeMatch) {
        const httpCode = parseInt(httpCodeMatch[1]);
        console.log('HTTP response code with identity cert:', httpCode);
        expect([403, 404]).toContain(httpCode);
        console.log(`Cross-org access properly denied with HTTP ${httpCode}`);
      } else {
        console.log(`CURL exit code ${curlResult?.exitCode}`);
        console.log('CURL stderr:', curlResult?.stderr);
        expect(curlResult?.exitCode).toBeDefined();
      }

      console.log('Cross-org access testing completed');
    });
  });

  test('Search for a repository and test snapshot access with NO_SUBS_USER', async ({ client }) => {
    test.skip(
      !process.env.STABLE_SAM_TOKEN ||
        !process.env.STABLE_SAM_USERNAME ||
        !process.env.STABLE_SAM_PASSWORD,
      'Skipping as stable_sam user credentials or token are not configured.',
    );
    const repositoriesApi = new RepositoriesApi(client);
    const snapshotsApi = new SnapshotsApi(client);

    let repoUuid: string;
    let lastSnapshotUuid: string;

    await test.step('Search for repository in stable_sam account', async () => {
      const targetUrl = 'https://yum.theforeman.org/pulpcore/3.4/el7/x86_64/';

      const repositoriesResponse = await repositoriesApi.listRepositories(
        { search: targetUrl },
        {
          headers: {
            Authorization: process.env.STABLE_SAM_TOKEN || '',
          },
        },
      );

      expect(repositoriesResponse.data).toBeDefined();
      expect(repositoriesResponse.data!.length).toBeGreaterThan(0);

      const targetRepo = repositoriesResponse.data!.find((repo) => repo.url === targetUrl);
      expect(targetRepo).toBeDefined();
      expect(targetRepo!.uuid).toBeDefined();

      repoUuid = targetRepo!.uuid!;
      console.log('Found repository with UUID:', repoUuid);

      expect(targetRepo!.snapshot).toBe(true);
      console.log('Repository has snapshot enabled');
    });

    await test.step('Read the repository and get the last snapshot UUID', async () => {
      const snapshotsResponse = await snapshotsApi.listSnapshotsForRepo(
        {
          uuid: repoUuid,
          sortBy: '-created_at', // Sort by creation date descending to get latest first
          limit: 1,
        },
        {
          headers: {
            Authorization: process.env.STABLE_SAM_TOKEN || '',
          },
        },
      );

      expect(snapshotsResponse.data).toBeDefined();
      expect(snapshotsResponse.data!.length).toBeGreaterThan(0);

      const lastSnapshot = snapshotsResponse.data![0];
      expect(lastSnapshot.uuid).toBeDefined();

      lastSnapshotUuid = lastSnapshot.uuid!;
      console.log('Found last snapshot UUID:', lastSnapshotUuid);
      console.log('Snapshot created at:', lastSnapshot.createdAt);
    });

    await test.step('Assert that NO_SUBS_USER cannot read the snapshot using the UUID', async () => {
      try {
        await snapshotsApi.listSnapshotsForRepo(
          {
            uuid: repoUuid,
            limit: 1,
          },
          {
            headers: {
              Authorization: process.env.NO_SUBS_TOKEN || '',
            },
          },
        );

        throw new Error('NO_SUBS_USER should not have access to stable_sam snapshots');
      } catch (error: unknown) {
        // Expect the request to fail with authorization error
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Expected error when NO_SUBS_USER tries to access snapshot:', errorMessage);

        const status =
          (error as { status?: number; response?: { status?: number } }).status ||
          (error as { status?: number; response?: { status?: number } }).response?.status;
        expect([404]).toContain(status);
        console.log('NO_SUBS_USER correctly denied access to snapshot');
      }
    });
  });
});
