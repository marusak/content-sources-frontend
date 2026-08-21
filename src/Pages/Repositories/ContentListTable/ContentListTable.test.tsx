import {
  ReactQueryTestWrapper,
  defaultContentItemWithSnapshot,
  testRepositoryParamsResponse,
  defaultRedHatRepository,
  defaultEPELRepository,
  testEUSRepositoryParamsResponse,
  defaultEUSRepository,
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

jest.mock('services/AdminPartnerRepos/AdminPartnerReposQueries', () => ({
  useToggleAsPartnerMutate: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
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

  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testRepositoryParamsResponse,
  }));
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
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({ isLoading: false, data: {} }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({ isLoading: false }));

  const { queryByText } = renderContentListTable();

  expect(queryByText('No repositories')).toBeInTheDocument();
  expect(queryByText('To get started, create a custom repository.')).toBeInTheDocument();
});

it('renders a loading state', () => {
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: true,
  }));

  const { queryByTestId } = renderContentListTable();

  expect(queryByTestId('content-list-toolbar')).toBeInTheDocument();
  expect(queryByTestId('SkeletonTableBody-tbody')).toBeInTheDocument();
});

it('renders with a single row', async () => {
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

it('disables Community checkboxes when Custom and Community tabs are active', async () => {
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

it('disables delete kebab when Red Hat and/or Community tabs are active and shows read-only tooltip', async () => {
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
      name: 'Red Hat and Community repositories are read-only and cannot be manipulated.',
    }),
  ).toBeInTheDocument();
});

it('queries with ContentOrigin.ALL when no origin filter is selected', () => {
  (useAppContext as jest.Mock).mockReturnValue({
    features: { snapshots: { accessible: true } },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [],
    setContentOrigin: () => {},
  });
  (useContentListQuery as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  }));

  renderContentListTable();

  expect(useContentListQuery).toHaveBeenCalledWith(
    1,
    expect.any(Number),
    expect.any(Object),
    expect.any(String),
    [ContentOrigin.ALL],
    true,
    false,
  );
});

it('hides bulk select when Red Hat and/or Community tabs are active', async () => {
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

it('filters the table by major and minor OS versions', async () => {
  (useAppContext as jest.Mock).mockReturnValue({
    features: {
      extendedreleaserepos: { enabled: true, accessible: true },
    },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [ContentOrigin.REDHAT],
    setContentOrigin: () => {},
  });

  (useRepositoryParams as jest.Mock).mockImplementation(() => ({
    isLoading: false,
    data: testEUSRepositoryParamsResponse,
  }));

  (useContentListQuery as jest.Mock).mockImplementation((_page, _limit, filterData) => {
    const onlyEUS = filterData?.versions?.length === 1 && filterData.versions[0] === '9.6';
    const data = onlyEUS ? [defaultEUSRepository] : [defaultEUSRepository, defaultRedHatRepository];
    return { isLoading: false, data: { data, meta: { count: data.length, limit: 20, offset: 0 } } };
  });

  const osMenuItem = 'Operating system';

  renderContentListTable();

  // Initially, there should be two rows (one for each repository)
  let rows = document.querySelectorAll('tbody tr');
  expect(rows.length).toBe(2);

  const user = userEvent.setup();

  const toolbar = screen.getByTestId('content-list-toolbar');
  await user.click(within(toolbar).getByRole('button', { name: 'Name' }));
  await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: osMenuItem }));
  await user.click(within(screen.getByTestId('filter-version')).getByRole('button'));
  await user.click(screen.getByLabelText('RHEL 9.6'));

  // After filtering by a minor version, there should be one row (for the filtered repository)
  await waitFor(() => {
    rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
  });
  expect(await screen.findByText(defaultEUSRepository.name!)).toBeInTheDocument();
  // Re-select the OS filter type and add a major version filter
  await user.click(within(toolbar).getByRole('button', { name: 'Name' }));
  await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: osMenuItem }));

  // PatternFly leaves stale filter-version elements in the DOM on re-render, so grab the last (active) one
  const versionFilters = screen.getAllByTestId('filter-version');
  const activeFilter = versionFilters[versionFilters.length - 1];
  await user.click(within(activeFilter).getAllByRole('button')[0]);
  await user.click(screen.getByLabelText('RHEL 10'));

  await waitFor(() => {
    rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });
  expect(await screen.findByText(defaultEUSRepository.name!)).toBeInTheDocument();
  expect(await screen.findByText(defaultRedHatRepository.name!)).toBeInTheDocument();
});
