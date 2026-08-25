import type { Vulnerability } from '../types';

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'object') {
    return csvCell(JSON.stringify(value));
  }
  return csvCell(String(value));
}

function csvKeys(vulnerabilities: Vulnerability[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  for (const vulnerability of vulnerabilities) {
    for (const key of Object.keys(vulnerability)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }

  return keys;
}

export function buildVulnerabilityCsv(vulnerabilities: Vulnerability[]): string {
  const keys = csvKeys(vulnerabilities);
  if (keys.length === 0) {
    return '';
  }

  const rows = vulnerabilities.map((vulnerability) => {
    const record = vulnerability as unknown as Record<string, unknown>;
    return keys.map((key) => csvValue(record[key])).join(',');
  });

  return [keys.map(csvCell).join(','), ...rows].join('\n');
}

export function exportToCsv(vulnerabilities: Vulnerability[], filename: string): void {
  const csv = buildVulnerabilityCsv(vulnerabilities);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToJson(vulnerabilities: Vulnerability[], filename: string): void {
  const json = JSON.stringify(vulnerabilities, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
