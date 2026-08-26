import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Beacon from './Beacon';
import { ReactQueryTestWrapper } from 'testingHelpers';

jest.mock('./hooks/useBeaconData', () => ({
  useBeaconData: jest.fn(),
}));

jest.mock('services/Lightwell/CustomerQueries', () => ({
  useCustomerIdsQuery: jest.fn(),
}));

jest.mock('services/Lightwell/BeaconQueries', () => ({
  useLtwlsuptTicketIdsQuery: jest.fn(),
}));

import { useBeaconData } from './hooks/useBeaconData';
import { useCustomerIdsQuery } from 'services/Lightwell/CustomerQueries';
import { useLtwlsuptTicketIdsQuery } from 'services/Lightwell/BeaconQueries';
import { mockVulnerabilities } from '../mockVulnerabilities';

const mockBeaconData = {
  vulnerabilities: mockVulnerabilities,
  meta: {
    count: mockVulnerabilities.length,
    criticalCount: mockVulnerabilities.filter((v) => v.severity === 'Critical').length,
    embargoCount: mockVulnerabilities.filter((v) => v.embargo).length,
    blockedCount: mockVulnerabilities.filter((v) => v.blocked).length,
    stageCounts: Object.fromEntries(
      mockVulnerabilities.reduce<Map<string, number>>((counts, vulnerability) => {
        counts.set(vulnerability.stage, (counts.get(vulnerability.stage) ?? 0) + 1);
        return counts;
      }, new Map()),
    ),
  },
};

const renderBeacon = () =>
  render(
    <ReactQueryTestWrapper>
      <Beacon />
    </ReactQueryTestWrapper>,
  );

beforeEach(() => {
  (useCustomerIdsQuery as jest.Mock).mockReturnValue({
    isLoading: false,
    data: ['CID-01', 'CID-214'],
  });

  (useBeaconData as jest.Mock).mockReturnValue({
    isLoading: false,
    isError: false,
    error: null,
    data: mockBeaconData,
  });

  (useLtwlsuptTicketIdsQuery as jest.Mock).mockReturnValue({
    isLoading: false,
    data: ['batch-1', 'batch-2'],
  });
});

it('renders the beacon page with status summary and vulnerability table', async () => {
  renderBeacon();

  await waitFor(() => {
    expect(screen.getByText('Beacon')).toBeInTheDocument();
  });

  expect(screen.getByText('Status Summary')).toBeInTheDocument();
  expect(screen.getByText('LWL-2026-4401')).toBeInTheDocument();
  expect(document.querySelector('.lightwell-filter-panel')).toBeInTheDocument();
  expect(screen.getByText('Customer ID')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'CID-01' })).toBeInTheDocument();
});

it('shows support ticket IDs from the dedicated API instead of vulnerability rows', async () => {
  (useLtwlsuptTicketIdsQuery as jest.Mock).mockReturnValue({
    isLoading: false,
    data: ['api-ticket'],
  });

  renderBeacon();

  await waitFor(() => {
    expect(screen.getByText('api-ticket')).toBeInTheDocument();
  });

  const filterPanel = document.querySelector('.lightwell-filter-panel');
  expect(filterPanel).not.toBeNull();
  expect(within(filterPanel as HTMLElement).getByText('api-ticket')).toBeInTheDocument();
  expect(within(filterPanel as HTMLElement).queryByText('batch-1')).not.toBeInTheDocument();
  expect(within(filterPanel as HTMLElement).queryByText('batch-2')).not.toBeInTheDocument();
});

it('clears the ticket filter when the customer changes and keeps other filters', async () => {
  const user = userEvent.setup();
  renderBeacon();

  const filterPanel = await waitFor(() => {
    const panel = document.querySelector('.lightwell-filter-panel');
    expect(panel).not.toBeNull();
    expect(within(panel as HTMLElement).getByText('batch-1')).toBeInTheDocument();
    return panel as HTMLElement;
  });

  await user.click(within(filterPanel).getByText('batch-1'));
  await user.click(within(filterPanel).getByText('Critical'));
  expect(within(filterPanel).getByRole('checkbox', { name: /batch-1/i })).toBeChecked();
  expect(within(filterPanel).getByRole('checkbox', { name: /critical/i })).toBeChecked();

  await user.click(screen.getByRole('button', { name: 'CID-01' }));
  await user.click(await screen.findByRole('menuitem', { name: 'CID-214' }));

  expect(screen.getByRole('button', { name: 'CID-214' })).toBeInTheDocument();
  expect(within(filterPanel).getByRole('checkbox', { name: /batch-1/i })).not.toBeChecked();
  expect(within(filterPanel).getByRole('checkbox', { name: /critical/i })).toBeChecked();
  expect(
    (useBeaconData as jest.Mock).mock.calls
      .filter(([customerId]) => customerId === 'CID-214')
      .every(([, filters]) => !filters?.ltwlsuptTicketIds?.length),
  ).toBe(true);
});

it('shows loading skeleton while data is fetching', () => {
  (useBeaconData as jest.Mock).mockReturnValue({
    isLoading: true,
    isError: false,
    error: null,
    data: undefined,
  });

  renderBeacon();

  expect(screen.getByText('Beacon')).toBeInTheDocument();
  expect(screen.getByText('Customer ID')).toBeInTheDocument();
  expect(screen.getByText('Filters')).toBeInTheDocument();
});

it('shows an empty state when the user has no visible customers', async () => {
  (useCustomerIdsQuery as jest.Mock).mockReturnValue({
    isLoading: false,
    data: [],
  });

  renderBeacon();

  await waitFor(() => {
    expect(screen.getByText('No customers available')).toBeInTheDocument();
  });

  expect(screen.getByText(/You do not have access to any customer IDs/i)).toBeInTheDocument();
  expect(screen.queryByText('Status Summary')).not.toBeInTheDocument();
});
