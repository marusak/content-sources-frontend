import { render, screen } from '@testing-library/react';

import CoverageAnalyzer from './CoverageAnalyzer';
import { useCoverageAnalysis } from './hooks/useCoverageAnalysis';
import { defaultCoverageReportItem, ReactQueryTestWrapper } from 'testingHelpers';

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
      report: defaultCoverageReportItem,
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

  it('shows upload instructions and supported formats when no report exists', () => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: undefined,
      report: undefined,
      uploadProps: defaultUploadProps,
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByText('Lightwell Lens')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Upload your SBOM or package manifest to assess your stack against the Lightwell Network catalog.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Supports: CycloneDX, SPDX, pom.xml, requirements.txt'),
    ).toBeInTheDocument();
  });

  it('shows analyzing state with updated copy when upload is in progress', () => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: undefined,
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        isLoading: true,
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByText('Analyzing your manifest...')).toBeInTheDocument();
    expect(
      screen.getByText('Matching packages against the Lightwell Network catalog.'),
    ).toBeInTheDocument();
  });
});
