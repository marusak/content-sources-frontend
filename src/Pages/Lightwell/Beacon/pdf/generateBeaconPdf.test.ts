import { PDFDocument, PageSizes } from 'pdf-lib';

import { mockVulnerabilities } from '../../mockVulnerabilities';
import {
  createDefaultVulnerabilityColumns,
  getVisibleVulnerabilityColumns,
} from '../utils/vulnerabilityTableColumns';
import { generateBeaconPdf } from './generateBeaconPdf';

const meta = {
  count: mockVulnerabilities.length,
  criticalCount: mockVulnerabilities.filter(
    (vulnerability) => vulnerability.severity === 'Critical',
  ).length,
  embargoCount: mockVulnerabilities.filter((vulnerability) => vulnerability.embargo).length,
  blockedCount: mockVulnerabilities.filter((vulnerability) => vulnerability.blocked).length,
  stageCounts: { Submitted: 1, Classified: 1 },
};

describe('generateBeaconPdf', () => {
  const visibleColumns = [
    { key: 'vulnerabilityId', title: 'Vulnerability ID' },
    { key: 'stage', title: 'Status' },
  ];

  it('creates a portrait PDF with the report title', async () => {
    const bytes = await generateBeaconPdf({
      customerId: 'CID-01',
      visibleColumns,
      vulnerabilities: mockVulnerabilities.slice(0, 2),
      meta,
      generatedAt: '25 Aug 2026',
    });

    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getTitle()).toBe('Lightwell Vulnerability Report');
    const page = doc.getPages()[0];
    expect(page.getWidth()).toBeCloseTo(PageSizes.A4[0], 1);
    expect(page.getHeight()).toBeCloseTo(PageSizes.A4[1], 1);
  });

  it('uses landscape pages when many columns are visible', async () => {
    const manyColumns = [
      ...getVisibleVulnerabilityColumns(createDefaultVulnerabilityColumns()),
      { key: 'severity', title: 'Severity' },
      { key: 'cvss', title: 'CVSS' },
      { key: 'repository', title: 'Language' },
    ];

    const bytes = await generateBeaconPdf({
      customerId: 'CID-01',
      visibleColumns: manyColumns,
      vulnerabilities: mockVulnerabilities.slice(0, 1),
      meta,
      generatedAt: '25 Aug 2026',
    });

    const doc = await PDFDocument.load(bytes);
    const page = doc.getPages()[0];
    expect(page.getWidth()).toBeCloseTo(PageSizes.A4[1], 1);
    expect(page.getHeight()).toBeCloseTo(PageSizes.A4[0], 1);
  });

  it('splits long tables across continuation pages', async () => {
    const vulnerabilities = Array.from({ length: 80 }, (_, index) => ({
      ...mockVulnerabilities[0],
      uuid: `vuln-${index}`,
      vulnerabilityId: `LWL-2026-${4000 + index}`,
    }));

    const bytes = await generateBeaconPdf({
      customerId: 'CID-01',
      visibleColumns,
      vulnerabilities,
      meta: { ...meta, count: vulnerabilities.length },
      generatedAt: '25 Aug 2026',
    });

    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
