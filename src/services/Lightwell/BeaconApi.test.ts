import axios from 'axios';

import {
  getLtwlsuptTicketIds,
  getVulnerabilities,
  mapLightwellVulnerability,
  type LightwellVulnerabilityCollectionResponse,
  type LightwellVulnerabilityResponse,
} from './BeaconApi';

const baseVulnerability: LightwellVulnerabilityResponse = {
  uuid: '00000000-0000-4000-8000-000000000001',
  vulnerability_id: 'LWL-2026-4401',
  purl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.17.1',
  component_name: 'log4j-core',
  package: 'log4j-core',
  component_version: '2.17.1',
  title: 'JNDI injection via crafted log message',
  cwe: 'CWE-917',
  description: 'Remote code execution through JNDI lookup in log messages',
  severity: 'Critical',
  cvss: 9.8,
  cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
  exploit_tested: true,
  reproducer_included: true,
  customer_priority: 'Priority 1',
  stage: 'Submitted',
  language: 'java',
  submitted_date: '2026-08-16T00:00:00Z',
  last_updated: '2026-08-17T08:17:00Z',
  age_days: 2,
  duplicate: false,
  ltwlsupt_ticket_ids: ['batch-2', 'batch-3'],
};

describe('mapLightwellVulnerability', () => {
  it('maps API fields to the beacon vulnerability shape', () => {
    const mapped = mapLightwellVulnerability(baseVulnerability);

    expect(mapped).toMatchObject({
      uuid: baseVulnerability.uuid,
      vulnerabilityId: 'LWL-2026-4401',
      componentName: 'log4j-core',
      severity: 'Critical',
      ecosystem: 'java',
      submittedDate: '2026-08-16',
      lastUpdated: '2026-08-17 08:17',
      ltwlsupt_ticket_ids: ['batch-2', 'batch-3'],
      ltwlsupt_ticket_id: 'batch-2',
    });
  });

  it('maps Low severity to Minor', () => {
    const mapped = mapLightwellVulnerability({
      ...baseVulnerability,
      severity: 'Low',
    });

    expect(mapped.severity).toBe('Minor');
  });
});

describe('getLtwlsuptTicketIds', () => {
  it('returns support ticket IDs from the API response', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { data: ['batch-1', 'batch-2'] },
    });

    await expect(getLtwlsuptTicketIds('CID-01')).resolves.toEqual(['batch-1', 'batch-2']);
    expect(get).toHaveBeenCalledWith(
      '/api/content-sources/v1/lightwell/beacon/vulnerabilities/ltwlsupt-ticket-ids/?customer_id=CID-01',
    );

    get.mockRestore();
  });
});

describe('getVulnerabilities', () => {
  const collection = (
    data: LightwellVulnerabilityResponse[],
    count: number,
    offset: number,
  ): LightwellVulnerabilityCollectionResponse => ({
    data,
    meta: {
      count,
      limit: 200,
      offset,
      critical_count: 0,
      stage_counts: {},
    },
  });

  it('fetches every filtered page when pagination is omitted', async () => {
    const first = { ...baseVulnerability, uuid: 'vuln-1', vulnerability_id: 'LWL-1' };
    const second = { ...baseVulnerability, uuid: 'vuln-2', vulnerability_id: 'LWL-2' };
    const get = jest
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({ data: collection([first], 2, 0) })
      .mockResolvedValueOnce({ data: collection([second], 2, 1) });

    const result = await getVulnerabilities('CID-01', { severities: ['Critical'] });

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/api/content-sources/v1/lightwell/beacon/vulnerabilities/?customer_id=CID-01&limit=200&offset=0&severity=Critical',
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/api/content-sources/v1/lightwell/beacon/vulnerabilities/?customer_id=CID-01&limit=200&offset=1&severity=Critical',
    );
    expect(result.vulnerabilities.map((v) => v.vulnerabilityId)).toEqual(['LWL-1', 'LWL-2']);
    expect(result.meta.count).toBe(2);

    get.mockRestore();
  });

  it('fetches a single page when pagination is provided', async () => {
    const get = jest.spyOn(axios, 'get').mockResolvedValue({
      data: collection([baseVulnerability], 40, 20),
    });

    const result = await getVulnerabilities('CID-01', undefined, { limit: 20, offset: 20 });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      '/api/content-sources/v1/lightwell/beacon/vulnerabilities/?customer_id=CID-01&limit=20&offset=20',
    );
    expect(result.vulnerabilities).toHaveLength(1);

    get.mockRestore();
  });
});
