import { fireEvent, render, screen } from '@testing-library/react';
import { ReactQueryTestWrapper, defaultContentItem_Upload } from 'testingHelpers';
import { useNavigateTo } from 'Hooks/navigation/useNavigateTo';
import { useContentListOutletContext } from '../../ContentListTable';
import MarkAsPartnerModal from './MarkAsPartnerModal';

const markAsPartner = jest.fn();
const onClose = jest.fn();

jest.mock('react-router-dom', () => ({
  useParams: () => ({ repoUUID: defaultContentItem_Upload.uuid }),
}));

jest.mock('Hooks/navigation/useNavigateTo', () => ({
  useNavigateTo: jest.fn(),
}));

jest.mock('../../ContentListTable', () => ({
  useContentListOutletContext: jest.fn(),
}));

const mockOutletContext = useContentListOutletContext as jest.Mock;
const mockUseNavigateTo = useNavigateTo as jest.Mock;

beforeEach(() => {
  markAsPartner.mockClear();
  onClose.mockClear();
  mockUseNavigateTo.mockReturnValue(onClose);
  mockOutletContext.mockReturnValue({
    clearCheckedRepositories: jest.fn(),
    markAsPartner,
    isMarkingPartner: false,
    deletionContext: {},
  });
});

it('keeps confirm disabled until checkbox is checked, then calls markAsPartner and closes', () => {
  render(
    <ReactQueryTestWrapper>
      <MarkAsPartnerModal />
    </ReactQueryTestWrapper>,
  );

  const confirm = screen.getByRole('button', { name: 'Mark as partner repository' });
  expect(confirm).toBeDisabled();

  fireEvent.click(screen.getByLabelText('I understand that snapshots must be published manually.'));
  expect(confirm).toBeEnabled();

  fireEvent.click(confirm);
  expect(markAsPartner).toHaveBeenCalledWith({
    uuid: defaultContentItem_Upload.uuid,
    partner: true,
  });
  expect(onClose).toHaveBeenCalled();
});

it('keeps confirm disabled when isMarkingPartner is true', () => {
  mockOutletContext.mockReturnValue({
    clearCheckedRepositories: jest.fn(),
    markAsPartner,
    isMarkingPartner: true,
    deletionContext: {},
  });

  render(
    <ReactQueryTestWrapper>
      <MarkAsPartnerModal />
    </ReactQueryTestWrapper>,
  );

  fireEvent.click(screen.getByLabelText('I understand that snapshots must be published manually.'));

  const confirm = screen.getByRole('button', {
    name: /Mark as partner repository/,
  });
  expect(confirm).toBeDisabled();
});
