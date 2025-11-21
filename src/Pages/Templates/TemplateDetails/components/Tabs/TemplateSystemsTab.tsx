import {
  Bullseye,
  Button,
  Flex,
  FlexItem,
  Grid,
  InputGroup,
  InputGroupItem,
  Pagination,
  PaginationVariant,
  TextInput,
} from '@patternfly/react-core';
import { useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { SortByDirection, type ThProps } from '@patternfly/react-table';
import Loader from 'components/Loader';
import {
  useDeleteTemplateFromSystems,
  useListSystemsByTemplateId,
} from 'services/Systems/SystemsQueries';
import SystemsTable from 'components/SharedTables/SystemsTable';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useAppContext } from 'middleware/AppContext';
import { ADD_ROUTE, TEMPLATES_ROUTE, SYSTEMS_ROUTE } from 'Routes/constants';
import Hide from 'components/Hide/Hide';
import SystemsDeleteKebab from 'components/SharedTables/SystemsTable/Components/SystemsDeleteKebab';
import { SearchIcon } from '@patternfly/react-icons';
import { AssignmentMethods } from '../AssignTemplateModal/components/AssignmentMethodSelect';
import useDebounce from 'Hooks/useDebounce';
import useHasRegisteredSystems from 'Hooks/useHasRegisteredSystems';
import useRootPath from 'Hooks/useRootPath';
import useSafeUUIDParam from '../../../../../Hooks/useSafeUUIDParam';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px', // 4px on the title bottom padding makes this the "standard" 16 total padding
    paddingBottom: '8px',
  },
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  topContainer: {
    justifyContent: 'space-between',
    padding: '16px 24px',
    height: 'fit-content',
    flexDirection: 'row!important',
  },
  topContainerWithFilterHeight: { extend: 'topContainer', minHeight: '128px' },
  bottomContainer: {
    justifyContent: 'space-between',
  },
  // Needed to fix styling when "Add repositories" button is disabled
  ctions: {
    display: 'flex',
    flexDirection: 'row',
  },
});

const perPageKey = 'TemplateSystemsPerPage';

export default function TemplateSystemsTab() {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const { rbac, subscriptions } = useAppContext();

  const rootPath = useRootPath();
  const navigate = useNavigate();
  const uuid = useSafeUUIDParam('templateUUID');

  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [perPage, setPerPage] = useState(storedPerPage);

  const [activeSortIndex, setActiveSortIndex] = useState<number>(-1);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<string[]>([]);
  const selectedList = useMemo(() => new Set(selected), [selected]);

  const debouncedSearchQuery = useDebounce(searchQuery, searchQuery ? 400 : 0);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  const columnSortAttributes = [
    'display_name',
    '', // Empty string will not add sort attributes
    'os',
    '',
    '',
    '',
    'last_upload',
  ];

  const sortString = useMemo(
    () =>
      activeSortIndex === -1
        ? ''
        : `${
            activeSortDirection === SortByDirection.asc ? '' : '-'
          }${columnSortAttributes[activeSortIndex]}`,
    [activeSortIndex, activeSortDirection],
  );

  const {
    isLoading,
    isFetching,
    error,
    isError,
    data = { data: [], meta: { total_items: 0, limit: 20, offset: 0 } },
  } = useListSystemsByTemplateId(uuid, page, perPage, debouncedSearchQuery, sortString);

  // Check if there are registered systems compatible with this template
  const { hasRegisteredSystems, isFetchingRegSystems, isErrorFetchingRegSystems } =
    useHasRegisteredSystems(uuid);

  const { mutateAsync: deleteFromSystems, isLoading: isDeleting } =
    useDeleteTemplateFromSystems(queryClient);

  const {
    data: systemsList = [],
    meta: { total_items = 0 },
  } = data;

  const allSelected = useMemo(
    () => systemsList.every(({ inventory_id }) => selectedList.has(inventory_id)),
    [selectedList, systemsList],
  );

  const selectAllToggle = () => {
    if (allSelected) {
      const systemsListSet = new Set(systemsList.map(({ inventory_id }) => inventory_id));
      setSelected([...selected.filter((id) => !systemsListSet.has(id))]);
    } else {
      setSelected((prev) => [
        ...new Set([
          ...prev,
          ...systemsList
            .filter(({ inventory_id }) => inventory_id !== uuid)
            .map(({ inventory_id }) => inventory_id),
        ]),
      ]);
    }
  };
  const onSetPage = (_, newPage) => setPage(newPage);

  const handleSelectItem = (id: string) => {
    if (selectedList.has(id)) {
      setSelected((prev) => [...prev.filter((listId) => listId !== id)]);
    } else {
      setSelected((prev) => [...prev, id]);
    }
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const onPerPageSelect = (_, newPerPage, newPage) => {
    setPerPage(newPerPage);
    setPage(newPage);
    localStorage.setItem(perPageKey, newPerPage.toString());
  };

  const fetchingOrLoading = isFetching || isLoading || isDeleting;

  const loadingOrZeroCount = fetchingOrLoading || !total_items || isFetchingRegSystems; // `isFetchingRegSystems` is only relevant to the zero state

  const errorState = isError || isErrorFetchingRegSystems;

  const sortParams = (columnIndex: number): ThProps['sort'] | undefined =>
    columnSortAttributes[columnIndex]
      ? {
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
        }
      : undefined;

  const hasRHELSubscription = !!subscriptions?.red_hat_enterprise_linux;
  const isMissingRequirements = !rbac?.templateWrite || !hasRHELSubscription;
  const missingRequirements =
    rbac?.templateWrite && !hasRHELSubscription ? 'subscription (RHEL)' : 'permission';

  if (isLoading || isFetchingRegSystems) {
    return <Loader />;
  }

  if (errorState) {
    throw error;
  }

  return (
    <Grid className={classes.mainContainer}>
      <Hide hide={!total_items}>
        <InputGroup className={classes.topContainer}>
          <Flex gap={{ default: 'gapMd' }}>
            <InputGroupItem>
              <TextInput
                id='search'
                ouiaId='name_search'
                placeholder='Filter by name'
                value={searchQuery}
                onChange={(_event, value) => setSearchQuery(value)}
                type='search'
                customIcon={<SearchIcon />}
              />
            </InputGroupItem>
            <FlexItem className={classes.ctions}>
              <ConditionalTooltip
                content={`You do not have the required ${missingRequirements} to perform this action.`}
                show={isMissingRequirements}
                setDisabled
              >
                <Button
                  id='assignTemplateToSystems'
                  ouiaId='assign_template_to_systems'
                  variant='primary'
                  isDisabled={fetchingOrLoading}
                  onClick={() => navigate('add')}
                >
                  Assign template to systems
                </Button>
              </ConditionalTooltip>
            </FlexItem>
            <ConditionalTooltip
              content={`You do not have the required ${missingRequirements} to perform this action.`}
              show={isMissingRequirements}
              setDisabled
            >
              <SystemsDeleteKebab
                deleteFromSystems={deleteFromSystems}
                deselectAll={deselectAll}
                isDisabled={!rbac?.templateWrite}
                selected={selected}
              />
            </ConditionalTooltip>
          </Flex>
          <Pagination
            id='top-pagination-id'
            widgetId='topPaginationWidgetId'
            itemCount={total_items}
            perPage={perPage}
            page={page}
            onSetPage={onSetPage}
            isCompact
            onPerPageSelect={onPerPageSelect}
          />
        </InputGroup>
      </Hide>
      <Hide hide={!!total_items}>
        <Bullseye data-ouia-component-id='systems_list_page'>
          <EmptyTableState
            notFiltered={!debouncedSearchQuery}
            clearFilters={() => setSearchQuery('')}
            itemName='associated systems'
            notFilteredBody={
              hasRegisteredSystems
                ? 'To get started, assign this template to a system.'
                : 'To get started, assign this template to a system. You have no registered systems yet.'
            }
            notFilteredButton={
              <ConditionalTooltip
                content={`You do not have the required ${missingRequirements} to perform this action.`}
                show={isMissingRequirements}
                setDisabled
              >
                <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
                  <FlexItem>
                    <Button
                      id='addSystemsButton'
                      ouiaId='add_systems'
                      variant='primary'
                      isDisabled={isLoading}
                      onClick={() => {
                        const method = hasRegisteredSystems
                          ? '' // If there are some registered systems, open the system list view
                          : `?method=${AssignmentMethods.ApiRegistration}`;
                        navigate(`${ADD_ROUTE}${method}`);
                      }}
                    >
                      {hasRegisteredSystems ? 'Assign to systems' : 'Register and assign via API'}
                    </Button>
                  </FlexItem>

                  {hasRegisteredSystems ? (
                    <FlexItem>
                      <Button
                        id='register-assign-systems-via-api-button'
                        ouiaId='register_assign_systems_via_api'
                        component='a'
                        variant='link'
                        isDisabled={isFetchingRegSystems}
                        href={`${rootPath}/${TEMPLATES_ROUTE}/${uuid}/${SYSTEMS_ROUTE}/${ADD_ROUTE}?method=${AssignmentMethods.ApiRegistration}`}
                        onClick={(event) => {
                          // Prevent the browser's default anchor behavior to ensure that `navigate` performs client-side routing instead of a full page reload
                          event.preventDefault();
                          navigate(`${ADD_ROUTE}?method=${AssignmentMethods.ApiRegistration}`);
                        }}
                      >
                        Register and assign via API
                      </Button>
                    </FlexItem>
                  ) : null}
                </Flex>
              </ConditionalTooltip>
            }
          />
        </Bullseye>
      </Hide>
      <Hide hide={!total_items}>
        <SystemsTable
          allSelected={allSelected}
          perPage={perPage}
          selectAllToggle={selectAllToggle}
          deleteFromSystems={deleteFromSystems}
          isFetchingOrLoading={fetchingOrLoading}
          isLoadingOrZeroCount={loadingOrZeroCount}
          systemsList={systemsList}
          sortParams={sortParams}
          selected={selectedList}
          editAllowed={!isMissingRequirements}
          setSelected={(id) => handleSelectItem(id)}
        />
      </Hide>
      <Hide hide={!total_items}>
        <Flex className={classes.bottomContainer}>
          <FlexItem />
          <FlexItem>
            <Pagination
              id='bottom-pagination-id'
              widgetId='bottomPaginationWidgetId'
              itemCount={total_items}
              perPage={perPage}
              page={page}
              onSetPage={onSetPage}
              variant={PaginationVariant.bottom}
              onPerPageSelect={onPerPageSelect}
            />
          </FlexItem>
        </Flex>
      </Hide>
      <Outlet />
    </Grid>
  );
}
