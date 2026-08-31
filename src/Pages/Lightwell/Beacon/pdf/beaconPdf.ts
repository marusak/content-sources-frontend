import type { VulnerabilityTableColumn } from '../utils/vulnerabilityTableColumns';

export function formatBeaconPdfGeneratedAt(date: Date = new Date()): string {
  const day = date.getUTCDate();
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

export type BeaconPdfColumn = Pick<VulnerabilityTableColumn, 'key' | 'title'>;

/** Approximate character widths used to pick portrait vs landscape. */
export const COLUMN_PDF_WIDTH: Record<string, number> = {
  vulnerabilityId: 14,
  component: 22,
  lastUpdated: 16,
  stage: 16,
  severity: 10,
  cvss: 6,
  cvssVector: 28,
  repository: 10,
  batch: 16,
  age: 14,
  flags: 14,
  title: 28,
  complexity: 16,
  customerPriority: 14,
};

export const DEFAULT_COLUMN_PDF_WIDTH = 12;
/** A4 portrait comfortably fits the default 4 columns (~68) plus a couple of compact extras. */
export const PORTRAIT_MAX_PDF_WIDTH = 96;
export const LANDSCAPE_MIN_COLUMN_COUNT = 7;

export function shouldUseLandscapePdf(columns: BeaconPdfColumn[]): boolean {
  if (columns.length >= LANDSCAPE_MIN_COLUMN_COUNT) {
    return true;
  }

  const width = columns.reduce(
    (sum, column) => sum + (COLUMN_PDF_WIDTH[column.key] ?? DEFAULT_COLUMN_PDF_WIDTH),
    0,
  );
  return width > PORTRAIT_MAX_PDF_WIDTH;
}
