import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertVariant } from '@patternfly/react-core';

import { ExportMenu } from './ExportMenu';
import { getVulnerabilities } from 'services/Lightwell/BeaconApi';
import { generateBeaconPdf, downloadPdf } from '../pdf/generateBeaconPdf';

jest.mock('services/Lightwell/BeaconApi', () => {
  const actual = jest.requireActual('services/Lightwell/BeaconApi');
  return {
    ...actual,
    getVulnerabilities: jest.fn(),
  };
});

jest.mock('Hooks/useErrorNotification', () => ({
  __esModule: true,
  default: () => jest.fn(),
}));

jest.mock('Hooks/useNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../pdf/generateBeaconPdf', () => ({
  generateBeaconPdf: jest.fn(),
  downloadPdf: jest.fn(),
}));

import useNotification from 'Hooks/useNotification';

const notify = jest.fn();
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const beaconData = {
  vulnerabilities: [
    {
      uuid: '00000000-0000-4000-8000-000000000001',
      vulnerabilityId: 'LWL-2026-4401',
    },
  ],
  meta: {
    count: 1,
    criticalCount: 1,
    embargoCount: 0,
    blockedCount: 0,
    stageCounts: { Submitted: 1 },
  },
};

beforeEach(() => {
  (useNotification as jest.Mock).mockReturnValue({ notify });
  notify.mockClear();
  (getVulnerabilities as jest.Mock).mockReset();
  (generateBeaconPdf as jest.Mock).mockReset();
  (downloadPdf as jest.Mock).mockReset();
  (getVulnerabilities as jest.Mock).mockResolvedValue(beaconData);
  (generateBeaconPdf as jest.Mock).mockResolvedValue(pdfBytes);
});

describe('ExportMenu PDF', () => {
  it('generates a PDF with pdf-lib from the filtered vulnerabilities', async () => {
    const user = userEvent.setup();
    const visibleColumns = [{ key: 'vulnerabilityId', title: 'Vulnerability ID' }];
    render(<ExportMenu customerId='CID-01' visibleColumns={visibleColumns} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(screen.getByRole('menuitem', { name: 'Export as PDF' }));

    await waitFor(() => {
      expect(generateBeaconPdf).toHaveBeenCalledTimes(1);
    });
    expect(getVulnerabilities).toHaveBeenCalledWith('CID-01', undefined);
    expect(generateBeaconPdf).toHaveBeenCalledWith({
      customerId: 'CID-01',
      visibleColumns,
      vulnerabilities: beaconData.vulnerabilities,
      meta: beaconData.meta,
    });
    expect(downloadPdf).toHaveBeenCalledWith(pdfBytes, 'lightwell-beacon-CID-01.pdf');
  });

  it('closes the menu and shows generating feedback while the PDF is in progress', async () => {
    let resolvePdf: (value: Uint8Array) => void = () => undefined;
    (generateBeaconPdf as jest.Mock).mockReturnValue(
      new Promise<Uint8Array>((resolve) => {
        resolvePdf = resolve;
      }),
    );

    const user = userEvent.setup();
    render(
      <ExportMenu
        customerId='CID-01'
        visibleColumns={[{ key: 'vulnerabilityId', title: 'Vulnerability ID' }]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.click(screen.getByRole('menuitem', { name: 'Export as PDF' }));

    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: 'Export as PDF' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Exporting' })).toBeDisabled();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: AlertVariant.info,
        title: 'Generating PDF',
      }),
    );

    resolvePdf(pdfBytes);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled();
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: AlertVariant.success,
        title: 'PDF ready',
      }),
    );
    expect(downloadPdf).toHaveBeenCalledWith(pdfBytes, 'lightwell-beacon-CID-01.pdf');
  });
});
