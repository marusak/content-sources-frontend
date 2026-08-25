import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PackagesTable from './PackagesTable';
import { useLightwellRepositoryPackagesQuery } from 'services/Content/ContentQueries';
import {
  defaultLightwellContentItem,
  defaultLightwellRepositoryPackageItem,
  defaultLightwellRepositoryPackageResponse,
  defaultPythonRemediatedContentItem,
  defaultPythonRemediatedRepositoryPackageItem,
  defaultPythonValidatedContentItem,
  defaultPythonValidatedPackageItem,
  pythonValidatedPipCommand,
  ReactQueryTestWrapper,
} from 'testingHelpers';
import { ContentItem, RepositoryPackageItem } from 'services/Content/ContentApi';
import { getRepositoryPathSlug } from '../helpers';
import useLightwellRepository from '../../../Hooks/Lightwell/useLightwellRepository';
import { useLightwellNavigateTo } from '../../../Hooks/Lightwell/navigation/useLightwellNavigateTo';

jest.mock('services/Content/ContentQueries', () => ({
  useLightwellRepositoryPackagesQuery: jest.fn(),
}));

jest.mock('Hooks/Lightwell/useLightwellRepository');

jest.mock('Hooks/useDebounce', () => (value: unknown) => value);

const mockNavigateTo = jest.fn();

jest.mock('Hooks/Lightwell/navigation/useLightwellNavigateTo', () => ({
  useLightwellNavigateTo: jest.fn(),
}));

const mockUseParams = jest.fn(() => ({
  repoName: getRepositoryPathSlug(
    defaultLightwellContentItem.content_type,
    defaultLightwellContentItem.security_level,
  ),
}));

let searchParams = new URLSearchParams();
const mockSetSearchParams = jest.fn((next: URLSearchParams) => {
  searchParams = next;
});

jest.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useSearchParams: () => [searchParams, mockSetSearchParams],
  useNavigationType: () => 'REPLACE',
}));

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  LIGHTWELL_USE_MOCK: false,
}));

const javaRemediatedContentItem: ContentItem = {
  ...defaultLightwellContentItem,
  name: 'lightwell/java/remediated',
  published_distribution_url: 'https://example.com/lightwell/java/remediated',
  uuid: '3875c35b-a67a-4ac2-a989-21139433c178',
  security_level: 'remediated',
};

const javaPredisclosureContentItem: ContentItem = {
  ...defaultLightwellContentItem,
  name: 'lightwell/java/predisclosure',
  published_distribution_url: 'https://example.com/lightwell/java/predisclosure',
  uuid: '3875c35b-a67a-4ac2-a989-21139433c179',
  security_level: 'predisclosure',
};

const predisclosurePackageItem: RepositoryPackageItem = {
  ...defaultLightwellRepositoryPackageItem,
  latest_releases: [
    { version: '3.14.0', release: 'rhlw-0005', created_at: '2026-07-01T00:00:00Z' },
  ],
};

const mockPackagesQuery = (
  overrides: Partial<ReturnType<typeof useLightwellRepositoryPackagesQuery>> = {},
) => ({
  isLoading: false,
  isFetching: false,
  isError: false,
  error: undefined,
  data: defaultLightwellRepositoryPackageResponse,
  ...overrides,
});

const mockRepository = (repository: ContentItem = defaultLightwellContentItem) => {
  (useLightwellRepository as jest.Mock).mockReturnValue({
    repository,
    repoUUID: repository.uuid,
    isLoading: false,
    isError: false,
    error: undefined,
  });
};

const renderPackagesTable = () =>
  render(
    <ReactQueryTestWrapper>
      <PackagesTable />
    </ReactQueryTestWrapper>,
  );

const mockClipboard = () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  return writeText;
};

const clickCopyButton = async (label: string) => {
  await userEvent.click(await screen.findByRole('button', { name: label }));
};

const javaValidatedTableCopyCommand = `${defaultLightwellRepositoryPackageItem.group}:${defaultLightwellRepositoryPackageItem.name}:3.14.0`;

beforeEach(() => {
  searchParams = new URLSearchParams();
  mockSetSearchParams.mockClear();
  (useLightwellNavigateTo as jest.Mock).mockReturnValue({
    navigateTo: mockNavigateTo,
  });
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug(
      defaultLightwellContentItem.content_type,
      defaultLightwellContentItem.security_level,
    ),
  });
  mockRepository();
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() => mockPackagesQuery());
});

it('shows empty state when there are no packages', async () => {
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: { ...defaultLightwellRepositoryPackageResponse, results: [], total: 0 },
    }),
  );

  renderPackagesTable();

  expect(
    await screen.findByText('No packages available yet in this repository.'),
  ).toBeInTheDocument();
});

it('renders with a single package', async () => {
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [defaultLightwellRepositoryPackageItem],
        total: 1,
      },
    }),
  );

  renderPackagesTable();

  expect(screen.queryAllByText('Java Validated')).toHaveLength(2);
  expect(
    await screen.findByText('https://example.com/lightwell/java/validated'),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole('button', { name: 'org.json.test:json-test' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('rhlw-3004-test')).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: '3.14.0' })).toBeInTheDocument();
  expect(screen.getByText('3.14.0')).toBeInTheDocument();
  expect(document.querySelector('time[datetime="2026-07-01T00:00:00.000Z"]')).toBeInTheDocument();
});

it('shows a loading skeleton while packages are fetching', () => {
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({ isFetching: true }),
  );

  renderPackagesTable();

  expect(screen.getByLabelText('Filter by name or group ID')).toBeInTheDocument();
  expect(screen.queryByRole('table', { name: 'Lightwell packages table' })).not.toBeInTheDocument();
});

it('shows loader while the repository is resolving', () => {
  (useLightwellRepository as jest.Mock).mockReturnValue({
    repository: undefined,
    repoUUID: undefined,
    isLoading: true,
    isError: false,
    error: undefined,
  });

  renderPackagesTable();

  expect(screen.queryByLabelText('Filter by name or group ID')).not.toBeInTheDocument();
});

it('shows filtered empty state when search returns no packages', async () => {
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: { ...defaultLightwellRepositoryPackageResponse, results: [], total: 0 },
    }),
  );

  renderPackagesTable();

  await userEvent.type(screen.getByLabelText('Filter by name or group ID'), 'missing');

  expect(await screen.findByText('No packages match the filter criteria')).toBeInTheDocument();
  expect(screen.getByText('Clear all filters to show more results.')).toBeInTheDocument();
});

it('navigates to package details when a package name is clicked', async () => {
  renderPackagesTable();

  await userEvent.click(await screen.findByRole('button', { name: 'org.json.test:json-test' }));

  expect(mockNavigateTo).toHaveBeenCalledWith('packageDetails', {
    repoSlug: getRepositoryPathSlug(
      defaultLightwellContentItem.content_type,
      defaultLightwellContentItem.security_level,
    ),
    packageName: 'json-test',
    groupId: defaultLightwellRepositoryPackageItem.group,
    packagesParams: { search: '', page: 1 },
  });
});

it('navigates to repositories when Lightwell breadcrumb is clicked', async () => {
  renderPackagesTable();

  await userEvent.click(await screen.findByRole('button', { name: 'Lightwell' }));

  expect(mockNavigateTo).toHaveBeenCalledWith('repositories');
});

it('copies the maven coordinate when a validated version label is clicked', async () => {
  const writeText = mockClipboard();
  renderPackagesTable();

  await clickCopyButton('3.14.0');

  expect(writeText).toHaveBeenCalledWith(javaValidatedTableCopyCommand);
});

it('expands additional versions when "N more" is clicked', async () => {
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('python', 'validated'),
  });
  mockRepository(defaultPythonValidatedContentItem);
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [defaultPythonValidatedPackageItem],
        total: 1,
      },
    }),
  );

  renderPackagesTable();

  expect(screen.getByText('2.21.2')).toBeInTheDocument();
  expect(screen.queryByText('2.20.0')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '1 more' }));

  expect(screen.getByText('2.20.0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'hide' })).toBeInTheDocument();
});

it('renders remediated java packages with a Latest release column', async () => {
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('maven', 'remediated'),
  });
  mockRepository(javaRemediatedContentItem);

  renderPackagesTable();

  expect(await screen.findByRole('heading', { name: 'Java Remediated' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Latest release' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: '3.14.0.rhlw-0004' })).toBeInTheDocument();
});

it('shows one version row per upstream version with its latest release only', async () => {
  const multiReleasePackage: RepositoryPackageItem = {
    group: 'org.example',
    name: 'my-lib',
    versions: ['2.0.0', '1.0.0'],
    latest_releases: [
      { version: '2.0.0', release: 'rhlw-2', created_at: '2026-07-02T00:00:00Z' },
      { version: '2.0.0', release: 'rhlw-1', created_at: '2026-07-01T00:00:00Z' },
      { version: '1.0.0', release: 'rhlw-3', created_at: '2026-06-15T00:00:00Z' },
      { version: '1.0.0', release: 'rhlw-1', created_at: '2026-06-13T00:00:00Z' },
    ],
  };

  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('maven', 'remediated'),
  });
  mockRepository(javaRemediatedContentItem);
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [multiReleasePackage],
        total: 1,
      },
    }),
  );

  renderPackagesTable();

  // Version column: 2.0.0 shown once (not duplicated for each release), 1.0.0 collapsed
  expect(await screen.findByText('2.0.0')).toBeInTheDocument();
  expect(screen.queryAllByText('2.0.0')).toHaveLength(1);
  expect(screen.queryByText('1.0.0')).not.toBeInTheDocument();

  // Latest release column: shows the latest release for 2.0.0, not the older one
  expect(screen.getByRole('button', { name: '2.0.0.rhlw-2' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '2.0.0.rhlw-1' })).not.toBeInTheDocument();

  // Expand to reveal 1.0.0 with its latest release (rhlw-3, not rhlw-1)
  await userEvent.click(screen.getByRole('button', { name: '1 more' }));
  expect(screen.getByText('1.0.0')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '1.0.0.rhlw-3' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '1.0.0.rhlw-1' })).not.toBeInTheDocument();
});

it('renders python validated packages with pip copy labels and no group ID column', async () => {
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('python', 'validated'),
  });
  mockRepository(defaultPythonValidatedContentItem);
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [defaultPythonValidatedPackageItem],
        total: 1,
      },
    }),
  );

  const writeText = mockClipboard();
  renderPackagesTable();

  expect(await screen.findByRole('heading', { name: 'Python Validated' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Group ID' })).not.toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Latest release' })).not.toBeInTheDocument();

  await clickCopyButton('2.21.2');
  expect(writeText).toHaveBeenCalledWith(pythonValidatedPipCommand);
});

it('renders python remediated packages with a Latest release column', async () => {
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('python', 'remediated'),
  });
  mockRepository(defaultPythonRemediatedContentItem);
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [defaultPythonRemediatedRepositoryPackageItem],
        total: 1,
      },
    }),
  );

  renderPackagesTable();

  expect(await screen.findByRole('heading', { name: 'Python Remediated' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Latest release' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: '2.32.0.rhlw-0002' })).toBeInTheDocument();
});

it('clears the search filter from the filtered empty state', async () => {
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: { ...defaultLightwellRepositoryPackageResponse, results: [], total: 0 },
    }),
  );

  renderPackagesTable();

  await userEvent.type(screen.getByLabelText('Filter by name or group ID'), 'missing');
  expect(await screen.findByText('No packages match the filter criteria')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

  await waitFor(() => expect(screen.getByLabelText('Filter by name or group ID')).toHaveValue(''));
});

it('renders connect action and repository description', async () => {
  renderPackagesTable();

  expect(await screen.findByRole('button', { name: 'Connect' })).toBeInTheDocument();
  expect(
    screen.getByText(
      'Maven artifacts rebuilt from source by Red Hat. Verified end-to-end with no modifications.',
    ),
  ).toBeInTheDocument();
});

it('renders predisclosure packages with Latest release column', async () => {
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('maven', 'predisclosure'),
  });
  mockRepository(javaPredisclosureContentItem);
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [predisclosurePackageItem],
        total: 1,
      },
    }),
  );

  renderPackagesTable();

  expect(await screen.findByRole('heading', { name: 'Java Predisclosure' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Latest release' })).toBeInTheDocument();
});

it('displays sensitive data warning for predisclosure repositories', async () => {
  mockUseParams.mockReturnValue({
    repoName: getRepositoryPathSlug('maven', 'predisclosure'),
  });
  mockRepository(javaPredisclosureContentItem);
  (useLightwellRepositoryPackagesQuery as jest.Mock).mockImplementation(() =>
    mockPackagesQuery({
      data: {
        ...defaultLightwellRepositoryPackageResponse,
        results: [predisclosurePackageItem],
        total: 1,
      },
    }),
  );

  renderPackagesTable();

  await screen.findByRole('heading', { name: 'Java Predisclosure' });

  expect(screen.getByText(/sensitive/i)).toBeInTheDocument();
});
