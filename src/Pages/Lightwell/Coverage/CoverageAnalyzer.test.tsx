import { render, screen } from '@testing-library/react';

import CoverageAnalyzer from './CoverageAnalyzer';
import { useCoverageAnalysis } from './hooks/useCoverageAnalysis';
import { defaultCoverageReportItem, ReactQueryTestWrapper } from 'testingHelpers';
import type { ManifestUploadCardProps } from './components/ManifestUploadCard';
import { apiError, taskError } from './utils/errors';

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

const defaultUploadProps: ManifestUploadCardProps = {
  file: undefined,
  fileError: undefined,
  processError: undefined,
  validated: 'default',
  step: 'select',
  reportUUID: '',
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

  it('shows uploading step in progress while the file is uploading', () => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: 'manifest.json',
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        step: 'uploading',
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByRole('heading', { name: 'Analyzing your manifest...' })).toBeInTheDocument();
    expect(screen.getByText('Uploading manifest')).toBeInTheDocument();
    expect(screen.getByText('Preparing analysis report')).toBeInTheDocument();
    expect(screen.getByLabelText('In progress')).toBeInTheDocument();
    expect(screen.queryByLabelText('Complete')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Analyzing')).not.toBeInTheDocument();
  });

  it('shows preparing report in progress after upload succeeds', () => {
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: 'manifest.json',
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        step: 'analyzing',
        reportUUID: 'test-uuid',
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByLabelText('Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('In progress')).toBeInTheDocument();
  });

  it('shows the upload failure on the progress card', () => {
    const error = apiError('upload');
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: undefined,
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        step: 'error',
        processError: error,
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByRole('heading', { name: 'Analysis failed' })).toBeInTheDocument();
    expect(screen.getByText('Uploading manifest')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Failed')).toHaveLength(2);
    expect(screen.getByText(error.title)).toBeInTheDocument();
    expect(screen.getByText(error.description)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reupload file' })).toBeInTheDocument();
    expect(screen.queryByText('Please try again')).not.toBeInTheDocument();
  });

  it('shows the task error on the progress card after upload succeeds', () => {
    const error = taskError('Failed to parse manifest: unexpected EOF');
    (useCoverageAnalysis as jest.Mock).mockReturnValue({
      filename: 'manifest.json',
      report: undefined,
      uploadProps: {
        ...defaultUploadProps,
        step: 'error',
        reportUUID: 'test-uuid',
        processError: error,
      },
      startOver: jest.fn(),
    });

    renderCoverageAnalyzer();
    expect(screen.getByLabelText('Complete')).toBeInTheDocument();
    expect(screen.getByLabelText('Failed')).toBeInTheDocument();
    expect(screen.getByText(error.title)).toBeInTheDocument();
    expect(screen.getByText(error.description)).toBeInTheDocument();
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
      screen.getByText('Supported formats: CSV, CycloneDX, SPDX, pom.xml, requirements.txt'),
    ).toBeInTheDocument();
  });
});
