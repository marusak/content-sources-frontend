import { render, screen, waitFor } from '@testing-library/react';

import Beacon from './Beacon';
import { ReactQueryTestWrapper } from 'testingHelpers';

jest.mock('./hooks/useBeaconData', () => ({
  useBeaconData: jest.fn(),
}));

import { useBeaconData } from './hooks/useBeaconData';
import { mockVulnerabilities } from '../mockVulnerabilities';

const renderBeacon = () =>
  render(
    <ReactQueryTestWrapper>
      <Beacon />
    </ReactQueryTestWrapper>,
  );

beforeEach(() => {
  (useBeaconData as jest.Mock).mockReturnValue({
    isLoading: false,
    isError: false,
    error: null,
    data: {
      vulnerabilities: mockVulnerabilities,
    },
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
});
