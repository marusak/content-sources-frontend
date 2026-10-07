import { render, screen } from '@testing-library/react';

import { mockVulnerabilities } from '../../mockVulnerabilities';
import BeaconPdfTemplate from './BeaconPdfTemplate';

const meta = {
  count: mockVulnerabilities.length,
  criticalCount: 1,
  statusCounts: { Submitted: 1, Classified: 1 },
};

describe('BeaconPdfTemplate', () => {
  it('renders summary stats and vulnerability rows on the first page', () => {
    render(
      <BeaconPdfTemplate
        asyncData={{
          data: { vulnerabilities: mockVulnerabilities.slice(0, 2), meta },
        }}
        additionalData={{
          customerId: 'CID-01',
          generatedAt: '25 Aug 2026',
          includeSummary: true,
          visibleColumns: [
            { key: 'vulnerabilityId', title: 'Vulnerability ID' },
            { key: 'status', title: 'Status' },
          ],
          landscape: false,
        }}
      />,
    );

    expect(screen.getByText('Lightwell Vulnerability Report')).toBeInTheDocument();
    expect(document.querySelector('.beacon-pdf--portrait')).toBeInTheDocument();
    expect(screen.getByText(/Customer ID: CID-01/)).toBeInTheDocument();
    expect(screen.getByText(/Generated: 25 Aug 2026/)).toBeInTheDocument();
    expect(screen.getByText('By Status')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('No remediation')).toBeInTheDocument();
    const pipeline = screen.getByLabelText('Vulnerability counts by status');
    expect(pipeline).toHaveClass('beacon-pdf-pipeline');
    expect(pipeline.querySelectorAll('.beacon-pdf-status-card')).toHaveLength(5);
    expect(pipeline.querySelectorAll('.beacon-pdf-pipeline-arrow')).toHaveLength(4);
    expect(pipeline).toHaveTextContent('Submitted');
    expect(pipeline).toHaveTextContent('Lightwell Network');
    expect(pipeline).not.toHaveTextContent('No remediation');
    const vulnTable = screen.getByLabelText('Lightwell vulnerabilities');
    expect(vulnTable).not.toHaveClass('pf-m-grid-md', 'pf-m-grid-lg');
    const vulnRow = screen.getByText('LWL-2026-4401').closest('tr');
    expect(vulnRow).toHaveTextContent('Submitted');
    expect(vulnRow?.querySelector('.beacon-pdf-status-reason')).not.toBeInTheDocument();
    expect(vulnRow?.querySelectorAll('td')).toHaveLength(2);
  });

  it('prints a resolution reason under the status', () => {
    const reason = 'The vulnerable code is not present in this package at this version.';

    render(
      <BeaconPdfTemplate
        asyncData={{
          data: {
            vulnerabilities: [
              {
                ...mockVulnerabilities[0],
                status: 'Unremediated',
                resolutionReason: reason,
              },
            ],
            meta: { ...meta, statusCounts: { Unremediated: 1 } },
          },
        }}
        additionalData={{
          includeSummary: true,
          visibleColumns: [
            { key: 'vulnerabilityId', title: 'Vulnerability ID' },
            { key: 'status', title: 'Status' },
          ],
        }}
      />,
    );

    const noRemediationStat = screen
      .getByText('No remediation', { selector: '.beacon-pdf-stat-label' })
      .closest('.beacon-pdf-stat');
    expect(noRemediationStat).toHaveTextContent('1');

    const statusCell = screen
      .getByText('LWL-2026-4401')
      .closest('tr')
      ?.querySelector('[data-label="Status"]');
    expect(statusCell).toHaveTextContent('No remediation');
    expect(statusCell?.querySelector('.beacon-pdf-status-reason')).toHaveTextContent(reason);
  });

  it('omits the cover summary on continuation pages', () => {
    render(
      <BeaconPdfTemplate
        asyncData={{
          data: { vulnerabilities: mockVulnerabilities.slice(0, 1), meta },
        }}
        additionalData={{
          customerId: 'CID-01',
          generatedAt: '25 Aug 2026',
          includeSummary: false,
          visibleColumns: [{ key: 'vulnerabilityId', title: 'Vulnerability ID' }],
          landscape: true,
        }}
      />,
    );

    expect(screen.queryByText('Lightwell Vulnerability Report')).not.toBeInTheDocument();
    expect(document.querySelector('.beacon-pdf--landscape')).toBeInTheDocument();
    expect(screen.getByText('Vulnerabilities (continued)')).toBeInTheDocument();
    expect(screen.getByText('LWL-2026-4401')).toBeInTheDocument();
  });

  it('renders published versions as a comma-separated list and is empty when none exist', () => {
    render(
      <BeaconPdfTemplate
        asyncData={{
          data: {
            vulnerabilities: [
              mockVulnerabilities[4],
              { ...mockVulnerabilities[0], publishedVersions: [] },
            ],
            meta,
          },
        }}
        additionalData={{
          customerId: 'CID-214',
          generatedAt: '25 Aug 2026',
          includeSummary: false,
          visibleColumns: [
            { key: 'vulnerabilityId', title: 'Vulnerability ID' },
            { key: 'publishedVersions', title: 'Published Versions' },
          ],
        }}
      />,
    );

    const publishedRow = screen.getByText('LWL-2026-4001').closest('tr');
    expect(publishedRow).toHaveTextContent('1.10.1.rhlw-00002, 1.10.0.rhlw-00001');

    const emptyRow = screen.getByText('LWL-2026-4401').closest('tr');
    expect(emptyRow?.querySelector('[data-label="Published Versions"]')).toHaveTextContent('');
  });
});
