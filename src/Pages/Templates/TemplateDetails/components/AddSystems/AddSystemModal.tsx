import {
  AlertVariant,
  Bullseye,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Grid,
  InputGroup,
  InputGroupItem,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  MenuToggle,
  Pagination,
  PaginationVariant,
  Spinner,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { InnerScrollContainer } from '@patternfly/react-table';
import { useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import Hide from 'components/Hide/Hide';
import { FilterIcon, SearchIcon, SyncAltIcon } from '@patternfly/react-icons';
import useDebounce from 'Hooks/useDebounce';
import { useNavigate, useParams } from 'react-router-dom';
import useRootPath from 'Hooks/useRootPath';
import {
  GET_SYSTEMS_KEY,
  useAddTemplateToSystemsQuery,
  useSystemsListQuery,
} from 'services/Systems/SystemsQueries';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import { useQueryClient } from 'react-query';
import type { TemplateItem } from 'services/Templates/TemplateApi';
import { FETCH_TEMPLATE_KEY, useFetchTemplate } from 'services/Templates/TemplateQueries';
import Loader from 'components/Loader';
import {
  DETAILS_ROUTE,
  PATCH_SYSTEMS_ROUTE,
  SYSTEMS_ROUTE,
  TEMPLATES_ROUTE,
} from 'Routes/constants';
import ModalSystemsTable from './ModalSystemsTable';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import useNotification from 'Hooks/useNotification';
import TagsFilter from 'components/TagsFilter/TagsFilter';

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
  leftMargin: {
    marginLeft: '1rem',
    '& button': {
      textWrap: 'nowrap',
    },
  },
  refreshSystemsList: {
    paddingTop: '0',
    paddingBottom: '0',
  },
  fullWidth: {
    width: 'auto',
    maxWidth: 'unset',
  },
});

const perPageKey = 'templatesPerPage';
type FilterType = 'Name' | 'Tags';

export const isMinorRelease = (rhsm: string) =>
  // Empty string means that the RHEL release version is unset and should be treated as a major release
  !['', '8', '8.0', '9', '9.0', '10', '10.0'].includes(rhsm);

export default function AddSystemModal() {
  const queryClient = useQueryClient();
  const classes = useStyles();
  const { templateUUID: uuid = '' } = useParams();
  const rootPath = useRootPath();
  const navigate = useNavigate();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [toggled, setToggled] = useState(false);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const selectedList = useMemo(() => new Set(selected), [selected]);
  const { notify } = useNotification();
  const [pollCount, setPollCount] = useState(0);
  const [polling, setPolling] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('Name');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!selectedList.size) {
      setToggled(false);
    }
  }, [selectedList]);

  const debouncedSearchQuery = useDebounce(searchQuery, !searchQuery ? 0 : 500);

  const debouncedSelected = useDebounce(selected, !selected.length ? 0 : 500);

  const { version, name, arch } = queryClient.getQueryData<TemplateItem>([
    FETCH_TEMPLATE_KEY,
    uuid,
  ])!;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  const {
    isLoading,
    isFetching,
    isError,
    data = { data: [], meta: { total_items: 0, limit: 20, offset: 0 } },
  } = useSystemsListQuery(page, perPage, debouncedSearchQuery, {
    os: version,
    arch: arch,
    ids: toggled ? debouncedSelected : undefined,
    tags: selectedTags,
  });

  const {
    data: systemsList = [],
    meta: { total_items = 0 },
  } = data;

  // Systems that are not allowed to be selected
  const minorReleaseSystems = useMemo(
    () =>
      systemsList.filter((system) => isMinorRelease(system.attributes.rhsm)).map(({ id }) => id),
    [systemsList],
  );

  const allSystemsAreMinorReleases = minorReleaseSystems.length === systemsList.length;

  // A state for when the "Select All" toggle checkbox is checked
  const isPageSelected = useMemo(() => {
    if (allSystemsAreMinorReleases) return false;

    // Get all systems that can actually be selected (not minor releases and not already assigned)
    const selectableSystems = systemsList.filter(
      ({ attributes: { template_uuid, rhsm } }) => template_uuid !== uuid && !isMinorRelease(rhsm),
    );

    if (selectableSystems.length === 0) return false;

    // Check if all selectable systems are in the selected list
    return selectableSystems.every(({ id }) => selectedList.has(id));
  }, [selectedList, systemsList, allSystemsAreMinorReleases, uuid]);

  const { mutateAsync: addSystems, isLoading: isAdding } = useAddTemplateToSystemsQuery(
    queryClient,
    uuid,
    selected,
  );

  useEffect(() => {
    if (isError) {
      onClose();
    }
  }, [isError]);

  const { data: template } = useFetchTemplate(uuid as string, true, polling);

  const templatePending = useMemo(
    () =>
      template?.last_update_task?.status === 'running' ||
      template?.last_update_task?.status === 'pending',
    [template?.last_update_task],
  );

  useEffect(() => {
    if (isError) {
      setPolling(false);
      setPollCount(0);
      return;
    }

    if (polling && templatePending) {
      setPollCount(pollCount + 1);
    }
    if (polling && !templatePending) {
      setPollCount(0);
    }
    if (pollCount > 40) {
      return setPolling(false);
    }
    return setPolling(templatePending);
  }, [templatePending, isError]);

  useEffect(() => {
    if (
      (template?.rhsm_environment_created === false &&
        template?.last_update_task?.status === 'failed') ||
      (template?.rhsm_environment_created === false &&
        template?.last_update_task?.status === 'completed')
    ) {
      notify({
        title: 'Environment not created for template',
        description:
          'An error occurred when creating the environment. Cannot assign this template to a system.',
        variant: AlertVariant.danger,
        dismissable: true,
      });
    }
  }, [template?.last_update_task]);

  const onSetPage = (_, newPage) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage, newPage) => {
    // Save this value through page refresh for use on next reload
    setPerPage(newPerPage);
    setPage(newPage);
    localStorage.setItem(perPageKey, newPerPage.toString());
  };

  const onClose = () =>
    navigate(`${rootPath}/${TEMPLATES_ROUTE}/${uuid}/${DETAILS_ROUTE}/${SYSTEMS_ROUTE}`);

  const handleSelectItem = (id: string) => {
    if (selectedList.has(id)) {
      const newItems = selected.filter((listId) => listId !== id);

      setSelected([...newItems]);

      if (newItems.length % perPage === 0 && page > 1) {
        setPage((prev) => prev - 1);
      }
    } else {
      setSelected((prev) => [...prev, id]);
    }
  };

  const selectAllToggle = () => {
    if (isPageSelected) {
      // Deselect all items that are on the page
      const systemsListSet = new Set(systemsList.map(({ id }) => id));
      setSelected([...selected.filter((id) => !systemsListSet.has(id))]);
    } else {
      setSelected((prev) => [
        ...new Set([
          ...prev,
          ...systemsList
            .filter(
              ({ attributes: { template_uuid, rhsm } }) =>
                // Filter out systems which are minor releases as they cannot be assigned to a template
                template_uuid !== uuid && !isMinorRelease(rhsm),
            )
            .map(({ id }) => id),
        ]),
      ]);
    }
  };

  const fetchingOrLoading = isFetching || isLoading;

  const loadingOrZeroCount = fetchingOrLoading || !total_items;

  const filters: FilterType[] = ['Name', 'Tags'];

  const Filter = useMemo(() => {
    switch (filterType) {
      case 'Name':
        return (
          <TextInput
            id='search'
            type='search'
            className={classes.fullWidth}
            customIcon={<SearchIcon />}
            ouiaId='filter_search'
            placeholder='Filter by name'
            value={searchQuery}
            onChange={(_event, value) => {
              setSearchQuery(value);
            }}
          />
        );
      case 'Tags':
        return <TagsFilter selectedTags={selectedTags} setSelectedTags={setSelectedTags} />;
    }
  }, [filterType, selectedTags, searchQuery]);

  return (
    <Modal
      key={uuid}
      position='top'
      aria-labelledby='system-modal-title'
      ouiaId='system_modal'
      ouiaSafe={!fetchingOrLoading}
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
    >
      <ModalHeader
        title='Assign template to systems'
        labelId='system-modal-title'
        description={
          <>
            Choose the systems to apply <b>{name}</b> template to now. Be aware that assigning a
            template to a system with an existing template will overwrite the previous one. The
            available systems are filtered by the template&apos;s content definition.
            <Button
              id='refreshSystemsList'
              ouiaId='refresh_systems_list'
              variant='link'
              className={classes.refreshSystemsList}
              icon={isFetching ? <Spinner isInline /> : <SyncAltIcon />}
              isDisabled={isLoading || isFetching}
              onClick={() => queryClient.invalidateQueries(GET_SYSTEMS_KEY)}
            >
              Refresh systems list
            </Button>
          </>
        }
      />
      <InnerScrollContainer>
        <Grid className={classes.mainContainer}>
          <InputGroup className={classes.topContainer}>
            <InputGroupItem>
              <InputGroup>
                <Dropdown
                  key='filtertype'
                  onSelect={(_, val) => {
                    setFilterType(val as FilterType);
                    setFilterOpen(false);
                  }}
                  toggle={(toggleRef) => (
                    <MenuToggle
                      icon={<FilterIcon />}
                      ref={toggleRef}
                      className={classes.fullWidth}
                      aria-label='filterSelectionDropdown'
                      id='typeSelect'
                      onClick={() => setFilterOpen((prev) => !prev)}
                    >
                      {filterType}
                    </MenuToggle>
                  )}
                  onOpenChange={(isOpen) => setFilterOpen(isOpen)}
                  isOpen={filterOpen}
                  aria-label='filter type'
                >
                  <DropdownList>
                    {filters.map((filter) => (
                      <DropdownItem
                        key={filter}
                        value={filter}
                        isSelected={filterType === filter}
                        component='button'
                        data-ouia-component-id={`filter_${filter}`}
                      >
                        {filter}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
                {Filter}
              </InputGroup>
              <Hide hide={!total_items}>
                <FlexItem className={classes.leftMargin}>
                  <ToggleGroup aria-label='Default with single selectable'>
                    <ToggleGroupItem
                      text='All'
                      buttonId='custom-repositories-toggle-button'
                      data-ouia-component-id='all-selected-repositories-toggle'
                      isSelected={!toggled}
                      onChange={() => setToggled(false)}
                    />
                    <ToggleGroupItem
                      text={`Selected (${selected.length})`}
                      buttonId='custom-repositories-selected-toggle-button'
                      data-ouia-component-id='custom-selected-repositories-toggle'
                      isSelected={toggled}
                      isDisabled={!selected.length}
                      onChange={() => {
                        setToggled(true);
                        setPage(1);
                      }}
                    />
                  </ToggleGroup>
                </FlexItem>
              </Hide>
            </InputGroupItem>
            <Hide hide={isLoading}>
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
            </Hide>
          </InputGroup>
          <Hide hide={!!total_items || fetchingOrLoading}>
            <Bullseye data-ouia-component-id='systems_list_page'>
              <EmptyTableState
                notFiltered={!searchQuery && !!selectedTags}
                clearFilters={() => setSearchQuery('')}
                itemName='relevant systems'
                notFilteredBody='It appears as though you have no systems registered for the associated OS.'
                notFilteredButton={
                  <Button
                    id='goToPatchSystemsButton'
                    ouiaId='go_to_patch_systems'
                    variant='primary'
                    isDisabled={isLoading}
                    onClick={() =>
                      navigate(`${rootPath.replace('content', '')}${PATCH_SYSTEMS_ROUTE}`)
                    }
                  >
                    Register a RHEL {version} system
                  </Button>
                }
              />
            </Bullseye>
          </Hide>
          <Hide hide={isLoading}>
            <ModalSystemsTable
              perPage={perPage}
              isFetchingOrLoading={fetchingOrLoading}
              isLoadingOrZeroCount={loadingOrZeroCount}
              systemsList={systemsList}
              selected={selectedList}
              setSelected={(id) => handleSelectItem(id)}
              selectAllToggle={selectAllToggle}
              isPageSelected={isPageSelected}
            />
          </Hide>
          <Hide hide={!isLoading}>
            <Loader />
          </Hide>
          <Flex className={classes.bottomContainer}>
            <FlexItem />
            <FlexItem>
              <Hide hide={isLoading}>
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
              </Hide>
            </FlexItem>
          </Flex>
        </Grid>
      </InnerScrollContainer>
      <ModalFooter>
        <Flex gap={{ default: 'gapMd' }}>
          <ConditionalTooltip
            content='Cannot assign this template to a system yet.'
            show={!template?.rhsm_environment_created}
            setDisabled
          >
            <Button
              isLoading={isAdding}
              isDisabled={
                isAdding ||
                allSystemsAreMinorReleases ||
                !selected.length ||
                (!template?.rhsm_environment_created &&
                  template?.last_update_task?.status !== 'completed')
              }
              key='add_system'
              variant='primary'
              onClick={() => addSystems().then(onClose)}
            >
              Assign
            </Button>
          </ConditionalTooltip>
          <Button key='close' variant='secondary' onClick={onClose}>
            Close
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
