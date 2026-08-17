import Papa from 'papaparse';

import type {
  Complexity,
  CustomerPriority,
  Severity,
  Stage,
  Vulnerability,
} from '../../mockVulnerabilities';

export type ParsedVulnRow = {
  vulnerabilityId: string;
  purl: string;
  componentName: string;
  componentVersion: string;
  title: string;
  cwe: string;
  description: string;
  severity: Severity;
  cvss: number;
  cvssVector: string;
  exploitTested: boolean;
  reproducerIncluded: boolean;
  customerPriority: CustomerPriority | undefined;
};

function normalizeSeverity(raw: string): Severity {
  const upper = raw.trim().toUpperCase();
  if (upper === 'CRITICAL') return 'Critical';
  if (upper === 'HIGH' || upper === 'IMPORTANT') return 'Important';
  if (upper === 'MEDIUM' || upper === 'MODERATE') return 'Moderate';
  if (upper === 'LOW' || upper === 'MINOR') return 'Minor';
  return 'Moderate';
}

function normalizeYesNo(raw: string): boolean {
  return raw.trim().toLowerCase() === 'yes';
}

function normalizeCustomerPriority(raw: string): CustomerPriority | undefined {
  const trimmed = raw.trim();
  if (
    trimmed === 'Priority 1' ||
    trimmed === 'Priority 2' ||
    trimmed === 'Priority 3' ||
    trimmed === 'Priority 4'
  ) {
    return trimmed;
  }
  return undefined;
}

function parseCsvRows(content: string): string[][] {
  const { data, errors } = Papa.parse<string[]>(content.trim(), {
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    return [];
  }

  return data.filter((row) => row.some((cell) => cell.trim().length > 0));
}

export function parseVulnCsv(content: string): ParsedVulnRow[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idxId = header.indexOf('vulnerability_id');
  const idxPurl = header.findIndex((h) => h === 'purl' || h === 'packageurl');
  const idxName = header.indexOf('component_name');
  const idxVersion = header.indexOf('component_version');
  const idxTitle = header.indexOf('title');
  const idxCwe = header.findIndex((h) => h.startsWith('cwe'));
  const idxDesc = header.indexOf('description');
  const idxSev = header.findIndex((h) => h === 'severity' || h === 'cvss_severity');
  const idxCvss = header.findIndex((h) => h === 'cvss' || h === 'cvss_score');
  const idxCvssVector = header.findIndex((h) => h.includes('cvss_vector'));
  const idxExploit = header.findIndex((h) => h.includes('exploit_tested'));
  const idxReproducer = header.findIndex((h) => h.includes('reproducer_included'));
  const idxPriority = header.findIndex((h) => h.includes('customer_priority'));

  const parsed: ParsedVulnRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 3) continue;

    parsed.push({
      vulnerabilityId: cols[idxId]?.trim() || `UNKNOWN-${i}`,
      purl: (idxPurl >= 0 ? cols[idxPurl]?.trim() : '') || '',
      componentName: (idxName >= 0 ? cols[idxName]?.trim() : '') || '',
      componentVersion: (idxVersion >= 0 ? cols[idxVersion]?.trim() : '') || '',
      title: (idxTitle >= 0 ? cols[idxTitle]?.trim() : '') || '',
      cwe: (idxCwe >= 0 ? cols[idxCwe]?.trim() : '') || '',
      description: (idxDesc >= 0 ? cols[idxDesc]?.trim() : '') || '',
      severity: normalizeSeverity(idxSev >= 0 ? cols[idxSev] || '' : 'MEDIUM'),
      cvss: parseFloat((idxCvss >= 0 ? cols[idxCvss] : '') || '0') || 0,
      cvssVector: (idxCvssVector >= 0 ? cols[idxCvssVector]?.trim() : '') || '',
      exploitTested: idxExploit >= 0 ? normalizeYesNo(cols[idxExploit] || '') : false,
      reproducerIncluded: idxReproducer >= 0 ? normalizeYesNo(cols[idxReproducer] || '') : false,
      customerPriority:
        idxPriority >= 0 ? normalizeCustomerPriority(cols[idxPriority] || '') : undefined,
    });
  }

  return parsed;
}

const COMPLEXITIES: Complexity[] = [
  'Standard',
  'Complex',
  'Extensive',
  'Ecosystem Unavailable',
  "Won't Fix",
];

export function convertToVulnerabilities(rows: ParsedVulnRow[], batchId: string): Vulnerability[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowTimestamp = now.toISOString().replace('T', ' ').substring(0, 16);

  return rows.map((row, idx) => ({
    id: `${batchId}-${idx}`,
    vulnerabilityId: row.vulnerabilityId,
    purl: row.purl,
    componentName: row.componentName,
    componentVersion: row.componentVersion,
    title: row.title,
    cwe: row.cwe,
    description: row.description,
    severity: row.severity,
    cvss: row.cvss,
    cvssVector: row.cvssVector || undefined,
    exploitTested: row.exploitTested,
    reproducerIncluded: row.reproducerIncluded,
    customerPriority: row.customerPriority,
    stage: 'Submitted' as Stage,
    complexity: COMPLEXITIES[Math.floor(Math.random() * 3)],
    submittedDate: today,
    lastUpdated: nowTimestamp,
    ageDays: 0,
    embargo: false,
    duplicate: false,
    batchId,
  }));
}
