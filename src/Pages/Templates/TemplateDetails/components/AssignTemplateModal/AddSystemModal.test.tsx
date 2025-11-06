import { render, waitFor, screen, within } from '@testing-library/react';
import AddSystemModal from './AddSystemModal';
import { useQueryClient } from 'react-query';
import { useSystemsListQuery } from 'services/Systems/SystemsQueries';
import {
  defaultSystemsListItem,
  defaultTemplateItem,
  defaultUpdateTemplateTaskCompleted,
  minorReleaseSystemsListItem,
} from 'testingHelpers';
import type { SystemItem } from 'services/Systems/SystemsApi';

const bananaUUID = 'banana-uuid';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ templateUUID: bananaUUID }),
  useNavigate: jest.fn(),
}));

jest.mock('Hooks/useRootPath', () => () => 'someUrl');

jest.mock('react-query');

beforeAll(() => {
  (useQueryClient as jest.Mock).mockImplementation(() => ({
    getQueryData: () => ({
      version: 1,
      name: 'Steve the template',
      arch: 'x86_64',
      last_update_task: defaultUpdateTemplateTaskCompleted,
    }),
  }));
});

jest.mock('services/Systems/SystemsQueries', () => ({
  useSystemsListQuery: jest.fn(),
  useAddTemplateToSystemsQuery: () => ({ mutate: () => undefined, isLoading: false }),
}));

jest.mock('middleware/AppContext', () => ({
  useAppContext: () => ({ rbac: { templateWrite: true } }),
}));

(useSystemsListQuery as jest.Mock).mockImplementation(() => ({
  isLoading: false,
  isFetching: false,
  isError: false,
  data: undefined,
}));

jest.mock('Hooks/useNotification', () => () => ({ notify: () => null }));

jest.mock('services/Templates/TemplateQueries', () => ({
  useFetchTemplate: () => ({ data: defaultTemplateItem }),
}));

it('shows blank state when no systems are present', async () => {
  const { queryByText } = render(<AddSystemModal />);

  await waitFor(() =>
    expect(
      queryByText('It appears as though you have no systems registered for the associated OS.'),
    ).toBeInTheDocument(),
  );
});

it('renders systems list and pre-selects systems already assigned to template', async () => {
  (useSystemsListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    isFetching: false,
    isError: false,
    data: {
      data: new Array(15).fill(defaultSystemsListItem).map((item: SystemItem, index) => ({
        ...item,
        id: item.id + index,
        attributes: {
          ...item.attributes,
          display_name: item.attributes.display_name + index,
          template_uuid: !index ? bananaUUID : item.attributes.template_uuid,
        },
      })),
      meta: { total_items: 15, limit: 20, offset: 0 },
    },
  }));

  const { queryByText, getByRole } = render(<AddSystemModal />);
  expect(queryByText('No relevant systems')).not.toBeInTheDocument();
  expect(queryByText('14867.host.example.com14')).toBeInTheDocument();
  // ensure first item is pre-selected
  expect(getByRole('checkbox', { name: 'Select row 0', checked: true })).toBeInTheDocument();
  expect(getByRole('checkbox', { name: 'Select row 1', checked: false })).toBeInTheDocument();
});

it('prevents selection of systems with minor release versions and shows warning icon', async () => {
  (useSystemsListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    isFetching: false,
    isError: false,
    data: {
      data: [defaultSystemsListItem, minorReleaseSystemsListItem],
      meta: { total_items: 2, limit: 20, offset: 0 },
    },
  }));

  render(<AddSystemModal />);

  await waitFor(() => {
    expect(screen.getAllByRole('row')).toHaveLength(3); // 1 header + 2 data rows
  });

  expect(screen.getByText('14867.host.example.com')).toBeInTheDocument();
  expect(screen.getByText('40098.host.example.com')).toBeInTheDocument();

  expect(screen.getByRole('checkbox', { name: 'Select row 0' })).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeDisabled();

  // Warning icon should be present for minor release system
  const warningIcon = screen.getByTestId('system-list-warning-icon');
  expect(warningIcon).toBeInTheDocument();

  // Verify the warning icon is in the same row as the minor release system
  expect(
    within(warningIcon.closest('tr')!).getByText('40098.host.example.com'),
  ).toBeInTheDocument();
});
