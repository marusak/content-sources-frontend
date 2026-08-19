import axios from 'axios';

import { objectToUrlParams } from 'helpers';
import { LIGHTWELL_BEACON_USE_MOCK } from 'Pages/Lightwell/constants';
import { mockVulnerabilities, type Vulnerability } from 'Pages/Lightwell/mockVulnerabilities';

const VULNERABILITIES_PATH = '/api/content-sources/v1/lightwell/beacon/vulnerabilities/';
const PAGE_SIZE = 200;

export type LightwellVulnerabilityResponse = {
  uuid: string;
  vulnerability_id: string;
  purl?: string;
  component_name: string;
  package: string;
  component_version: string;
  title?: string;
  cwe?: string;
  description?: string;
  severity: string;
  cvss?: number;
  cvss_vector?: string;
  exploit_tested: boolean;
  reproducer_included: boolean;
  customer_priority?: string;
  stage: string;
  language?: string;
  complexity: string;
  submitted_date: string;
  last_updated: string;
  age_days: number;
  embargo: boolean;
  duplicate: boolean;
  duplicate_of?: string;
  ltwlsupt_ticket_ids: string[];
};

export type LightwellVulnerabilityCollectionResponse = {
  data: LightwellVulnerabilityResponse[];
  meta: {
    count: number;
    limit: number;
    offset: number;
    critical_count: number;
    embargo_count: number;
    blocked_count: number;
    stage_counts: Record<string, number>;
  };
};

function formatDate(value: string): string {
  return value.split('T')[0];
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace('T', ' ').slice(0, 16);
  }

  const pad = (part: number) => part.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mapSeverity(severity: string): Vulnerability['severity'] {
  if (severity === 'Low') {
    return 'Minor';
  }

  return severity as Vulnerability['severity'];
}

export function mapLightwellVulnerability(
  vulnerability: LightwellVulnerabilityResponse,
): Vulnerability {
  const ticketIds = vulnerability.ltwlsupt_ticket_ids ?? [];

  return {
    uuid: vulnerability.uuid,
    vulnerabilityId: vulnerability.vulnerability_id,
    purl: vulnerability.purl ?? '',
    componentName: vulnerability.component_name,
    componentVersion: vulnerability.component_version,
    title: vulnerability.title ?? '',
    cwe: vulnerability.cwe ?? '',
    description: vulnerability.description ?? '',
    severity: mapSeverity(vulnerability.severity),
    cvss: vulnerability.cvss ?? 0,
    cvssVector: vulnerability.cvss_vector,
    exploitTested: vulnerability.exploit_tested,
    reproducerIncluded: vulnerability.reproducer_included,
    customerPriority: vulnerability.customer_priority as Vulnerability['customerPriority'],
    stage: vulnerability.stage as Vulnerability['stage'],
    complexity: vulnerability.complexity as Vulnerability['complexity'],
    submittedDate: formatDate(vulnerability.submitted_date),
    lastUpdated: formatDateTime(vulnerability.last_updated),
    ageDays: vulnerability.age_days,
    embargo: vulnerability.embargo,
    duplicate: vulnerability.duplicate,
    duplicateOf: vulnerability.duplicate_of,
    ltwlsupt_ticket_ids: ticketIds,
    ltwlsupt_ticket_id: ticketIds[0],
  };
}

const MOCK_CUSTOMER_BATCHES: Record<string, string> = {
  'CID-01': 'batch-1',
  'CID-214': 'batch-2',
};

export const getVulnerabilities = async (customerId: string): Promise<Vulnerability[]> => {
  if (LIGHTWELL_BEACON_USE_MOCK) {
    const batchId = MOCK_CUSTOMER_BATCHES[customerId];
    if (!batchId) {
      return [];
    }

    return mockVulnerabilities.filter((v) => v.ltwlsupt_ticket_id === batchId);
  }

  const vulnerabilities: Vulnerability[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const { data } = await axios.get<LightwellVulnerabilityCollectionResponse>(
      `${VULNERABILITIES_PATH}?${objectToUrlParams({
        customer_id: customerId,
        limit: PAGE_SIZE.toString(),
        offset: offset.toString(),
      })}`,
    );

    vulnerabilities.push(...data.data.map(mapLightwellVulnerability));
    total = data.meta.count;
    offset += data.data.length;

    if (data.data.length === 0) {
      break;
    }
  }

  return vulnerabilities;
};
