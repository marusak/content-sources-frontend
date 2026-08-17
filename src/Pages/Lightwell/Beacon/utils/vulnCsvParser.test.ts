import { parseVulnCsv } from './vulnCsvParser';

describe('parseVulnCsv', () => {
  it('parses quoted fields with embedded commas and escaped quotes', () => {
    const csv = [
      'vulnerability_id,title,description,severity,cvss',
      'CVE-2024-0001,"Broken, title","Says ""quoted"" text",CRITICAL,9.8',
    ].join('\n');

    const rows = parseVulnCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].vulnerabilityId).toBe('CVE-2024-0001');
    expect(rows[0].title).toBe('Broken, title');
    expect(rows[0].description).toBe('Says "quoted" text');
    expect(rows[0].severity).toBe('Critical');
    expect(rows[0].cvss).toBe(9.8);
  });
});
