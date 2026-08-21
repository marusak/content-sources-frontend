import type { Vulnerability } from '../types';
import {
  getVulnerabilityColumnValue,
  type VulnerabilityTableColumn,
} from './vulnerabilityTableColumns';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildVulnerabilityPdfHtml(
  vulnerabilities: Vulnerability[],
  title: string,
  columns: Pick<VulnerabilityTableColumn, 'key' | 'title'>[],
): string {
  const stageGroups = new Map<string, number>();
  const severityGroups = new Map<string, number>();

  for (const vulnerability of vulnerabilities) {
    stageGroups.set(vulnerability.stage, (stageGroups.get(vulnerability.stage) || 0) + 1);
    severityGroups.set(
      vulnerability.severity,
      (severityGroups.get(vulnerability.severity) || 0) + 1,
    );
  }

  const totalAge = vulnerabilities.reduce((sum, vulnerability) => sum + vulnerability.ageDays, 0);
  const avgAge = vulnerabilities.length > 0 ? Math.round(totalAge / vulnerabilities.length) : 0;
  const blockedCount = vulnerabilities.filter((vulnerability) => vulnerability.blocked).length;

  const stageRows = [...stageGroups]
    .map(([stage, count]) => `<tr><td>${escapeHtml(stage)}</td><td>${count}</td></tr>`)
    .join('');
  const severityRows = [...severityGroups]
    .map(([severity, count]) => `<tr><td>${escapeHtml(severity)}</td><td>${count}</td></tr>`)
    .join('');

  const headerCells = columns.map((column) => `<th>${escapeHtml(column.title)}</th>`).join('');
  const bodyRows = vulnerabilities
    .map((vulnerability) => {
      const cells = columns
        .map(
          (column) =>
            `<td>${escapeHtml(getVulnerabilityColumnValue(column.key, vulnerability))}</td>`,
        )
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <html><head><title>${escapeHtml(title)}</title>
    <style>
      body { font-family: 'Red Hat Text', sans-serif; padding: 40px; color: #151515; }
      h1 { color: #EE0000; }
      h2 { margin-top: 24px; }
      table { border-collapse: collapse; width: 100%; margin-top: 12px; }
      th, td { border: 1px solid #D2D2D2; padding: 8px 12px; text-align: left; font-size: 12px; }
      th { background: #F0F0F0; }
      .summary { display: flex; gap: 24px; margin: 16px 0; }
      .stat { text-align: center; }
      .stat-value { font-size: 28px; font-weight: bold; }
      .stat-label { font-size: 12px; color: #6A6E73; }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
    <div class="summary">
      <div class="stat"><div class="stat-value">${vulnerabilities.length}</div><div class="stat-label">Total Vulnerabilities</div></div>
      <div class="stat"><div class="stat-value">${avgAge}d</div><div class="stat-label">Avg Age</div></div>
      <div class="stat"><div class="stat-value">${blockedCount}</div><div class="stat-label">Blocked</div></div>
    </div>
    <h2>By Stage</h2>
    <table><tr><th>Stage</th><th>Count</th></tr>${stageRows}</table>
    <h2>By Severity</h2>
    <table><tr><th>Severity</th><th>Count</th></tr>${severityRows}</table>
    <h2>All Vulnerabilities</h2>
    <table>
      <tr>${headerCells}</tr>
      ${bodyRows}
    </table>
    </body></html>`;
}

export function exportToPdf(
  vulnerabilities: Vulnerability[],
  title: string,
  columns: Pick<VulnerabilityTableColumn, 'key' | 'title'>[],
): void {
  const html = buildVulnerabilityPdfHtml(vulnerabilities, title, columns);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
