import {
  Button,
  Flex,
  FlexItem,
  Grid,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Pagination,
  PaginationVariant,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  IAction,
  InnerScrollContainer,
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
import { SkeletonTable } from '@patternfly/react-component-groups';
import Hide from 'components/Hide/Hide';
import { ContentOrigin, SnapshotItem } from 'services/Content/ContentApi';
import { useFetchContent, useGetSnapshotList } from 'services/Content/ContentQueries';
import { Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import useRootPath from 'Hooks/useRootPath';
import ChangedArrows from './components/ChangedArrows';
import { useAppContext } from 'middleware/AppContext';
import RepoConfig from './components/RepoConfig';
import { DELETE_ROUTE, REPOSITORIES_ROUTE } from 'Routes/constants';
import { SnapshotDetailTab } from '../SnapshotDetailsModal/SnapshotDetailsModal';
import { formatDateDDMMMYYYY } from 'helpers';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import LatestRepoConfig from './components/LatestRepoConfig';

const useStyles = createUseStyles({
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  topContainer: {
    justifyContent: 'space-between',
    padding: '16px 24px',
    height: 'fit-content',
  },
  bottomContainer: {
    justifyContent: 'space-between',
  },
  checkboxMinWidth: {
    minWidth: '45px!important',
  },
});

const perPageKey = 'snapshotPerPage';

const SnapshotListModal = () => {
  const classes = useStyles();
  const rootPath = useRootPath();
  const { repoUUID: uuid = '' } = useParams();
  const { contentOrigin, rbac } = useAppContext();
  const navigate = useNavigate();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [activeSortIndex, setActiveSortIndex] = useState<number>(0);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('desc');
  const [checkedSnapshots, setCheckedSnapshots] = useState<Set<string>>(new Set<string>());

  const columnHeaders = ['Snapshots', 'Change', 'Packages', 'Advisories', 'Config'];

  const columnSortAttributes = ['created_at'];

  const sortString = useMemo(
    () => columnSortAttributes[activeSortIndex] + ':' + activeSortDirection,
    [activeSortIndex, activeSortDirection],
  );

  useEffect(() => {
    setPage(1);
  }, [sortString]);

  const {
    isLoading,
    isFetching,
    isError,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useGetSnapshotList(uuid as string, page, perPage, sortString);

  const { data: contentData } = useFetchContent(uuid);

  useEffect(() => {
    if (isError) {
      onClose();
    }
  }, [isError]);

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    setPerPage(newPerPage);
    setPage(newPage);
    localStorage.setItem(perPageKey, newPerPage.toString());
  };

  const sortParams = (columnIndex: number, isDisabled: boolean): ThProps['sort'] | undefined => {
    if (isDisabled || !columnSortAttributes[columnIndex]) return;
    return {
      sortBy: {
        index: activeSortIndex,
        direction: activeSortDirection,
        defaultDirection: 'desc', // starting sort direction when first sorting a column. Defaults to 'desc'
      },
      onSort: (_event, index, direction) => {
        setActiveSortIndex(index);
        setActiveSortDirection(direction);
      },
      columnIndex,
    };
  };

  const onClose = () =>
    navigate(
      `${rootPath}/${REPOSITORIES_ROUTE}` +
        (contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.REDHAT
          ? `?origin=${contentOrigin}`
          : ''),
    );

  const onSelectSnapshot = (uuid: string, value: boolean) => {
    const newSet = new Set<string>(checkedSnapshots);
    if (value) {
      newSet.add(uuid);
    } else {
      newSet.delete(uuid);
    }
    setCheckedSnapshots(newSet);
  };

  const clearCheckedSnapshots = () => setCheckedSnapshots(new Set<string>());

  const selectAllSnapshots = (_, checked: boolean) => {
    if (checked) {
      const newSet = new Set<string>(checkedSnapshots);
      data.data.forEach((snapshot) => newSet.add(snapshot.uuid));
      setCheckedSnapshots(newSet);
    } else {
      const newSet = new Set<string>(checkedSnapshots);
      for (const snapshot of data.data) {
        newSet.delete(snapshot.uuid);
      }
      setCheckedSnapshots(newSet);
    }
  };

  const atLeastOneRepoChecked = useMemo(() => checkedSnapshots.size >= 1, [checkedSnapshots]);

  const areAllSnapshotsSelected = useMemo(() => {
    let atLeastOneSelectedOnPage = false;
    const allSelectedOrPending = data.data.every((snapshot) => {
      if (checkedSnapshots.has(snapshot.uuid)) {
        atLeastOneSelectedOnPage = true;
      }
      return checkedSnapshots.has(snapshot.uuid);
    });
    // Returns false if all repos on current page are pending (none selected)
    return allSelectedOrPending && atLeastOneSelectedOnPage;
  }, [data, checkedSnapshots]);

  const {
    data: snapshotsList = [],
    meta: { count = 0 },
  } = data;

  const fetchingOrLoading = isFetching || isLoading;

  const loadingOrZeroCount = fetchingOrLoading || !count;

  const isRedHatRepository = contentData?.origin == ContentOrigin.REDHAT;

  const isEPELRepository = contentData?.origin == ContentOrigin.COMMUNITY;

  const latestSnapshotUUID = snapshotsList[0]?.uuid;

  const rowActions = useCallback(
    (snap_uuid: string): IAction[] =>
      isRedHatRepository || isEPELRepository
        ? []
        : [
            {
              isDisabled: count < 2,
              title: 'Delete',
              onClick: () => navigate(`${DELETE_ROUTE}?snapshotUUID=${snap_uuid}`),
            },
          ],
    [isRedHatRepository, isEPELRepository, data, count],
  );

  return (
    <>
      <Hide hide={isLoading}>
        <Outlet
          context={{
            clearCheckedSnapshots,
            deletionContext: {
              checkedSnapshots,
            },
          }}
        />
      </Hide>
      <Modal
        key={uuid}
        position='top'
        aria-labelledby='snapshot-list-modal-title'
        aria-describedby='snapshot-list-modal-description'
        ouiaId='snapshot_list_modal'
        variant={ModalVariant.medium}
        isOpen
        onClose={onClose}
      >
        <ModalHeader
          title='Snapshots'
          labelId='snapshot-list-modal-title'
          description={`View list of snapshots for ${contentData?.name ? contentData.name : 'a repository'}.`}
          descriptorId='snapshot-list-modal-description'
        />
        <InnerScrollContainer>
          <Grid className={classes.mainContainer}>
            <Hide hide={loadingOrZeroCount}>
              <Flex className={classes.topContainer}>
                <Hide hide={isRedHatRepository || isEPELRepository}>
                  <FlexItem>
                    <ConditionalTooltip
                      content='You do not have the required permissions to perform this action.'
                      show={!rbac?.repoWrite}
                      setDisabled
                    >
                      <Button
                        key='confirm'
                        ouiaId='remove_snapshots_bulk'
                        variant='primary'
                        isLoading={fetchingOrLoading}
                        isDisabled={
                          loadingOrZeroCount ||
                          !atLeastOneRepoChecked ||
                          checkedSnapshots.size == count ||
                          !rbac?.repoWrite
                        }
                        onClick={() => navigate(DELETE_ROUTE)}
                      >
                        {!checkedSnapshots.size || !rbac?.repoWrite
                          ? 'Delete selected snapshots'
                          : checkedSnapshots.size == count
                            ? `Can't delete all snapshots`
                            : `Delete ${checkedSnapshots.size} snapshots`}
                      </Button>
                    </ConditionalTooltip>
                  </FlexItem>
                </Hide>
                <FlexItem>
                  <LatestRepoConfig repoUUID={uuid} snapUUID={latestSnapshotUUID} />
                </FlexItem>
                <FlexItem>
                  <Pagination
                    id='top-pagination-id'
                    widgetId='topPaginationWidgetId'
                    itemCount={count}
                    perPage={perPage}
                    page={page}
                    onSetPage={onSetPage}
                    isCompact
                    onPerPageSelect={onPerPageSelect}
                  />
                </FlexItem>
              </Flex>
            </Hide>
            <Hide hide={!fetchingOrLoading}>
              <Grid className={classes.mainContainer}>
                <SkeletonTable
                  rows={perPage}
                  columnsCount={columnHeaders.length}
                  variant={TableVariant.compact}
                />
              </Grid>
            </Hide>
            <Hide hide={fetchingOrLoading}>
              <Table
                aria-label='snapshot list table'
                ouiaId='snapshot_list_table'
                variant='compact'
              >
                <Hide hide={loadingOrZeroCount}>
                  <Thead>
                    <Tr>
                      <Hide
                        hide={
                          !rbac?.repoWrite || isRedHatRepository || isEPELRepository || count < 2
                        }
                      >
                        <Th
                          aria-label='select-snapshot-checkbox'
                          className={classes.checkboxMinWidth}
                          select={{
                            onSelect: selectAllSnapshots,
                            isSelected: areAllSnapshotsSelected,
                          }}
                        />
                      </Hide>
                      {columnHeaders.map((columnHeader, index) => (
                        <Th
                          key={columnHeader + '_column'}
                          sort={sortParams(index, loadingOrZeroCount)}
                        >
                          {columnHeader}
                        </Th>
                      ))}
                    </Tr>
                  </Thead>
                </Hide>
                <Tbody>
                  {snapshotsList.map(
                    (
                      {
                        uuid: snap_uuid,
                        created_at,
                        content_counts,
                        added_counts,
                        removed_counts,
                      }: SnapshotItem,
                      index: number,
                    ) => (
                      <Tr key={created_at + index} data-uuid={snap_uuid}>
                        <Hide
                          hide={
                            !rbac?.repoWrite || isRedHatRepository || isEPELRepository || count < 2
                          }
                        >
                          <Td
                            select={{
                              rowIndex: index,
                              onSelect: (_event, isSelecting) =>
                                onSelectSnapshot(snap_uuid, isSelecting),
                              isSelected: checkedSnapshots.has(snap_uuid),
                            }}
                          />
                        </Hide>
                        <Td>{formatDateDDMMMYYYY(created_at, true)}</Td>
                        <Td>
                          <ChangedArrows
                            addedCount={added_counts?.['rpm.package'] || 0}
                            removedCount={removed_counts?.['rpm.package'] || 0}
                          />
                        </Td>
                        <Td>
                          <Button
                            variant='link'
                            ouiaId='snapshot_package_count_button'
                            isInline
                            isDisabled={!content_counts?.['rpm.package']}
                            onClick={() =>
                              navigate(
                                `${rootPath}/${REPOSITORIES_ROUTE}/${uuid}/snapshots/${snap_uuid}`,
                              )
                            }
                          >
                            {content_counts?.['rpm.package'] || 0}
                          </Button>
                        </Td>
                        <Td>
                          <Button
                            variant='link'
                            ouiaId='snapshot_advisory_count_button'
                            isInline
                            isDisabled={!content_counts?.['rpm.advisory']}
                            onClick={() =>
                              navigate(
                                `${rootPath}/${REPOSITORIES_ROUTE}/${uuid}/snapshots/${snap_uuid}?tab=${SnapshotDetailTab.ERRATA}`,
                              )
                            }
                          >
                            {content_counts?.['rpm.advisory'] || 0}
                          </Button>
                        </Td>
                        <Td>
                          <RepoConfig repoUUID={uuid} snapUUID={snap_uuid} latest={false} />
                        </Td>
                        <Hide hide={!rowActions(snap_uuid)?.length}>
                          <Td isActionCell>
                            <ConditionalTooltip
                              content={
                                count < 2
                                  ? `You can't delete the last snapshot in a repository`
                                  : 'You do not have the required permissions to perform this action.'
                              }
                              show={
                                !isRedHatRepository &&
                                !isEPELRepository &&
                                (!rbac?.repoWrite || count < 2)
                              }
                              setDisabled
                            >
                              <ActionsColumn items={rowActions(snap_uuid)} />
                            </ConditionalTooltip>
                          </Td>
                        </Hide>
                      </Tr>
                    ),
                  )}
                </Tbody>
              </Table>
            </Hide>
            <Flex className={classes.bottomContainer}>
              <FlexItem />
              <FlexItem>
                <Hide hide={loadingOrZeroCount}>
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
                </Hide>
              </FlexItem>
            </Flex>
          </Grid>
        </InnerScrollContainer>
        <ModalFooter>
          <Button key='close' variant='secondary' onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export const useSnapshotListOutletContext = () =>
  useOutletContext<{
    clearCheckedSnapshots: () => void;
    deletionContext: {
      checkedSnapshots: Set<string>;
    };
  }>();

export default SnapshotListModal;
