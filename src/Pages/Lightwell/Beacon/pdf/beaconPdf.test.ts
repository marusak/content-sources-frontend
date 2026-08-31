import { formatBeaconPdfGeneratedAt, shouldUseLandscapePdf } from './beaconPdf';
import {
  createDefaultVulnerabilityColumns,
  getVisibleVulnerabilityColumns,
} from '../utils/vulnerabilityTableColumns';

describe('formatBeaconPdfGeneratedAt', () => {
  it('formats the generated date as a UTC display date', () => {
    expect(formatBeaconPdfGeneratedAt(new Date('2026-08-25T22:58:00Z'))).toBe('25 Aug 2026');
  });
});

describe('shouldUseLandscapePdf', () => {
  const visibleColumns = getVisibleVulnerabilityColumns(createDefaultVulnerabilityColumns());

  it('uses portrait for the default column set and landscape when columns are wide or many', () => {
    expect(shouldUseLandscapePdf(visibleColumns)).toBe(false);
    expect(
      shouldUseLandscapePdf([
        { key: 'vulnerabilityId', title: 'Vulnerability ID' },
        { key: 'stage', title: 'Status' },
      ]),
    ).toBe(false);

    const wideColumns = [
      ...visibleColumns,
      { key: 'title', title: 'Title' },
      { key: 'cvssVector', title: 'CVSS Vector' },
    ];
    expect(shouldUseLandscapePdf(wideColumns)).toBe(true);

    const manyColumns = [
      ...visibleColumns,
      { key: 'severity', title: 'Severity' },
      { key: 'cvss', title: 'CVSS' },
      { key: 'repository', title: 'Language' },
    ];
    expect(manyColumns).toHaveLength(7);
    expect(shouldUseLandscapePdf(manyColumns)).toBe(true);
  });
});
