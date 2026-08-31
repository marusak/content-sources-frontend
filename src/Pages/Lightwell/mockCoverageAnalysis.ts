import type { CompletedCoverageReport } from 'services/Lightwell/CoverageReportsApi';
import type { ManifestUploadCardProps } from './Coverage/components/ManifestUploadCard';

export const MOCK_REPORT: CompletedCoverageReport = {
  uuid: 'mock-report',
  status: 'completed',
  created_at: '2026-08-18T00:00:00Z',
  completed_at: '2026-08-18T00:00:01Z',
  total: 2000,
  exact_matches: 1380,
  partial_matches: 340,
  unmatched: 280,
  ecosystem_coverage_summary: [
    { ecosystem: 'Java', total: 650, exact_matches: 450, partial_matches: 110, unmatched: 90 },
    { ecosystem: 'npm', total: 550, exact_matches: 380, partial_matches: 90, unmatched: 80 },
    { ecosystem: 'Python', total: 400, exact_matches: 270, partial_matches: 70, unmatched: 60 },
    { ecosystem: 'Rust', total: 200, exact_matches: 140, partial_matches: 40, unmatched: 20 },
    { ecosystem: 'Go', total: 150, exact_matches: 100, partial_matches: 20, unmatched: 30 },
    { ecosystem: 'NuGet', total: 50, exact_matches: 40, partial_matches: 10, unmatched: 0 },
  ],
};

const mockUploadProps: ManifestUploadCardProps = {
  file: undefined,
  fileError: undefined,
  processError: undefined,
  step: 'complete',
  reportUUID: 'mock-report',
  onDropAccepted: () => undefined,
  onRetry: () => undefined,
};

export const MOCK_ANALYSIS = {
  filename: 'Vuln-Report_2026-08-18.csv',
  report: MOCK_REPORT,
  uploadProps: mockUploadProps,
  startOver: () => undefined,
};
