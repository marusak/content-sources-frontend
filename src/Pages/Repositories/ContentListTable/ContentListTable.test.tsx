import {
  ReactQueryTestWrapper,
  defaultContentItemWithSnapshot,
  testRepositoryParamsResponse,
  defaultRedHatRepository,
  defaultEPELRepository,
} from 'testingHelpers';
import { render, waitFor, screen, within } from '@testing-library/react';
import ContentListTable from './ContentListTable';
import { useContentListQuery, useRepositoryParams } from 'services/Content/ContentQueries';
import { ContentOrigin } from 'services/Content/ContentApi';
import { useAppContext } from 'middleware/AppContext';
import userEvent from '@testing-library/user-event';

jest.mock('services/Content/ContentQueries', () => ({
  useRepositoryParams: jest.fn(),
  useContentListQuery: jest.fn(),
  useAddContentQuery: () => ({ isLoading: false }),
  useValidateContentList: () => ({ isLoading: false }),
  useDeleteContentItemMutate: () => ({ isLoading: false }),
  useBulkDeleteContentItemMutate: () => ({ isLoading: false }),
  useIntrospectRepositoryMutate: () => ({ isLoading: false }),
  useFetchGpgKey: () => ({ fetchGpgKey: () => '' }),
  useTriggerSnapshot: () => ({ isLoading: false }),
}));

jest.mock('middleware/AppContext', () => ({
  useAppContext: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => <></>,
  // Tests don't assert URL params, so return null for origin to avoid coupling
  useSearchParams: () => [{ get: () => null }, jest.fn()],
}));

beforeEach(() => {
  (useAppContext as jest.Mock).mockReturnValue({
    features: { snapshots: { accessible: true } },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [ContentOrigin.COMMUNITY, ContentOrigin.CUSTOM],
    setContentOrigin: () => {},
  });
});

afterEach(() => {
  jest.resetAllMocks(); // Reset implementation of mocks and call counts
});

const renderContentListTable = () =>
  render(
    <ReactQueryTestWrapper>
      <ContentListTable />
    </ReactQueryTestWrapper>,
  );

it('shows empty state when there are no repositories', () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({ isLoading: false }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({ isLoading: false }));

  const { queryByText } = renderContentListTable();

  expect(queryByText('No repositories')).toBeInTheDocument();
  expect(queryByText('To get started, create a custom repository.')).toBeInTheDocument();
});

it('Render a loading state', () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: true,
  }));

  const { queryByText, queryByTestId } = renderContentListTable();

  expect(queryByText('Name/URL')).toBeInTheDocument();
  expect(queryByTestId('SkeletonTableBody-tbody')).toBeInTheDocument();
});

it('Render with a single row', async () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [defaultContentItemWithSnapshot],
      meta: { count: 1, limit: 20, offset: 0 },
    },
  }));

  const { queryByText, getByRole, queryByRole } = renderContentListTable();

  await waitFor(() => expect(queryByText('AwesomeNamewwyylse12')).toBeInTheDocument());
  await waitFor(() =>
    expect(queryByText('https://google.ca/wwyylse12/x86_64/el7')).toBeInTheDocument(),
  );

  expect(
    queryByText(defaultContentItemWithSnapshot.last_snapshot?.added_counts['rpm.package'] || 0),
  ).toBeInTheDocument();
  expect(
    queryByText(defaultContentItemWithSnapshot.last_snapshot?.removed_counts['rpm.package'] || 0),
  ).toBeInTheDocument();

  const user = userEvent.setup();
  const kebabButton = getByRole('button', { name: 'Kebab toggle' });
  await user.click(kebabButton);

  await waitFor(() => expect(getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument());
  expect(getByRole('menuitem', { name: 'Trigger snapshot' })).toBeInTheDocument();
  expect(queryByRole('menuitem', { name: 'Introspect now' })).not.toBeInTheDocument();
  expect(getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
});

it('disables EPEL checkboxes when Custom and EPEL tabs are active', async () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [defaultContentItemWithSnapshot, defaultEPELRepository],
      meta: { count: 2, limit: 20, offset: 0 },
    },
  }));

  renderContentListTable();

  // Check that the rows are rendered
  const rows = document.querySelectorAll('tbody tr');
  expect(rows.length).toBe(2);

  expect(await screen.findByText('AwesomeNamewwyylse12')).toBeInTheDocument();
  expect(await screen.findByText('EPEL 9 Everything x86_64')).toBeInTheDocument();

  // Custom repo row should be enabled
  const customRepoRow = screen.getByText('AwesomeNamewwyylse12').closest('tr')!;
  const customRepoCheckbox = within(customRepoRow).getByRole('checkbox');
  expect(customRepoCheckbox).toBeEnabled();

  // EPEL repo row should be disabled
  const epelRepoRow = screen.getByText('EPEL 9 Everything x86_64').closest('tr')!;
  const epelRepoCheckbox = within(epelRepoRow).getByRole('checkbox');
  expect(epelRepoCheckbox).toBeDisabled();
});

it('disables checkboxes for Community repos when no origin tab is active', async () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [defaultContentItemWithSnapshot, defaultEPELRepository, defaultRedHatRepository],
      meta: { count: 3, limit: 20, offset: 0 },
    },
  }));

  (useAppContext as jest.Mock).mockReturnValue({
    features: { snapshots: { accessible: true } },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [],
    setContentOrigin: () => {},
  });

  renderContentListTable();

  // Check that the rows are rendered
  const rows = document.querySelectorAll('tbody tr');
  expect(rows.length).toBe(3);

  expect(await screen.findByText('AwesomeNamewwyylse12')).toBeInTheDocument();
  expect(await screen.findByText('EPEL 9 Everything x86_64')).toBeInTheDocument();
  expect(
    await screen.findByText('Red Hat CodeReady Linux Builder for RHEL 10 ARM 64 (RPMs)'),
  ).toBeInTheDocument();

  // Custom repo row should be enabled
  const customRepoRow = screen.getByText('AwesomeNamewwyylse12').closest('tr')!;
  const customRepoCheckbox = within(customRepoRow).getByRole('checkbox');
  expect(customRepoCheckbox).toBeEnabled();

  // Red Hat repo row should be disabled
  const redHatRepoRow = screen
    .getByText('Red Hat CodeReady Linux Builder for RHEL 10 ARM 64 (RPMs)')
    .closest('tr')!;
  const redHatRepoCheckbox = within(redHatRepoRow).getByRole('checkbox');
  expect(redHatRepoCheckbox).toBeDisabled();

  // EPEL repo row should be disabled
  const epelRepoRow = screen.getByText('EPEL 9 Everything x86_64').closest('tr')!;
  const epelRepoCheckbox = within(epelRepoRow).getByRole('checkbox');
  expect(epelRepoCheckbox).toBeDisabled();
});

it('disables delete kebab when Red Hat and/or EPEL tabs are active and shows read-only tooltip', async () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [defaultEPELRepository, defaultRedHatRepository],
      meta: { count: 2, limit: 20, offset: 0 },
    },
  }));

  (useAppContext as jest.Mock).mockReturnValue({
    features: { snapshots: { accessible: true } },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [ContentOrigin.COMMUNITY],
    setContentOrigin: () => {},
  });

  renderContentListTable();

  const user = userEvent.setup();
  const deleteKebab = await screen.findByRole('button', { name: 'plain kebab' });
  expect(deleteKebab).toBeDisabled();
  await user.hover(deleteKebab);
  expect(
    await screen.findByRole('tooltip', {
      name: 'Red Hat and EPEL repositories are read-only and cannot be manipulated.',
    }),
  ).toBeInTheDocument();
});

it('hides bulk select when Red Hat and/or EPEL tabs are active', async () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [defaultEPELRepository, defaultRedHatRepository],
      meta: { count: 2, limit: 20, offset: 0 },
    },
  }));

  (useAppContext as jest.Mock).mockReturnValue({
    features: { snapshots: { accessible: true } },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [ContentOrigin.COMMUNITY],
    setContentOrigin: () => {},
  });

  renderContentListTable();

  await waitFor(() => {
    expect(screen.queryByRole('checkbox', { name: 'Select page' })).not.toBeInTheDocument();
  });
});

it('disables bulk select and shows tooltip when no custom repositories are on the page', async () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: {
      data: [defaultEPELRepository, defaultRedHatRepository],
      meta: { count: 2, limit: 20, offset: 0 },
    },
  }));

  renderContentListTable();

  // Set `pointerEventsCheck: 0` to bypass pointer-events checks and allow user interactions with the checkbox
  // This is necessary because the checkbox is inside a `pointer-events: none` container, which disables the parent split button component
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  const bulkSelectCheckbox = await screen.findByRole('checkbox', { name: 'Select page' });
  expect(bulkSelectCheckbox).toBeDisabled();
  await user.hover(bulkSelectCheckbox);
  expect(
    await screen.findByRole('tooltip', { name: 'No custom repositories on this page to select.' }),
  ).toBeInTheDocument();
});
