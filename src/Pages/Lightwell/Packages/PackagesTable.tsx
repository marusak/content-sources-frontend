import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  Content,
  Flex,
  FlexItem,
  Grid,
  Icon,
  Pagination,
  PaginationVariant,
  SearchInput,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Timestamp,
} from '@patternfly/react-core';
import { CodeIcon, JavaIcon, PythonIcon } from '@patternfly/react-icons';
import { SkeletonTable } from '@patternfly/react-component-groups';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { createUseStyles } from 'react-jss';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import {
  Table,
  TableVariant,
  Tr,
  Td,
  Thead,
  Th,
  Tbody,
  type BaseCellProps,
} from '@patternfly/react-table';

import { useLightwellRepositoryPackagesQuery } from 'services/Content/ContentQueries';
import { RepositoryPackageItem } from 'services/Content/ContentApi';
import { getMockLightwellPackages } from '../mockPackages';
import {
  compareReleasesDesc,
  formatDistributionUrl,
  formatRepositoryName,
  getRepositoryDescription,
  sortVersionsDesc,
} from '../helpers';
import Hide from 'components/Hide/Hide';
import { LIGHTWELL_USE_MOCK, lightwellPkgsPerPageKey } from '../constants';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import Loader from 'components/Loader';
import LightwellNotFound from '../components/LightwellNotFound';
import ConnectRepositoryModal from '../Repositories/components/ConnectRepositoryModal';
import { buildVersionFromRelease } from './components/PackageReleasesTab';
import CopyLabel from './components/CopyLabel';
import RemediatedDataWarning from '../RemediatedDataWarning';
import useLightwellRepository from '../../../Hooks/Lightwell/useLightwellRepository';
import { useLightwellNavigateTo } from '../../../Hooks/Lightwell/navigation/useLightwellNavigateTo';
import { useLightwellPackagesParams } from '../../../Hooks/Lightwell/useLightwellPackagesParams';

const useStyles = createUseStyles({
  topContainer: {
    padding: '16px 24px',
  },
  titleWrapper: {
    padding: '16px 0 0',
  },
  packagesList: {
    paddingTop: '16px',
  },
  bottomContainer: {
    justifyContent: 'space-between',
  },
  filterToolbarItem: {
    minWidth: '18rem',
    '& .pf-v6-c-search-input': {
      width: '100%',
    },
  },
});

type MappedRelease = {
  version: string;
  release: string;
};

type MappedPackage = {
  group_id: string;
  name: string;
  versions: string[];
  latest_releases: MappedRelease[];
  last_updated: string;
};

const mapRepositoryPackage = (pkg: RepositoryPackageItem): MappedPackage => {
  const latestCreatedAt = pkg.latest_releases
    .map((release) => release.created_at)
    .sort()
    .at(-1);

  const sortedReleases = [...pkg.latest_releases].sort(compareReleasesDesc);

  const seenVersions = new Set<string>();
  const latestReleasePerVersion = sortedReleases.filter((release) => {
    if (seenVersions.has(release.version)) return false;
    seenVersions.add(release.version);
    return true;
  });

  const sortedVersions =
    latestReleasePerVersion.length > 0
      ? latestReleasePerVersion.map((release) => release.version)
      : sortVersionsDesc(pkg.versions);

  return {
    group_id: pkg.group,
    name: pkg.name,
    versions: sortedVersions,
    latest_releases: latestReleasePerVersion.map((release) => ({
      version: release.version,
      release: release.release,
    })),
    last_updated: latestCreatedAt ?? '',
  };
};

type StackedItemsCellProps<T> = {
  items: T[];
  packageKey: string;
  isCollapsed: boolean;
  onToggle: (key: string) => void;
  showToggle?: boolean;
  renderItem?: (item: T) => ReactNode;
  getItemKey?: (item: T) => string;
};

type PackageCopyLabelProps = {
  name: string;
  groupId: string;
  version: string;
  isPython: boolean;
};

const PackageCopyLabel = ({ name, groupId, version, isPython }: PackageCopyLabelProps) => {
  const copyText = isPython ? `pip install ${name}==${version}` : `${groupId}:${name}:${version}`;
  return <CopyLabel copyText={copyText}>{version}</CopyLabel>;
};

const StackedItemsCell = <T,>({
  items,
  packageKey,
  isCollapsed,
  onToggle,
  showToggle = false,
  renderItem = (item) => String(item),
  getItemKey = (item) => String(item),
}: StackedItemsCellProps<T>) => {
  if (items.length === 0) {
    return <>—</>;
  }

  if (items.length === 1) {
    return <>{renderItem(items[0])}</>;
  }

  const [primary, ...rest] = items;
  const isExpanded = !isCollapsed;

  return (
    <Flex
      direction={{ default: 'column' }}
      alignItems={{ default: 'alignItemsFlexStart' }}
      gap={{ default: 'gapXs' }}
    >
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
        <span>{renderItem(primary)}</span>
        {showToggle && (
          <Button variant='link' isInline onClick={() => onToggle(packageKey)}>
            {isExpanded ? 'hide' : `${rest.length} more`}
          </Button>
        )}
      </Flex>
      {isExpanded && rest.map((item) => <span key={getItemKey(item)}>{renderItem(item)}</span>)}
    </Flex>
  );
};

const PackagesTable = () => {
  const classes = useStyles();

  const { repoName: repoSlug = '' } = useParams();
  const { navigateTo } = useLightwellNavigateTo();
  const { searchQuery, setSearchQuery, debouncedSearch, page, setPage, onSetPage, packagesParams } =
    useLightwellPackagesParams();

  const storedPerPage = Number(localStorage.getItem(lightwellPkgsPerPageKey)) || 20;
  const [perPage, setPerPage] = useState(storedPerPage);

  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const useMock = LIGHTWELL_USE_MOCK;

  const {
    repository,
    repoUUID,
    isLoading: isResolvingRepository,
    isError,
    error,
  } = useLightwellRepository(repoSlug);

  const apiPackagesQuery = useLightwellRepositoryPackagesQuery(
    repoUUID,
    page,
    perPage,
    debouncedSearch,
    !!repoUUID && !useMock,
  );

  const {
    data: packagesData,
    isLoading: isPackagesLoading,
    isFetching: isPackagesFetching,
  } = apiPackagesQuery;

  const { packages, packageCount } = useMemo(() => {
    if (useMock) {
      const mockPackages = getMockLightwellPackages(repoUUID, debouncedSearch);
      const offset = (page - 1) * perPage;
      return {
        packages: mockPackages.slice(offset, offset + perPage).map(mapRepositoryPackage),
        packageCount: mockPackages.length,
      };
    }

    const results = packagesData?.results ?? [];
    return {
      packages: results.map(mapRepositoryPackage),
      packageCount: packagesData?.total ?? 0,
    };
  }, [useMock, repoUUID, debouncedSearch, page, perPage, packagesData]);

  const fetchingOrLoading = useMock ? false : isPackagesLoading || isPackagesFetching;
  const countIsZero = packageCount === 0;
  const showPagination = packages.length > 0;

  if (isResolvingRepository) {
    return <Loader />;
  }

  if (!repository) {
    return <LightwellNotFound />;
  }

  if (!repoUUID || isError) throw error;
  if (!useMock && apiPackagesQuery.isError) throw apiPackagesQuery.error;

  const showEmptyState = countIsZero && !fetchingOrLoading;

  const onPerPageSelect = (_, newPerPage: number, newPage: number) => {
    localStorage.setItem(lightwellPkgsPerPageKey, newPerPage.toString());
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const paginationProps = {
    itemCount: packageCount,
    perPage,
    page,
    onSetPage,
    onPerPageSelect,
  };

  const togglePackageExpanded = (packageKey: string) => {
    setExpandedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(packageKey)) {
        next.delete(packageKey);
      } else {
        next.add(packageKey);
      }
      return next;
    });
  };

  const repositoryName = formatRepositoryName(
    repository.content_type,
    repository.security_level,
    repository.name,
  );
  const isRemediated = repository.security_level === 'remediated';
  const isPredisclosure = repository.security_level === 'predisclosure';
  const showReleaseColumn = isRemediated || isPredisclosure;
  const isMaven = repository.content_type === 'maven';
  const isPython = repository.content_type === 'python';

  const columnHeaders: { title: string; width?: BaseCellProps['width'] }[] = [
    { title: 'Package', width: 25 },
    { title: 'Version', width: 15 },
    ...(showReleaseColumn
      ? [{ title: 'Latest release', width: 20 as BaseCellProps['width'] }]
      : []),
    { title: 'Last updated', width: 15 },
  ];

  return (
    <>
      <Grid className={classes.topContainer}>
        <Stack>
          <StackItem>
            <Breadcrumb ouiaId='lightwell-packages-breadcrumb'>
              <BreadcrumbItem component='button' onClick={() => navigateTo('repositories')}>
                Lightwell
              </BreadcrumbItem>
              <BreadcrumbItem disabled>{repositoryName}</BreadcrumbItem>
            </Breadcrumb>
          </StackItem>
          <StackItem className={classes.titleWrapper}>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              gap={{ default: 'gapMd' }}
            >
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                <FlexItem>
                  <Icon size='xl'>
                    {repository?.content_type === 'maven' ? <JavaIcon /> : <PythonIcon />}
                  </Icon>
                </FlexItem>
                <FlexItem>
                  <Title headingLevel='h1' ouiaId='lightwell-packages-header'>
                    {repositoryName}
                  </Title>
                </FlexItem>
                <FlexItem>
                  <CopyLabel
                    copyText={formatDistributionUrl(repository.published_distribution_url || '')}
                  >
                    {formatDistributionUrl(repository.published_distribution_url || '')}
                  </CopyLabel>
                </FlexItem>
              </Flex>
              <FlexItem align={{ default: 'alignRight' }}>
                <ConnectRepositoryModal
                  repository={{
                    uuid: repository.uuid,
                    name: repository.name,
                    published_distribution_url: formatDistributionUrl(
                      repository.published_distribution_url || '',
                    ),
                    content_type: repository.content_type,
                  }}
                >
                  <Button size='sm' variant='secondary' icon={<CodeIcon />}>
                    Connect
                  </Button>
                </ConnectRepositoryModal>
              </FlexItem>
            </Flex>
            <Content className={spacing.ptSm}>
              {getRepositoryDescription(repository.content_type, repository.security_level)}
            </Content>
          </StackItem>
          {(isRemediated || isPredisclosure) && (
            <StackItem className={spacing.ptSm}>
              <RemediatedDataWarning />
            </StackItem>
          )}
        </Stack>
      </Grid>

      <Grid className={`${spacing.pxLg} ${spacing.pbLg}`}>
        <Toolbar ouiaId='lightwell-packages-toolbar'>
          <ToolbarContent>
            <ToolbarItem className={classes.filterToolbarItem}>
              <SearchInput
                id='lightwell-package-filter'
                aria-label={isMaven ? 'Filter by name or group ID' : 'Filter by name'}
                placeholder={isMaven ? 'Filter by name or group ID' : 'Filter by name'}
                value={searchQuery}
                onChange={(_event, value) => setSearchQuery(value)}
                onClear={() => setSearchQuery('')}
              />
            </ToolbarItem>
            <ToolbarItem variant='pagination' align={{ default: 'alignEnd' }}>
              <Hide hide={!showPagination}>
                <Pagination
                  id='lightwell-top-pagination'
                  widgetId='lightwellTopPaginationWidgetId'
                  isCompact
                  {...paginationProps}
                />
              </Hide>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>

        <Hide hide={!fetchingOrLoading}>
          <SkeletonTable
            rows={perPage}
            columnsCount={columnHeaders.length}
            variant={TableVariant.compact}
          />
        </Hide>

        <Hide hide={fetchingOrLoading}>
          <Hide hide={countIsZero}>
            <Stack>
              <Card className={`${spacing.ptLg} ${spacing.pbXl} ${spacing.pxLg}`}>
                <Stack>
                  <Table
                    aria-label='Lightwell packages table'
                    ouiaId='lightwell-packages-table'
                    isStriped
                  >
                    <Thead>
                      <Tr>
                        {columnHeaders.map(({ title, width }) => (
                          <Th key={title + 'column'} width={width} modifier='wrap'>
                            {title}
                          </Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {packages.map((pkg) => {
                        const { name, group_id, versions, latest_releases, last_updated } = pkg;
                        const packageKey = `${group_id}-${name}`;
                        const isCollapsed = !expandedPackages.has(packageKey);

                        const renderCopyLabel = (version: string) => (
                          <PackageCopyLabel
                            name={name}
                            groupId={group_id}
                            version={version}
                            isPython={isPython}
                          />
                        );

                        return (
                          <Tr key={packageKey}>
                            <Td dataLabel={columnHeaders[0].title}>
                              <Button
                                variant='link'
                                isInline
                                className={text.fontWeightBold}
                                ouiaId={`lightwell-package-${name}`}
                                onClick={() =>
                                  navigateTo('packageDetails', {
                                    repoSlug,
                                    packageName: name,
                                    groupId: isMaven ? group_id : undefined,
                                    packagesParams,
                                  })
                                }
                              >
                                {isMaven ? `${group_id}:${name}` : name}
                              </Button>
                            </Td>
                            <Td dataLabel={columnHeaders[1].title}>
                              <StackedItemsCell
                                items={versions}
                                packageKey={packageKey}
                                isCollapsed={isCollapsed}
                                onToggle={togglePackageExpanded}
                                showToggle
                                renderItem={
                                  repository.security_level === 'validated'
                                    ? renderCopyLabel
                                    : undefined
                                }
                              />
                            </Td>
                            {showReleaseColumn ? (
                              <Td dataLabel={columnHeaders[2].title}>
                                <StackedItemsCell
                                  items={latest_releases}
                                  packageKey={packageKey}
                                  isCollapsed={isCollapsed}
                                  onToggle={togglePackageExpanded}
                                  renderItem={(release) =>
                                    renderCopyLabel(buildVersionFromRelease(release))
                                  }
                                  getItemKey={(release) => buildVersionFromRelease(release)}
                                />
                              </Td>
                            ) : null}
                            <Td dataLabel={columnHeaders[showReleaseColumn ? 3 : 2].title}>
                              {last_updated ? (
                                <Timestamp
                                  date={new Date(last_updated)}
                                  dateFormat='medium'
                                  timeFormat='short'
                                  tooltip={{ variant: 'default' }}
                                  style={{ fontSize: 'inherit', textDecoration: 'none' }}
                                >
                                  {dayjs(last_updated).fromNow()}
                                </Timestamp>
                              ) : (
                                '—'
                              )}
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                  <Hide hide={!showPagination || isPackagesLoading}>
                    <Pagination
                      id='lightwell-bottom-pagination'
                      widgetId='lightwellBottomPaginationWidgetId'
                      variant={PaginationVariant.bottom}
                      isCompact={false}
                      isStatic
                      {...paginationProps}
                    />
                  </Hide>
                </Stack>
              </Card>
            </Stack>
          </Hide>
          <Hide hide={!showEmptyState}>
            <Stack>
              <EmptyTableState
                notFiltered={searchQuery === ''}
                clearFilters={() => setSearchQuery('')}
                itemName='packages'
                notFilteredBody='No packages available yet in this repository.'
              />
            </Stack>
          </Hide>
        </Hide>
      </Grid>
    </>
  );
};

export default PackagesTable;
