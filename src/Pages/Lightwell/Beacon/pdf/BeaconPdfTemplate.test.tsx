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
    const pipeline = screen.getByLabelText('Vulnerability counts by status');
    expect(pipeline).toHaveClass('beacon-pdf-pipeline');
    expect(pipeline.querySelectorAll('.beacon-pdf-status-card')).toHaveLength(5);
    expect(pipeline.querySelectorAll('.beacon-pdf-pipeline-arrow')).toHaveLength(4);
    expect(pipeline).toHaveTextContent('Submitted');
    expect(pipeline).toHaveTextContent('Lightwell Network');
    const vulnTable = screen.getByLabelText('Lightwell vulnerabilities');
    expect(vulnTable).not.toHaveClass('pf-m-grid-md', 'pf-m-grid-lg');
    const vulnRow = screen.getByText('LWL-2026-4401').closest('tr');
    expect(vulnRow).toHaveTextContent('Submitted');
    expect(vulnRow?.querySelectorAll('td')).toHaveLength(2);
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
});
