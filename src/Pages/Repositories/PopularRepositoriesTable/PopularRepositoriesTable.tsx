import {
  Label,
  LabelGroup,
  Button,
  Flex,
  FlexItem,
  Grid,
  InputGroup,
  Pagination,
  PaginationVariant,
  Spinner,
  TextInput,
  InputGroupItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Stack,
} from '@patternfly/react-core';
import { Table, TableVariant, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useEffect, useState, useMemo } from 'react';
import { createUseStyles } from 'react-jss';
import { SkeletonTable } from '@patternfly/react-component-groups';

import {
  usePopularRepositoriesQuery,
  useDeletePopularRepositoryMutate,
  useAddPopularRepositoryQuery,
  useBulkDeleteContentItemMutate,
} from 'services/Content/ContentQueries';
import {
  ContentOrigin,
  CreateContentRequest,
  CreateContentRequestItem,
  FilterData,
  PopularRepository,
} from 'services/Content/ContentApi';
import Hide from 'components/Hide/Hide';
import { useQueryClient } from 'react-query';
import { useAppContext } from 'middleware/AppContext';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import UrlWithExternalIcon from 'components/UrlWithLinkIcon/UrlWithLinkIcon';
import { SearchIcon } from '@patternfly/react-icons';
import useDebounce from 'Hooks/useDebounce';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import DeleteKebab from 'components/DeleteKebab/DeleteKebab';
import { repoToRequestItem } from './helper';
import { AddRepo } from './components/AddRepo';

import { DELETE_ROUTE } from 'Routes/constants';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import useArchVersion from 'Hooks/useArchVersion';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';

const useStyles = createUseStyles({
  chipsContainer: {
    paddingTop: '16px',
    display: 'flex',
    alignItems: 'center',
  },
  clearFilters: {
    marginLeft: '16px',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  bottomContainer: {
    justifyContent: 'space-between',
  },
  invisible: {
    opacity: 0,
  },
  addRepositoriesButton: {
    marginLeft: '16px',
  },
  checkboxMinWidth: {
    minWidth: '45px!important',
  },
  repositoryActions: {
    display: 'flex',
    flexDirection: 'row',
  },
});

const perPageKey = 'popularRepositoriesperPage';

const PopularRepositoriesTable = () => {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const { rbac, features } = useAppContext();
  const navigate = useNavigate();
  // Uses urls as map key because uuids don't exist on repositories that haven't been created
  const [checkedRepositoriesToAdd, setCheckedRepositoriesToAdd] = useState<
    Map<string, CreateContentRequestItem>
  >(new Map());
  // Map of uuids and repos which are required for bulk delete
  const [checkedRepositoriesToDelete, setCheckedRepositoriesToDelete] = useState<
    Map<string, PopularRepository>
  >(new Map());
  const [selectedData, setSelectedData] = useState<CreateContentRequest>([]);
  const [selectedUUID, setSelectedUUID] = useState<string>('');

  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearchValue = useDebounce(searchValue);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [isActionOpen, setIsActionOpen] = useState(false);

  const {
    archesDisplay,
    versionDisplay,
    isLoading: repositoryParamsLoading,
    isError: repositoryParamsIsError,
    error: repositoryParamsError,
  } = useArchVersion();

  const onDropdownToggle = () => {
    setIsActionOpen((prev) => !prev);
  };

  const onDropdownFocus = () => {
    const element = document.getElementById('toggle-add-selected');
    element?.focus();
  };

  const onDropdownSelect = () => {
    setIsActionOpen(false);
    onDropdownFocus();
  };

  const {
    isLoading,
    error,
    isError,
    isFetching,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = usePopularRepositoriesQuery(page, perPage, {
    search: !searchValue ? searchValue : debouncedSearchValue,
  });

  const { mutateAsync: addContentQuery, isLoading: isAdding } = useAddPopularRepositoryQuery(
    queryClient,
    selectedData,
    page,
    perPage,
    { search: debouncedSearchValue } as FilterData,
  );

  const clearCheckedRepositories = () => {
    setCheckedRepositoriesToAdd(new Map());
    setCheckedRepositoriesToDelete(new Map());
  };

  const selectAllRepos = (_, checked: boolean) => {
    const newDeleteMap = new Map(checkedRepositoriesToDelete);
    const newAddMap = new Map(checkedRepositoriesToAdd);
    if (checked) {
      popularData.forEach((repo) => {
        if (repo.uuid) {
          newDeleteMap.set(repo.uuid, repo);
        } else {
          newAddMap.set(repo.url, repoToRequestItem(repo));
        }
      });
    } else {
      popularData.forEach((repo) => {
        if (repo.uuid) {
          newDeleteMap.delete(repo.uuid);
        } else {
          newAddMap.delete(repo.url);
        }
      });
    }
    setCheckedRepositoriesToDelete(newDeleteMap);
    setCheckedRepositoriesToAdd(newAddMap);
  };

  const atLeastOneRepoToDeleteChecked = useMemo(
    () => checkedRepositoriesToDelete.size >= 1,
    [checkedRepositoriesToDelete],
  );
  const atLeastOneRepoToAddChecked = useMemo(
    () => checkedRepositoriesToAdd.size >= 1,
    [checkedRepositoriesToAdd],
  );

  const areAllReposSelected = useMemo(
    () =>
      data.data.every((repo) => {
        if (repo.uuid) {
          return checkedRepositoriesToDelete.has(repo.uuid);
        } else {
          return checkedRepositoriesToAdd.has(repo.url);
        }
      }),
    [data, checkedRepositoriesToAdd, checkedRepositoriesToDelete],
  );

  const onSelectRepo = (repo: PopularRepository, value: boolean) => {
    if (repo.uuid) {
      const newMap = new Map(checkedRepositoriesToDelete);
      if (value) {
        newMap.set(repo.uuid, repo);
      } else {
        newMap.delete(repo.uuid);
      }
      setCheckedRepositoriesToDelete(newMap);
    } else {
      const newMap = new Map(checkedRepositoriesToAdd);
      if (value) {
        newMap.set(repo.url, repoToRequestItem(repo));
      } else {
        newMap.delete(repo.url);
      }
      setCheckedRepositoriesToAdd(newMap);
    }
  };

  useEffect(() => {
    if (!isFetching) {
      setSelectedData([]);
      setSelectedUUID('');
    }
  }, [isFetching]);

  useEffect(() => {
    if (selectedData.length != 0) {
      addContentQuery().then(
        () => {
          setSelectedData([]);
          clearCheckedRepositories();
        },
        () => setSelectedData([]),
      );
    }
  }, [selectedData]);

  const { isLoading: isDeleting } = useDeletePopularRepositoryMutate(queryClient, page, perPage, {
    search: debouncedSearchValue,
  } as FilterData);

  const { isLoading: isDeletingItems } = useBulkDeleteContentItemMutate(
    queryClient,
    checkedRepositoriesToDelete,
    page,
    perPage,
    [ContentOrigin.CUSTOM],
    { search: debouncedSearchValue } as FilterData,
    undefined, // sort string
  );

  // Other update actions will be added to this later.
  const actionTakingPlace =
    isDeleting || isFetching || repositoryParamsLoading || isAdding || isDeletingItems;

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    localStorage.setItem(perPageKey, newPerPage.toString());
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const addSelected = (snapshot: boolean) => {
    const request: CreateContentRequest = [];
    checkedRepositoriesToAdd.forEach((repo) => {
      request.push({
        ...repo,
        snapshot,
      });
    });
    setSelectedData(request);
  };

  const addRepo = (key: number, repo: PopularRepository, snapshot: boolean) => {
    const newData: CreateContentRequest = [];
    newData[key] = repoToRequestItem(repo, snapshot);
    setSelectedData(newData);
  };

  const columnHeaders = ['Name', 'Architecture', 'OS versions'];

  // Error is caught in the wrapper component
  if (isError) throw error;
  if (repositoryParamsIsError) throw repositoryParamsError;

  const {
    data: popularData = [],
    meta: { count = 0 },
  } = data;

  const countIsZero = !data?.data?.length;

  return (
    <>
      <Outlet
        context={{
          deletionContext: {
            checkedRepositoriesToDelete,
          },
        }}
      />
      <div data-ouia-component-id='popular_repositories_page' className={classes.mainContainer}>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className={`${spacing.pyMd} ${spacing.pxLg}`}
        >
          <FlexItem>
            <InputGroup>
              <InputGroupItem isFill>
                <TextInput
                  isDisabled={isLoading}
                  type='search'
                  id='search'
                  customIcon={<SearchIcon />}
                  ouiaId='popular_filter_search'
                  placeholder='Filter by name/url'
                  value={searchValue}
                  onChange={(_event, val) => setSearchValue(val)}
                />
              </InputGroupItem>
              <InputGroupItem>
                <FlexItem className={classes.repositoryActions}>
                  {/* RBAC popover takes precedence */}

                  {(() => {
                    const defaultText = atLeastOneRepoToAddChecked
                      ? `Add ${checkedRepositoriesToAdd.size} repositories`
                      : 'Add selected repositories';
                    const isDisabled = !rbac?.repoWrite || !atLeastOneRepoToAddChecked;
                    if (features?.snapshots?.enabled && features.snapshots.accessible) {
                      return (
                        <Dropdown
                          onSelect={onDropdownSelect}
                          className={classes.addRepositoriesButton}
                          ouiaId='add-selected-toggle-dropdown'
                          toggle={(toggleRef) => (
                            <ConditionalTooltip
                              content={
                                !rbac?.repoWrite
                                  ? 'You do not have the required permissions to perform this action.'
                                  : 'Make a selection below to add multiple repositories.'
                              }
                              show={!rbac?.repoWrite || !atLeastOneRepoToAddChecked}
                              setDisabled
                            >
                              <MenuToggle
                                ref={toggleRef}
                                ouiaId='add-selected-dropdown-toggle-no-snap'
                                onClick={onDropdownToggle}
                                isDisabled={isDisabled}
                                splitButtonItems={[
                                  <DropdownItem
                                    key='action'
                                    component='button'
                                    onClick={() => addSelected(true)}
                                    ouiaId='add-selected-repos-no-snap'
                                  >
                                    {defaultText}
                                  </DropdownItem>,
                                ]}
                              />
                            </ConditionalTooltip>
                          )}
                          isOpen={isActionOpen}
                        >
                          <DropdownList>
                            <DropdownItem
                              key='action'
                              component='button'
                              onClick={() => addSelected(false)}
                              ouiaId='add-selected-repos-no-snap'
                            >
                              {`Add ${checkedRepositoriesToAdd.size} repositories without snapshotting`}
                            </DropdownItem>
                          </DropdownList>
                        </Dropdown>
                      );
                    } else {
                      return (
                        <Button
                          onClick={() => addSelected(false)}
                          className={classes.addRepositoriesButton}
                          isDisabled={isDisabled}
                          ouiaId='add_checked_repos'
                        >
                          {defaultText}
                        </Button>
                      );
                    }
                  })()}
                  <ConditionalTooltip
                    content='You do not have the required permissions to perform this action.'
                    show={!rbac?.repoWrite}
                    setDisabled
                  >
                    <DeleteKebab
                      atLeastOneRepoChecked={atLeastOneRepoToDeleteChecked}
                      numberOfReposChecked={checkedRepositoriesToDelete.size}
                      toggleOuiaId='popular_repositories_kebab_toggle'
                      isDisabled={!rbac?.repoWrite}
                    />
                  </ConditionalTooltip>
                </FlexItem>
              </InputGroupItem>
            </InputGroup>
            {searchValue !== '' && (
              <Flex>
                <FlexItem fullWidth={{ default: 'fullWidth' }} className={classes.chipsContainer}>
                  <LabelGroup categoryName='Name/URL'>
                    <Label variant='outline' key='search_chip' onClose={() => setSearchValue('')}>
                      {searchValue}
                    </Label>
                  </LabelGroup>
                  <Button
                    className={classes.clearFilters}
                    onClick={() => setSearchValue('')}
                    variant='link'
                    isInline
                  >
                    Clear filters
                  </Button>
                </FlexItem>
              </Flex>
            )}
          </FlexItem>
          <FlexItem>
            <Hide hide={isLoading || countIsZero}>
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
              <Hide hide={!debouncedSearchValue}></Hide>
            </Hide>
          </FlexItem>
        </Flex>
        <Hide hide={!isLoading}>
          <Grid className={classes.mainContainer}>
            <SkeletonTable
              rows={perPage}
              columnsCount={columnHeaders.length}
              variant={TableVariant.compact}
            />
          </Grid>
        </Hide>
        <Hide hide={isLoading || countIsZero}>
          <Stack className={spacing.pxLg}>
            <Table
              aria-label='Popular repositories table'
              ouiaId='popular_repos_table'
              variant='compact'
            >
              <Thead>
                <Tr>
                  <Hide hide={!rbac?.repoWrite}>
                    <Th
                      aria-label='popular repositories selection column'
                      className={classes.checkboxMinWidth}
                      select={{
                        onSelect: selectAllRepos,
                        isSelected: areAllReposSelected,
                      }}
                    />
                  </Hide>
                  {columnHeaders.map((columnHeader) => (
                    <Th key={columnHeader + 'column'}>{columnHeader}</Th>
                  ))}
                  <Th>
                    <Spinner size='md' className={actionTakingPlace ? '' : classes.invisible} />
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {popularData.map((repo, key) => {
                  const {
                    uuid,
                    existing_name,
                    suggested_name,
                    url,
                    distribution_arch,
                    distribution_versions,
                  } = repo;
                  return (
                    <Tr key={suggested_name + uuid}>
                      <Hide hide={!rbac?.repoWrite}>
                        {/* Never disabled because popular repositories can be both added and deleted */}
                        <Td
                          select={{
                            rowIndex: key,
                            onSelect: (_event, isSelecting) => onSelectRepo(repo, isSelecting),
                            isSelected: uuid
                              ? checkedRepositoriesToDelete.has(uuid)
                              : checkedRepositoriesToAdd.has(url),
                          }}
                        />
                      </Hide>
                      <Td>
                        <>
                          <Flex direction={{ default: 'row' }}>
                            <FlexItem>{suggested_name}</FlexItem>
                            {existing_name && suggested_name !== existing_name && (
                              <FlexItem>Current name: {existing_name}</FlexItem>
                            )}
                          </Flex>
                          <UrlWithExternalIcon href={url} />
                        </>
                      </Td>
                      <Td>{archesDisplay(distribution_arch)}</Td>
                      <Td>{versionDisplay(distribution_versions)}</Td>
                      <Td width={10}>
                        <ConditionalTooltip
                          content='You do not have the required permissions to perform this action.'
                          show={!rbac?.repoWrite}
                          setDisabled
                        >
                          {uuid ? (
                            <Button
                              isDisabled={uuid === selectedUUID || isAdding}
                              onClick={() => navigate(DELETE_ROUTE + '?repoUUID=' + uuid)}
                              variant='danger'
                              ouiaId='remove_popular_repo'
                            >
                              Delete
                            </Button>
                          ) : (
                            <AddRepo
                              isDisabled={
                                selectedData[key]?.url === url ||
                                isFetching ||
                                isDeleting ||
                                isDeletingItems
                              }
                              addRepo={(snapshot) => addRepo(key, repo, snapshot)}
                            />
                          )}
                        </ConditionalTooltip>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
            <Hide hide={isLoading || countIsZero}>
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
            </Hide>
          </Stack>
        </Hide>
        <Hide hide={!countIsZero}>
          <EmptyTableState
            clearFilters={() => setSearchValue('')}
            notFiltered={!debouncedSearchValue} // The second item prevents the clear button from being removed abruptly
            itemName='popular repositories'
          />
        </Hide>
      </div>
    </>
  );
};

export const usePopularListOutletContext = () =>
  useOutletContext<{
    deletionContext: {
      checkedRepositoriesToDelete: Map<string, PopularRepository>;
    };
  }>();

export default PopularRepositoriesTable;
