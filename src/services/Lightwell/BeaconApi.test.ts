import { mapLightwellVulnerability, type LightwellVulnerabilityResponse } from './BeaconApi';

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
  complexity: 'Extensive',
  submitted_date: '2026-08-16T00:00:00Z',
  last_updated: '2026-08-17T08:17:00Z',
  age_days: 2,
  embargo: true,
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
