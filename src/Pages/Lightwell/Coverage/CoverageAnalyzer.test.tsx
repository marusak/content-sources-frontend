import { render, screen } from '@testing-library/react';

import CoverageAnalyzer from './CoverageAnalyzer';
import { useCoverageAnalysis } from './hooks/useCoverageAnalysis';
import { ReactQueryTestWrapper } from 'testingHelpers';
import type { CompletedCoverageReport } from 'services/Lightwell/CoverageReportsApi';

jest.mock('./hooks/useCoverageAnalysis');

// Charts are not under test here, no-op mocks keep the focus on text and button assertions
jest.mock('@patternfly/react-charts/victory', () => ({
  ChartDonut: () => null,
  ChartLabel: () => null,
  Chart: () => null,
  ChartAxis: () => null,
  ChartBar: () => null,
  ChartStack: () => null,
  ChartTooltip: () => null,
}));

const defaultUploadProps = {
  file: undefined,
  fileError: undefined,
  processError: undefined,
  validated: 'default' as const,
  isLoading: false,
  onDropAccepted: jest.fn(),
  onClearClick: jest.fn(),
  onRetry: jest.fn(),
};

const completedReport: CompletedCoverageReport = {
  uuid: 'test-uuid',
  created_at: '2026-08-18T12:00:00Z',
  status: 'completed',
  exact_matches: 60,
  partial_matches: 15,
  unmatched: 25,
  total: 100,
  completed_at: '2026-08-18T12:01:00Z',
  ecosystem_coverage_summary: [
    { ecosystem: 'Java (Maven)', exact_matches: 30, partial_matches: 10, unmatched: 10, total: 50 },
    { ecosystem: 'Python (PyPI)', exact_matches: 20, partial_matches: 5, unmatched: 10, total: 35 },
    { ecosystem: 'npm', exact_matches: 10, partial_matches: 0, unmatched: 5, total: 15 },
  ],
};

const renderCoverageAnalyzer = () =>
  render(
    <ReactQueryTestWrapper>
      <CoverageAnalyzer />
    </ReactQueryTestWrapper>,
  );

describe('CoverageAnalyzer', () => {
  beforeEach(() => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: 'test-sbom.json',
      report: completedReport,
      uploadProps: defaultUploadProps,
      startOver: jest.fn(),
    });
  });

  it('shows "New analysis" when a report is complete', () => {
    renderCoverageAnalyzer();
    expect(screen.getByRole('button', { name: 'New analysis' })).toBeInTheDocument();
  });

  it('displays the match analysis title and manifest filename', () => {
    renderCoverageAnalyzer();
    expect(
      screen.getByRole('heading', { name: 'Match analysis for manifest test-sbom.json' }),
    ).toBeInTheDocument();
  });

  it('displays coverage summary with in-network percentage and match counts', () => {
    renderCoverageAnalyzer();
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: /75% of packages match the Lightwell Network catalog/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Exact match')).toBeInTheDocument();
    expect(screen.getByText('Partial match')).toBeInTheDocument();
  });

  it('displays ecosystem breakdown with package counts', () => {
    renderCoverageAnalyzer();
    expect(screen.getByText('By Ecosystem')).toBeInTheDocument();
    const paragraphs = screen.getAllByRole('paragraph');
    expect(paragraphs.some((p) => p.textContent?.includes('75 of 100 packages'))).toBe(true);
  });

  it('shows filename and inline error when file format is invalid', () => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: undefined,
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        file: new File([''], 'report.pdf'),
        fileError: 'Could not detect format. Please check your file.',
        validated: 'error' as const,
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByDisplayValue('report.pdf')).toBeInTheDocument();
    expect(
      screen.getByText('Could not detect format. Please check your file.'),
    ).toBeInTheDocument();
  });

  it('shows error state with "Reupload file" button on process error', () => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: undefined,
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        processError: 'Could not upload your file',
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByText('Could not upload your file')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reupload file' })).toBeInTheDocument();
  });
});
