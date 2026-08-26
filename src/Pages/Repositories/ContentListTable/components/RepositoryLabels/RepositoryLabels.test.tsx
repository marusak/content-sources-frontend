import { render, screen } from '@testing-library/react';
import { RepositoryLabels } from './RepositoryLabels';
import { ContentOrigin } from 'services/Content/ContentApi';

jest.mock('middleware/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    features: { partnerrepos: { enabled: false, accessible: false } },
  })),
}));

it('shows Upload and in-progress labels when marking as partner', () => {
  render(
    <RepositoryLabels origin={ContentOrigin.UPLOAD} isRepoBeingMarkedAsPartner isPartner={false} />,
  );

  expect(screen.getByText('Upload')).toBeInTheDocument();
  expect(screen.getByText('Marking as Partnered in progress')).toBeInTheDocument();
});

it('shows Upload and Partnered labels when partner', () => {
  render(
    <RepositoryLabels origin={ContentOrigin.UPLOAD} isRepoBeingMarkedAsPartner={false} isPartner />,
  );

  expect(screen.getByText('Upload')).toBeInTheDocument();
  expect(screen.getByText('Partnered')).toBeInTheDocument();
  expect(screen.queryByText('Marking as Partnered in progress')).not.toBeInTheDocument();
});

it('shows Partnered when both marking and partner are true', () => {
  render(<RepositoryLabels origin={ContentOrigin.UPLOAD} isRepoBeingMarkedAsPartner isPartner />);

  expect(screen.getByText('Partnered')).toBeInTheDocument();
  expect(screen.queryByText('Marking as Partnered in progress')).not.toBeInTheDocument();
});

it('shows Community label for COMMUNITY origin when partnerrepos is off', () => {
  render(
    <RepositoryLabels
      origin={ContentOrigin.COMMUNITY}
      isRepoBeingMarkedAsPartner={false}
      isPartner={false}
    />,
  );

  expect(screen.getByText('Community')).toBeInTheDocument();
});
