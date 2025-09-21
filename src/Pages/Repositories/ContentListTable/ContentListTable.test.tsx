import {
  ReactQueryTestWrapper,
  defaultContentItemWithSnapshot,
  testRepositoryParamsResponse,
} from 'testingHelpers';
import { render, waitFor, fireEvent } from '@testing-library/react';
import ContentListTable from './ContentListTable';
import { useContentListQuery, useRepositoryParams } from 'services/Content/ContentQueries';
import AddContent from './components/AddContent/AddContent';
import { ContentOrigin } from 'services/Content/ContentApi';

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
  useAppContext: () => ({
    features: { snapshots: { accessible: true } },
    rbac: { repoWrite: true, repoRead: true },
    contentOrigin: [ContentOrigin.EXTERNAL, ContentOrigin.UPLOAD],
    setContentOrigin: () => {},
  }),
}));

jest.mock('./components/AddContent/AddContent');

jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Outlet: () => <></>,
  useSearchParams: () => [{ get: () => ContentOrigin.CUSTOM }, () => {}],
}));

(AddContent as jest.Mock).mockImplementation(() => 'Add content');

it('displays empty state message when no repositories are present', () => {
  (useRepositoryParams as jest.Mock).mockImplementation(() => ({ isLoading: false }));
  (useContentListQuery as jest.Mock).mockImplementation(() => ({ isLoading: false }));

  const { queryByText } = render(
    <ReactQueryTestWrapper>
      <ContentListTable />
    </ReactQueryTestWrapper>,
  );

  expect(queryByText('No custom repositories')).toBeInTheDocument();
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

  const { queryByText, queryByTestId } = render(
    <ReactQueryTestWrapper>
      <ContentListTable />
    </ReactQueryTestWrapper>,
  );

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

  const { queryByText, getByRole, queryByRole } = render(
    <ReactQueryTestWrapper>
      <ContentListTable />
    </ReactQueryTestWrapper>,
  );

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

  const kebabButton = getByRole('button', { name: 'Kebab toggle' });
  fireEvent.click(kebabButton);

  await waitFor(() => expect(getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument());
  expect(getByRole('menuitem', { name: 'Trigger snapshot' })).toBeInTheDocument();
  expect(queryByRole('menuitem', { name: 'Introspect now' })).not.toBeInTheDocument();
  expect(getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument();
});
