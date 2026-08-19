import axios from 'axios';

import { objectToUrlParams } from 'helpers';
import { LIGHTWELL_BEACON_USE_MOCK } from 'Pages/Lightwell/constants';
import {
  mockVulnerabilities,
  type Complexity,
  type Severity,
  type Stage,
  type Vulnerability,
} from 'Pages/Lightwell/mockVulnerabilities';

const VULNERABILITIES_PATH = '/api/content-sources/v1/lightwell/beacon/vulnerabilities/';
const PAGE_SIZE = 200;

export type BeaconVulnerabilityFlag = 'embargo' | 'duplicate' | 'blocked';

export type BeaconVulnerabilityFilters = {
  severities?: Severity[];
  stages?: Stage[];
  complexities?: Complexity[];
  ltwlsuptTicketIds?: string[];
  flags?: BeaconVulnerabilityFlag[];
};

export type BeaconPagination = {
  limit: number;
  offset: number;
};

export type BeaconVulnerabilityMeta = {
  count: number;
  criticalCount: number;
  embargoCount: number;
  blockedCount: number;
  stageCounts: Record<string, number>;
};

export type BeaconData = {
  vulnerabilities: Vulnerability[];
  meta: BeaconVulnerabilityMeta;
};

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
  blocked: boolean;
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

function mapSeverity(severity: string): Severity {
  if (severity === 'Low') {
    return 'Minor';
  }

  return severity as Severity;
}

function mapSeverityToApi(severity: Severity): string {
  return severity === 'Minor' ? 'Low' : severity;
}

function isVulnerabilityBlocked(stage: Stage, ageDays: number): boolean {
  return stage !== 'Lightwell Network' && ageDays > 30;
}

export function mapLightwellVulnerability(
  vulnerability: LightwellVulnerabilityResponse,
): Vulnerability {
  const ticketIds = vulnerability.ltwlsupt_ticket_ids ?? [];
  const stage = vulnerability.stage as Stage;

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
    stage,
    complexity: vulnerability.complexity as Complexity,
    submittedDate: formatDate(vulnerability.submitted_date),
    lastUpdated: formatDateTime(vulnerability.last_updated),
    ageDays: vulnerability.age_days,
    embargo: vulnerability.embargo,
    duplicate: vulnerability.duplicate,
    blocked:
      typeof vulnerability.blocked === 'boolean'
        ? vulnerability.blocked
        : isVulnerabilityBlocked(stage, vulnerability.age_days),
    duplicateOf: vulnerability.duplicate_of,
    ltwlsupt_ticket_ids: ticketIds,
    ltwlsupt_ticket_id: ticketIds[0],
  };
}

function mapCollectionMeta(
  meta: LightwellVulnerabilityCollectionResponse['meta'],
): BeaconVulnerabilityMeta {
  return {
    count: meta.count,
    criticalCount: meta.critical_count,
    embargoCount: meta.embargo_count,
    blockedCount: meta.blocked_count,
    stageCounts: meta.stage_counts ?? {},
  };
}

function buildVulnerabilityQueryParams(
  customerId: string,
  filters?: BeaconVulnerabilityFilters,
  pagination?: { limit: number; offset: number },
): Record<string, string> {
  const params: Record<string, string> = {
    customer_id: customerId,
    limit: (pagination?.limit ?? PAGE_SIZE).toString(),
    offset: (pagination?.offset ?? 0).toString(),
  };

  if (filters?.severities?.length) {
    params.severity = filters.severities.map(mapSeverityToApi).join(',');
  }
  if (filters?.stages?.length) {
    params.stage = filters.stages.join(',');
  }
  if (filters?.complexities?.length) {
    params.complexity = filters.complexities.join(',');
  }
  if (filters?.ltwlsuptTicketIds?.length) {
    params.ltwlsupt_ticket_id = filters.ltwlsuptTicketIds.join(',');
  }
  if (filters?.flags?.length) {
    params.flag = filters.flags.join(',');
  }

  return params;
}

function matchesMockFlags(vulnerability: Vulnerability, flags: BeaconVulnerabilityFlag[]): boolean {
  return flags.some((flag) => {
    if (flag === 'embargo') return vulnerability.embargo;
    if (flag === 'duplicate') return vulnerability.duplicate;
    return vulnerability.blocked;
  });
}

function filterMockVulnerabilities(
  vulnerabilities: Vulnerability[],
  filters?: BeaconVulnerabilityFilters,
): Vulnerability[] {
  return vulnerabilities.filter((vulnerability) => {
    if (
      filters?.severities?.length &&
      !filters.severities.includes(vulnerability.severity)
    ) {
      return false;
    }
    if (filters?.stages?.length && !filters.stages.includes(vulnerability.stage)) {
      return false;
    }
    if (
      filters?.complexities?.length &&
      !filters.complexities.includes(vulnerability.complexity)
    ) {
      return false;
    }
    if (filters?.ltwlsuptTicketIds?.length) {
      const ticketIds = vulnerability.ltwlsupt_ticket_ids?.length
        ? vulnerability.ltwlsupt_ticket_ids
        : vulnerability.ltwlsupt_ticket_id
          ? [vulnerability.ltwlsupt_ticket_id]
          : [];
      if (!ticketIds.some((ticketId) => filters.ltwlsuptTicketIds?.includes(ticketId))) {
        return false;
      }
    }
    if (filters?.flags?.length && !matchesMockFlags(vulnerability, filters.flags)) {
      return false;
    }
    return true;
  });
}

function computeMockMeta(vulnerabilities: Vulnerability[]): BeaconVulnerabilityMeta {
  const stageCounts: Record<string, number> = {};

  for (const vulnerability of vulnerabilities) {
    stageCounts[vulnerability.stage] = (stageCounts[vulnerability.stage] ?? 0) + 1;
  }

  return {
    count: vulnerabilities.length,
    criticalCount: vulnerabilities.filter((v) => v.severity === 'Critical').length,
    embargoCount: vulnerabilities.filter((v) => v.embargo).length,
    blockedCount: vulnerabilities.filter((v) => v.blocked).length,
    stageCounts,
  };
}

const MOCK_CUSTOMER_BATCHES: Record<string, string> = {
  'CID-01': 'batch-1',
  'CID-214': 'batch-2',
};

export const getVulnerabilities = async (
  customerId: string,
  filters?: BeaconVulnerabilityFilters,
  pagination?: BeaconPagination,
): Promise<BeaconData> => {
  if (LIGHTWELL_BEACON_USE_MOCK) {
    const batchId = MOCK_CUSTOMER_BATCHES[customerId];
    if (!batchId) {
      return {
        vulnerabilities: [],
        meta: computeMockMeta([]),
      };
    }

    const customerVulnerabilities = mockVulnerabilities.filter(
      (v) => v.ltwlsupt_ticket_id === batchId,
    );
    const filteredVulnerabilities = filterMockVulnerabilities(customerVulnerabilities, filters);
    const paginatedVulnerabilities = pagination
      ? filteredVulnerabilities.slice(
          pagination.offset,
          pagination.offset + pagination.limit,
        )
      : filteredVulnerabilities;

    return {
      vulnerabilities: paginatedVulnerabilities,
      meta: computeMockMeta(filteredVulnerabilities),
    };
  }

  if (pagination) {
    const { data } = await axios.get<LightwellVulnerabilityCollectionResponse>(
      `${VULNERABILITIES_PATH}?${objectToUrlParams(
        buildVulnerabilityQueryParams(customerId, filters, pagination),
      )}`,
    );

    return {
      vulnerabilities: data.data.map(mapLightwellVulnerability),
      meta: mapCollectionMeta(data.meta),
    };
  }

  const vulnerabilities: Vulnerability[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  let meta: BeaconVulnerabilityMeta = {
    count: 0,
    criticalCount: 0,
    embargoCount: 0,
    blockedCount: 0,
    stageCounts: {},
  };

  while (offset < total) {
    const { data } = await axios.get<LightwellVulnerabilityCollectionResponse>(
      `${VULNERABILITIES_PATH}?${objectToUrlParams(
        buildVulnerabilityQueryParams(customerId, filters, {
          limit: PAGE_SIZE,
          offset,
        }),
      )}`,
    );

    vulnerabilities.push(...data.data.map(mapLightwellVulnerability));
    meta = mapCollectionMeta(data.meta);
    total = data.meta.count;
    offset += data.data.length;

    if (data.data.length === 0) {
      break;
    }
  }

  return {
    vulnerabilities,
    meta,
  };
};
