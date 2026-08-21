import type { Vulnerability } from '../types';

export function exportToCsv(vulnerabilities: Vulnerability[], filename: string): void {
  const headers = [
    'Vulnerability ID',
    'Component',
    'Version',
    'Title',
    'CWE',
    'Severity',
    'CVSS',
    'CVSS Vector',
    'Stage',
    'Complexity',
    'Age (days)',
    'Exploit Tested',
    'Reproducer Included',
    'Customer Priority',
    'Embargo',
    'Duplicate',
  ];

  const rows = vulnerabilities.map((v) => [
    v.vulnerabilityId,
    v.componentName,
    v.componentVersion,
    `"${v.title.replace(/"/g, '""')}"`,
    v.cwe,
    v.severity,
    v.cvss.toString(),
    v.cvssVector || '',
    v.stage,
    v.complexity,
    v.ageDays.toString(),
    v.exploitTested ? 'Yes' : 'No',
    v.reproducerIncluded ? 'Yes' : 'No',
    v.customerPriority || '',
    v.embargo ? 'Yes' : 'No',
    v.duplicate ? `Yes (${v.duplicateOf || ''})` : 'No',
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

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

export function exportToPdf(vulnerabilities: Vulnerability[], title: string): void {
  const stageGroups = new Map<string, number>();
  const severityGroups = new Map<string, number>();

  for (const v of vulnerabilities) {
    stageGroups.set(v.stage, (stageGroups.get(v.stage) || 0) + 1);
    severityGroups.set(v.severity, (severityGroups.get(v.severity) || 0) + 1);
  }

  const totalAge = vulnerabilities.reduce((sum, v) => sum + v.ageDays, 0);
  const avgAge = vulnerabilities.length > 0 ? Math.round(totalAge / vulnerabilities.length) : 0;
  const blockedCount = vulnerabilities.filter((v) => v.blocked).length;

  let html = `
    <html><head><title>${title}</title>
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
    <h1>${title}</h1>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
    <div class="summary">
      <div class="stat"><div class="stat-value">${vulnerabilities.length}</div><div class="stat-label">Total Vulnerabilities</div></div>
      <div class="stat"><div class="stat-value">${avgAge}d</div><div class="stat-label">Avg Age</div></div>
      <div class="stat"><div class="stat-value">${blockedCount}</div><div class="stat-label">Blocked</div></div>
    </div>
    <h2>By Stage</h2><table><tr><th>Stage</th><th>Count</th></tr>`;

  for (const [stage, count] of stageGroups) {
    html += `<tr><td>${stage}</td><td>${count}</td></tr>`;
  }

  html += `</table><h2>By Severity</h2><table><tr><th>Severity</th><th>Count</th></tr>`;

  for (const [sev, count] of severityGroups) {
    html += `<tr><td>${sev}</td><td>${count}</td></tr>`;
  }

  html += `</table><h2>All Vulnerabilities</h2><table>
    <tr><th>ID</th><th>Component</th><th>Severity</th><th>Stage</th><th>Age</th><th>Complexity</th></tr>`;

  for (const v of vulnerabilities) {
    html += `<tr><td>${v.vulnerabilityId}</td><td>${v.componentName} ${v.componentVersion}</td><td>${v.severity}</td><td>${v.stage}</td><td>${v.ageDays}d</td><td>${v.complexity}</td></tr>`;
  }

  html += `</table></body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
}
