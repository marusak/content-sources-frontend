import {
  Bullseye,
  Button,
  Flex,
  FlexItem,
  Grid,
  Pagination,
  PaginationVariant,
  Spinner,
  Stack,
  TooltipPosition,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
} from '@patternfly/react-table';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import {
  ContentItem,
  FilterData,
  IntrospectRepositoryRequestItem,
  ContentOrigin,
} from 'services/Content/ContentApi';
import { SkeletonTable } from '@patternfly/react-component-groups';

import {
  useBulkDeleteContentItemMutate,
  useContentListQuery,
  useIntrospectRepositoryMutate,
  useTriggerSnapshot,
} from 'services/Content/ContentQueries';
import ContentListFilters from './components/ContentListFilters';
import Hide from 'components/Hide/Hide';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import { useQueryClient } from 'react-query';
import StatusIcon from './components/StatusIcon';
import UrlWithExternalIcon from 'components/UrlWithLinkIcon/UrlWithLinkIcon';
import PackageCount from './components/PackageCount';
import { useAppContext } from 'middleware/AppContext';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import dayjs from 'dayjs';
import ChangedArrows from './components/SnapshotListModal/components/ChangedArrows';
import { Outlet, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import useArchVersion from 'Hooks/useArchVersion';
import { ADD_ROUTE, DELETE_ROUTE, EDIT_ROUTE, UPLOAD_ROUTE } from 'Routes/constants';
import UploadRepositoryLabel from 'components/RepositoryLabels/UploadRepositoryLabel';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import CommunityRepositoryLabel from 'components/RepositoryLabels/CommunityRepositoryLabel';

const useStyles = createUseStyles({
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  mainContainer100Height: {
    composes: ['$mainContainer'], // This extends another class within this stylesheet
    minHeight: '100%',
  },
  bottomContainer: {
    justifyContent: 'space-between',
  },
  checkboxMinWidth: {
    minWidth: '45px!important',
  },
  snapshotInfoText: {
    marginRight: '16px',
  },
  inline: {
    display: 'flex',
  },
  disabledButton: {
    pointerEvents: 'auto',
    cursor: 'default',
  },
  uploadIcon: {
    marginLeft: '8px',
  },
});

export const perPageKey = 'contentListPerPage';

const ContentListTable = () => {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { rbac, features, contentOrigin, setContentOrigin } = useAppContext();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [activeSortIndex, setActiveSortIndex] = useState<number>(-1);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');
  const [checkedRepositories, setCheckedRepositories] = useState<Map<string, ContentItem>>(
    new Map(),
  );
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const {
    archesDisplay,
    versionDisplay,
    isError: repositoryParamsIsError,
    error: repositoryParamsError,
  } = useArchVersion();

  const isRedHatRepository =
    contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.REDHAT;
  const isCommunityRepository =
    contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.COMMUNITY;
  const isRedHatOrCommunity =
    contentOrigin.length === 2 &&
    contentOrigin.includes(ContentOrigin.COMMUNITY) &&
    contentOrigin.includes(ContentOrigin.REDHAT);

  const [filterData, setFilterData] = useState<FilterData>({
    searchQuery: '',
    versions: [],
    arches: [],
    statuses: [],
  });

  const originParam = urlSearchParams.get('origin');

  useEffect(() => {
    if (!features?.snapshots?.accessible) return;

    if (originParam === ContentOrigin.REDHAT) setContentOrigin([ContentOrigin.REDHAT]);
  }, []);

  useEffect(() => {
    if (!features?.snapshots?.accessible) return;

    if (isRedHatRepository && originParam !== ContentOrigin.REDHAT) {
      setUrlSearchParams({ origin: ContentOrigin.REDHAT });
    } else if (!isRedHatRepository && originParam) {
      setUrlSearchParams({});
    }
  }, [contentOrigin, features?.snapshots?.accessible]);

  const clearFilters = () =>
    setFilterData({ searchQuery: '', versions: [], arches: [], statuses: [] });

  const notFiltered =
    !filterData.arches?.length &&
    filterData.searchQuery === '' &&
    !filterData.versions?.length &&
    !filterData.statuses?.length;

  const columnSortAttributes = [
    'name',
    'distribution_arch',
    'distribution_versions',
    'package_count',
    'last_introspection_time',
  ];

  const sortString = useMemo(
    () =>
      activeSortIndex === -1
        ? ''
        : columnSortAttributes[activeSortIndex] + ':' + activeSortDirection,
    [activeSortIndex, activeSortDirection],
  );

  const {
    isLoading,
    error,
    isError,
    isFetching,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useContentListQuery(page, perPage, filterData, sortString, contentOrigin, true, polling);

  const actionTakingPlace = isFetching;

  useEffect(() => {
    if (isError) {
      setPolling(false);
      setPollCount(0);
      return;
    }
    const containsPending = data?.data?.some(({ status }) => status === 'Pending' || status === '');
    if (polling && containsPending) {
      // Count each consecutive time polling occurs
      setPollCount(pollCount + 1);
    }
    if (polling && !containsPending) {
      // We were polling, but now the data is valid, we stop the count.
      setPollCount(0);
    }
    if (pollCount > 40) {
      // If polling occurs 40 times in a row, we stop it. Likely a data/kafka issue has occurred with the API.
      return setPolling(false);
    }
    // This sets the polling state based whether the data contains any "Pending" status
    return setPolling(containsPending);
  }, [data?.data]);

  const { mutateAsync: introspectRepository } = useIntrospectRepositoryMutate(
    queryClient,
    page,
    perPage,
    contentOrigin,
    filterData,
    sortString,
  );

  const introspectRepoForUuid = (uuid: string): Promise<void> =>
    introspectRepository({ uuid: uuid, reset_count: true } as IntrospectRepositoryRequestItem);

  const { mutateAsync: triggerSnapshotMutation } = useTriggerSnapshot(queryClient);

  const triggerSnapshot = async (uuid: string): Promise<void> => {
    triggerSnapshotMutation(uuid);
  };

  useBulkDeleteContentItemMutate(
    queryClient,
    checkedRepositories,
    page,
    perPage,
    contentOrigin,
    filterData,
    sortString,
  );

  const triggerIntrospectionAndSnapshot = async (repoUuid: string): Promise<void> => {
    clearCheckedRepositories();
    await introspectRepoForUuid(repoUuid);
    await triggerSnapshot(repoUuid);
  };

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    localStorage.setItem(perPageKey, newPerPage.toString());
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const sortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
      defaultDirection: 'asc', // starting sort direction when first sorting a column. Defaults to 'asc'
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const columnHeaders = [
    'Name',
    'Architecture',
    'OS versions',
    'Packages',
    'Last Introspection',
    'Status',
  ];

  const lastIntrospectionDisplay = (time?: string): string =>
    time === '' || time === undefined ? 'Never' : dayjs(time).fromNow();

  // Error is caught in the wrapper component
  if (isError) throw error;
  if (repositoryParamsIsError) throw repositoryParamsError;

  const {
    data: contentList = [],
    meta: { count = 0 },
  } = data;

  const rowActions = useCallback(
    (rowData: ContentItem): IAction[] =>
      isRedHatRepository ||
      rowData.origin === ContentOrigin.REDHAT ||
      rowData.origin === ContentOrigin.COMMUNITY
        ? features?.snapshots?.accessible
          ? [
              {
                isDisabled:
                  actionTakingPlace ||
                  !rowData.snapshot ||
                  !(rowData.snapshot && rowData.last_snapshot_uuid),

                ouiaId: 'kebab_view_snapshots',
                title:
                  rowData.snapshot && rowData.last_snapshot_uuid
                    ? 'View all snapshots'
                    : 'No snapshots yet',
                onClick: () => {
                  navigate(`${rowData.uuid}/snapshots`);
                },
              },
            ]
          : []
        : [
            ...(rbac?.repoWrite
              ? [
                  {
                    isDisabled: actionTakingPlace || rowData?.status === 'Pending',
                    title: 'Edit',
                    ouiaId: 'kebab_edit',
                    onClick: () => {
                      navigate(`${rowData.uuid}/${EDIT_ROUTE}`);
                    },
                  },
                  ...(rowData.origin === ContentOrigin.UPLOAD
                    ? [
                        {
                          isDisabled: actionTakingPlace || rowData?.status === 'Pending',
                          title: 'Upload content',
                          ouiaId: 'kebab_upload_content',
                          onClick: () => {
                            navigate(`${rowData.uuid}/${UPLOAD_ROUTE}`);
                          },
                        },
                      ]
                    : []),
                ]
              : []),
            ...(features?.snapshots?.accessible
              ? [
                  {
                    isDisabled: actionTakingPlace || !rowData.last_snapshot_uuid,
                    title: rowData.last_snapshot_uuid ? 'View all snapshots' : 'No snapshots yet',
                    ouiaId: 'kebab_view_snapshots',
                    onClick: () => {
                      navigate(`${rowData.uuid}/snapshots`);
                    },
                  },
                  ...(rbac?.repoWrite && rowData.origin !== ContentOrigin.UPLOAD
                    ? [
                        {
                          id: 'actions-column-snapshot',
                          className:
                            actionTakingPlace || rowData?.status === 'Pending' || !rowData.snapshot
                              ? classes.disabledButton
                              : '',
                          isDisabled:
                            actionTakingPlace || rowData?.status === 'Pending' || !rowData.snapshot,
                          title: 'Trigger snapshot',
                          ouiaId: 'kebab_trigger_snapshots',
                          onClick: () => {
                            triggerIntrospectionAndSnapshot(rowData?.uuid);
                          },
                          tooltipProps: !rowData.snapshot
                            ? {
                                content: 'Snapshots disabled for this repository.',
                                position: TooltipPosition.left,
                                triggerRef: () =>
                                  document.getElementById('actions-column-snapshot') ||
                                  document.body,
                              }
                            : undefined,
                        },
                      ]
                    : []),
                ]
              : []),
            ...(rbac?.repoWrite && !rowData?.snapshot
              ? [
                  {
                    isDisabled: actionTakingPlace || rowData?.status == 'Pending',
                    title: 'Introspect now',
                    ouiaId: 'kebab_introspect_now',
                    onClick: () =>
                      introspectRepoForUuid(rowData?.uuid).then(clearCheckedRepositories),
                  },
                ]
              : []),
            ...(rbac?.repoWrite
              ? [
                  { isSeparator: true },
                  {
                    title: 'Delete',
                    ouiaId: 'kebab_delete',
                    onClick: () => navigate(`${DELETE_ROUTE}?repoUUID=${rowData.uuid}`),
                  },
                ]
              : []),
          ],
    [actionTakingPlace, checkedRepositories, isRedHatRepository],
  );

  const clearCheckedRepositories = () => setCheckedRepositories(new Map<string, ContentItem>());

  // Applied to all repos on current page
  const selectAllRepos = (_, checked: boolean) => {
    if (checked) {
      const newMap = new Map<string, ContentItem>(checkedRepositories);
      data.data.forEach((contentItem) => newMap.set(contentItem.uuid, contentItem));
      setCheckedRepositories(newMap);
    } else {
      const newMap = new Map<string, ContentItem>(checkedRepositories);
      for (const contentItem of data.data) {
        newMap.delete(contentItem.uuid);
      }
      setCheckedRepositories(newMap);
    }
  };

  const atLeastOneRepoChecked = useMemo(() => checkedRepositories.size >= 1, [checkedRepositories]);

  const areAllReposSelected = useMemo(() => {
    let atLeastOneSelectedOnPage = false;
    const allSelectedOrPending = data.data.every((contentItem) => {
      if (checkedRepositories.has(contentItem.uuid)) {
        atLeastOneSelectedOnPage = true;
      }
      return checkedRepositories.has(contentItem.uuid);
    });
    // Returns false if all repos on current page are pending (none selected)
    return allSelectedOrPending && atLeastOneSelectedOnPage;
  }, [data, checkedRepositories]);

  const onSelectRepo = (uuid: string, value: boolean, contentItem: ContentItem) => {
    const newMap = new Map(checkedRepositories);
    if (value) {
      newMap.set(uuid, contentItem);
    } else {
      newMap.delete(uuid);
    }
    setCheckedRepositories(newMap);
  };

  const itemName =
    contentOrigin.length >= 2 &&
    contentOrigin.includes(ContentOrigin.EXTERNAL) &&
    contentOrigin.includes(ContentOrigin.UPLOAD)
      ? 'custom repositories'
      : 'Red Hat repositories';
  const notFilteredBody = 'To get started, create a custom repository';

  const countIsZero = count === 0;
  const showLoader = countIsZero && notFiltered && !isLoading;

  // If Red Hat repositories returns a 0 count
  if (notFiltered && countIsZero && !isFetching && isRedHatRepository) {
    throw new Error('Unable to load Red Hat repositories');
  }

  const showPendingTooltip = (
    snapshotStatus: string | undefined,
    introspectStatus: string | undefined,
  ) => {
    if (!snapshotStatus && !introspectStatus) {
      return 'Introspection or snapshotting is in progress';
    } else if (snapshotStatus === 'running' || snapshotStatus === 'pending') {
      return 'Snapshotting is in progress';
    } else if (introspectStatus === 'Pending') {
      return 'Introspection is in progress';
    }
  };

  return (
    <>
      {/* This ensures that the modal doesn't temporarily flash on initial render */}
      <Hide hide={isLoading}>
        <Outlet
          context={{
            clearCheckedRepositories,
            deletionContext: {
              page,
              perPage,
              filterData,
              contentOrigin,
              sortString: sortString,
              checkedRepositories,
            },
          }}
        />
      </Hide>
      <div
        data-ouia-component-id='content_list_page'
        className={countIsZero ? classes.mainContainer100Height : classes.mainContainer}
      >
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className={`${spacing.pyMd} ${spacing.pxLg}`}
        >
          <ContentListFilters
            contentOrigin={contentOrigin}
            setContentOrigin={setContentOrigin}
            isLoading={isLoading}
            setFilterData={(values) => {
              setFilterData(values);
              setPage(1);
            }}
            filterData={filterData}
            atLeastOneRepoChecked={atLeastOneRepoChecked}
            numberOfReposChecked={checkedRepositories.size}
            checkedRepositories={checkedRepositories}
          />
          <Pagination
            id='top-pagination-id'
            widgetId='topPaginationWidgetId'
            isDisabled={isLoading}
            itemCount={count}
            perPage={perPage}
            page={page}
            onSetPage={onSetPage}
            isCompact
            onPerPageSelect={onPerPageSelect}
          />
        </Flex>
        {showLoader ? (
          <Bullseye data-ouia-component-id='content_list_page'>
            <EmptyTableState
              notFiltered={notFiltered}
              clearFilters={clearFilters}
              itemName={itemName}
              notFilteredBody={notFilteredBody}
              notFilteredButton={
                <ConditionalTooltip
                  content='You do not have the required permissions to perform this action.'
                  show={!rbac?.repoWrite}
                  setDisabled
                >
                  <Button
                    id='createContentSourceButton'
                    ouiaId='create_content_source'
                    variant='primary'
                    isDisabled={isLoading}
                    onClick={() => navigate(ADD_ROUTE)}
                  >
                    Add repositories
                  </Button>
                </ConditionalTooltip>
              }
            />
          </Bullseye>
        ) : (
          <>
            <Hide hide={!isLoading}>
              <Grid className={classes.mainContainer}>
                <SkeletonTable
                  rows={perPage}
                  columnsCount={columnHeaders.length}
                  variant={TableVariant.compact}
                />
              </Grid>
            </Hide>
            <Hide hide={countIsZero || isLoading}>
              <Stack className={spacing.pxLg}>
                <Table
                  aria-label='Custom repositories table'
                  ouiaId='custom_repositories_table'
                  variant='compact'
                >
                  <Thead>
                    <Tr>
                      <Hide
                        hide={
                          !rbac?.repoWrite ||
                          isRedHatRepository ||
                          isCommunityRepository ||
                          isRedHatOrCommunity
                        }
                      >
                        <Th
                          aria-label='select-repo-checkbox'
                          className={classes.checkboxMinWidth}
                          select={{
                            onSelect: selectAllRepos,
                            isSelected: areAllReposSelected,
                          }}
                        />
                      </Hide>
                      {columnHeaders.map((columnHeader, index) =>
                        columnHeader === 'Status' ? (
                          <Th key={columnHeader + 'column'}>{columnHeader}</Th>
                        ) : (
                          <Th key={columnHeader + 'column'} sort={sortParams(index)}>
                            {columnHeader}
                          </Th>
                        ),
                      )}
                      <Th aria-label='loading-spinner'>
                        {actionTakingPlace && <Spinner size='md' />}
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {contentList.map((rowData: ContentItem, index) => {
                      const {
                        uuid,
                        name,
                        url,
                        last_snapshot,
                        distribution_arch,
                        distribution_versions,
                        last_introspection_time,
                        status,
                        origin,
                      } = rowData;
                      return (
                        <Tr key={uuid + status}>
                          <Hide
                            hide={
                              !rbac?.repoWrite ||
                              isRedHatRepository ||
                              isCommunityRepository ||
                              isRedHatOrCommunity
                            }
                          >
                            <Td
                              select={{
                                rowIndex: index,
                                onSelect: (_event, isSelecting) =>
                                  onSelectRepo(rowData.uuid, isSelecting, rowData),
                                isSelected: checkedRepositories.has(rowData.uuid),
                              }}
                            />
                          </Hide>
                          <Td>
                            {name}
                            <Hide hide={origin !== ContentOrigin.UPLOAD}>
                              <UploadRepositoryLabel />
                            </Hide>
                            <Hide hide={origin !== ContentOrigin.COMMUNITY}>
                              <CommunityRepositoryLabel />
                            </Hide>
                            <Hide hide={origin === ContentOrigin.UPLOAD}>
                              <UrlWithExternalIcon href={url} />
                            </Hide>
                            <Hide hide={!features?.snapshots?.accessible}>
                              <Flex>
                                <FlexItem className={classes.snapshotInfoText}>
                                  {last_snapshot
                                    ? `Last snapshot ${dayjs(last_snapshot?.created_at).fromNow()}`
                                    : 'No snapshot yet'}
                                </FlexItem>
                                <Hide hide={!last_snapshot}>
                                  <FlexItem className={classes.inline}>
                                    <FlexItem className={classes.snapshotInfoText}>
                                      Changes:
                                    </FlexItem>
                                    <ChangedArrows
                                      addedCount={last_snapshot?.added_counts?.['rpm.package'] || 0}
                                      removedCount={
                                        last_snapshot?.removed_counts?.['rpm.package'] || 0
                                      }
                                    />
                                  </FlexItem>
                                </Hide>
                              </Flex>
                            </Hide>
                          </Td>
                          <Td>{archesDisplay(distribution_arch)}</Td>
                          <Td>{versionDisplay(distribution_versions)}</Td>
                          <Td>
                            <PackageCount rowData={rowData} />
                          </Td>
                          <Td>{lastIntrospectionDisplay(last_introspection_time)}</Td>
                          <Td>
                            <StatusIcon rowData={rowData} retryHandler={introspectRepoForUuid} />
                          </Td>
                          <Hide hide={!rowActions(rowData)?.length}>
                            <Td isActionCell>
                              <ConditionalTooltip
                                content={showPendingTooltip(
                                  rowData?.last_snapshot_task?.status,
                                  rowData.status,
                                )}
                                show={!isRedHatRepository && rowData?.status === 'Pending'}
                              >
                                <ActionsColumn items={rowActions(rowData)} />
                              </ConditionalTooltip>
                            </Td>
                          </Hide>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
                <Flex className={classes.bottomContainer}>
                  <FlexItem />
                  <FlexItem>
                    <Pagination
                      id='bottom-pagination-id'
                      widgetId='bottomPaginationWidgetId'
                      itemCount={count}
                      perPage={perPage}
                      page={page}
                      onSetPage={onSetPage}
                      variant={PaginationVariant.bottom}
                      onPerPageSelect={onPerPageSelect}
                    />
                  </FlexItem>
                </Flex>
              </Stack>
            </Hide>
            <Hide hide={!countIsZero || isLoading}>
              <EmptyTableState
                notFiltered={notFiltered}
                clearFilters={clearFilters}
                itemName={itemName}
                notFilteredBody={notFilteredBody}
                notFilteredButton={
                  <ConditionalTooltip
                    content='You do not have the required permissions to perform this action.'
                    show={!rbac?.repoWrite}
                    setDisabled
                  >
                    <Button
                      id='createContentSourceButton'
                      ouiaId='create_content_source'
                      variant='primary'
                      isDisabled={isLoading}
                      onClick={() => navigate(ADD_ROUTE)}
                    >
                      Add repositories
                    </Button>
                  </ConditionalTooltip>
                }
              />
            </Hide>
          </>
        )}
      </div>
    </>
  );
};

export const useContentListOutletContext = () =>
  useOutletContext<{
    clearCheckedRepositories: () => void;
    deletionContext: {
      page: number;
      perPage: number;
      filterData: FilterData;
      contentOrigin: ContentOrigin[];
      sortString: string;
      checkedRepositories: Map<string, ContentItem>;
    };
  }>();

export default ContentListTable;
