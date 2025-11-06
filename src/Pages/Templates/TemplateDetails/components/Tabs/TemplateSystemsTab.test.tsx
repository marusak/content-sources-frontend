import { render, screen } from '@testing-library/react';
import { useListSystemsByTemplateId } from 'services/Systems/SystemsQueries';
import TemplateSystemsTab from './TemplateSystemsTab';
import { defaultTemplateSystemsListItem } from 'testingHelpers';
import type { IDSystemItem } from 'services/Systems/SystemsApi';
import { useAppContext } from 'middleware/AppContext';
import useHasRegisteredSystems from 'Hooks/useHasRegisteredSystems';
import { ADD_ROUTE, SYSTEMS_ROUTE, TEMPLATES_ROUTE } from 'Routes/constants';
import { AssignmentMethods } from '../AssignTemplateModal/components/AssignmentMethodSelect';

const templateUUID = 'banana-uuid';
const mockRootPath = 'insights/content';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ templateUUID: templateUUID }),
  useNavigate: jest.fn(),
  Outlet: () => <></>,
}));

jest.mock('dayjs', () => (value) => ({ fromNow: () => value }));

jest.mock('Hooks/useRootPath', () => () => mockRootPath);

jest.mock('Hooks/useHasRegisteredSystems');

jest.mock('react-query');

jest.mock('services/Systems/SystemsQueries', () => ({
  useListSystemsByTemplateId: jest.fn(),
  useDeleteTemplateFromSystems: () => ({ mutate: () => undefined, isLoading: false }),
}));

jest.mock('middleware/AppContext');

(useAppContext as jest.Mock).mockImplementation(() => ({
  rbac: { templateWrite: true },
  subscriptions: { red_hat_enterprise_linux: true },
}));

(useHasRegisteredSystems as jest.Mock).mockReturnValue({
  hasRegisteredSystems: true,
  isFetchingRegSystems: false,
  isErrorFetchingRegSystems: false,
});

(useListSystemsByTemplateId as jest.Mock).mockImplementation(() => ({
  isLoading: false,
  isFetching: false,
  isError: false,
  data: {
    data: new Array(15).fill(defaultTemplateSystemsListItem).map((item: IDSystemItem, index) => ({
      ...item,
      inventory_id: item.inventory_id + index,
      attributes: {
        ...item.attributes,
        display_name: item.attributes.display_name + index,
      },
    })),
    meta: { total_items: 15, limit: 20, offset: 0 },
  },
}));

it('renders system list with selectable checkboxes when user has write permissions', async () => {
  const { queryByText, getByRole } = render(<TemplateSystemsTab />);

  // Ensure the first row renders
  expect(
    queryByText(defaultTemplateSystemsListItem.attributes.display_name + 0),
  ).toBeInTheDocument();

  // Ensure the first row has a checkbox
  expect(getByRole('checkbox', { name: 'Select row 0' })).toBeInTheDocument();

  // Ensure the last row renders
  expect(
    queryByText(defaultTemplateSystemsListItem.attributes.display_name + 14),
  ).toBeInTheDocument();
});

it('renders system list as read-only with disabled checkboxes when user lacks write permissions', async () => {
  (useAppContext as jest.Mock).mockImplementation(() => ({ rbac: { templateWrite: false } }));

  const { queryByText, getByRole, queryByRole, getAllByRole } = render(<TemplateSystemsTab />);

  // Ensure the first row renders
  expect(
    queryByText(defaultTemplateSystemsListItem.attributes.display_name + 0),
  ).toBeInTheDocument();

  // Ensure the first row does not have a checkbox
  expect(queryByRole('checkbox', { name: 'Select row 0' })).not.toBeInTheDocument();

  // Ensure top kebab is disabled.
  expect(getByRole('button', { name: 'plain kebab' })).toHaveAttribute('disabled');

  // Ensure the row kebab is disabled
  expect(getAllByRole('button', { name: 'Kebab toggle' })[0]).toHaveAttribute('disabled');

  // Ensure the last row renders
  expect(
    queryByText(defaultTemplateSystemsListItem.attributes.display_name + 14),
  ).toBeInTheDocument();
});

it("shows empty state with register action when there are no registered systems that match the template's requirements", async () => {
  (useListSystemsByTemplateId as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    isFetching: false,
    isError: false,
  }));

  (useHasRegisteredSystems as jest.Mock).mockReturnValue({
    hasRegisteredSystems: false,
    isFetchingRegSystems: false,
    isErrorFetchingRegSystems: false,
  });

  render(<TemplateSystemsTab />);

  expect(await screen.findByText('No associated systems')).toBeInTheDocument();
  expect(
    await screen.findByText(
      'To get started, assign this template to a system. You have no registered systems yet.',
    ),
  ).toBeInTheDocument();
  expect(await screen.findByText('Register and assign via API'));
});

it('shows empty state with both assign and register actions when compatible, registered systems are present', async () => {
  (useListSystemsByTemplateId as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    isFetching: false,
    isError: false,
  }));

  (useHasRegisteredSystems as jest.Mock).mockReturnValue({
    hasRegisteredSystems: true,
    isFetchingRegSystems: false,
    isErrorFetchingRegSystems: false,
  });

  render(<TemplateSystemsTab />);

  const assignAction = await screen.findByRole('button', { name: 'Assign to systems' });
  expect(assignAction).toBeInTheDocument();

  const expectedHref = `${mockRootPath}/${TEMPLATES_ROUTE}/${templateUUID}/${SYSTEMS_ROUTE}/${ADD_ROUTE}?method=${AssignmentMethods.ApiRegistration}`;

  const registerAction = await screen.findByRole('link', { name: 'Register and assign via API' });
  expect(registerAction).toBeInTheDocument();
  expect(registerAction).toHaveAttribute('href', expectedHref);
});
