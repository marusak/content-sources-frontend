import {
  Button,
  Flex,
  FlexItem,
  Grid,
  Icon,
  Pagination,
  PaginationVariant,
  Spinner,
  Stack,
  TooltipPosition,
} from '@patternfly/react-core';
import {
  ActionsColumn,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  ThProps,
  Tr,
  type BaseCellProps,
} from '@patternfly/react-table';
import { useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { SkeletonTable } from '@patternfly/react-component-groups';
import Hide from 'components/Hide/Hide';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import ServiceUnavailableAlert from 'components/ServiceUnavailableAlert/ServiceUnavailableAlert';
import { Outlet, useNavigate } from 'react-router-dom';
import { TemplateFilterData, TemplateItem } from 'services/Templates/TemplateApi';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useAppContext } from 'middleware/AppContext';
import TemplateFilters from './components/TemplateFilters';
import { formatDateDDMMMYYYY, formatDateUTC } from 'helpers';
import Header from 'components/Header/Header';
import useRootPath from 'Hooks/useRootPath';
import { DELETE_ROUTE, TEMPLATES_ROUTE } from 'Routes/constants';
import useArchVersion from 'Hooks/useArchVersion';
import { useTemplateList } from 'services/Templates/TemplateQueries';
import StatusIcon from './components/StatusIcon';
import { ExclamationTriangleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useFlag } from '@unleash/proxy-client-react';

const useStyles = createUseStyles({
  topContainer: {
    justifyContent: 'space-between',
    padding: '16px 24px',
    height: 'fit-content',
  },
  bottomContainer: {
    justifyContent: 'space-between',
  },
  invisible: {
    opacity: 0,
  },
  spinnerMinWidth: {
    width: '50px!important',
  },
  leftPaddingZero: {
    paddingLeft: 0,
  },
  disabledButton: {
    pointerEvents: 'auto',
    cursor: 'default',
  },
  bannerContainer: {
    padding: '24px 24px 0px',
  },
  templateDocLink: {
    marginTop: '20px',
  },
});

const perPageKey = 'templatesPerPage';

const TemplatesTable = () => {
  const classes = useStyles();
  const rootPath = useRootPath();
  const navigate = useNavigate();
  const { rbac, subscriptions } = useAppContext();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [activeSortIndex, setActiveSortIndex] = useState<number>(3); // queued_at
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('desc');
  const [polling, setPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const serviceUnavailable = useFlag('content-sources.service-unavailable');

  const defaultValues: TemplateFilterData = {
    arch: '',
    version: '',
    search: '',
    repository_uuids: '',
    snapshot_uuids: '',
  };

  const [filterData, setFilterData] = useState<TemplateFilterData>(defaultValues);

  const clearFilters = () => setFilterData(defaultValues);

  const notFiltered =
    filterData.arch === '' && filterData.version === '' && filterData.search === '';

  const columnSortAttributes = ['name', '', 'arch', 'version', ''];

  const sortString = useMemo(
    () =>
      columnSortAttributes[activeSortIndex]
        ? columnSortAttributes[activeSortIndex] + ':' + activeSortDirection
        : '',
    [activeSortIndex, activeSortDirection],
  );

  const {
    isLoading,
    error,
    isError,
    isFetching,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useTemplateList(page, perPage, sortString, filterData, polling);

  useEffect(() => {
    if (isError) {
      setPolling(false);
      setPollCount(0);
      return;
    }
    const containsPending = data?.data?.some(
      ({ last_update_task }) =>
        last_update_task?.status === 'running' || last_update_task?.status === 'pending',
    );
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
    // This sets the polling state based whether the data contains any "pending" or "running" status
    return setPolling(containsPending);
  }, [data?.data]);

  const onSetPage = (_, newPage: number) => setPage(newPage);

  const onPerPageSelect = (_, newPerPage: number, newPage: number) => {
    // Save this value through page refresh for use on next reload
    localStorage.setItem(perPageKey, newPerPage.toString());
    setPerPage(newPerPage);
    setPage(newPage);
  };

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

  const columnHeaders: { title: string; width?: BaseCellProps['width'] }[] = [
    { title: 'Name', width: 15 },
    { title: 'Description' },
    { title: 'Architecture', width: 10 },
    { title: 'OS version', width: 10 },
    { title: 'Snapshot date', width: 15 },
    { title: 'Status', width: 15 },
  ];

  const {
    isLoading: repositoryParamsLoading,
    error: repositoryParamsError,
    isError: repositoryParamsIsError,
    archesDisplay,
    versionDisplay,
  } = useArchVersion();

  const actionTakingPlace = isLoading || isFetching || repositoryParamsLoading;

  // Error is caught in the wrapper component
  if (isError) throw error;
  if (repositoryParamsIsError) throw repositoryParamsError;

  const {
    data: templateList = [],
    meta: { count = 0 },
  } = data;

  const itemName = 'templates';
  const notFilteredBody =
    'Control the scope of packages and advisory updates to be installed on selected systems with templates. To get started, create a template.';

  const countIsZero = count === 0;

  const hasRHELSubscription = !!subscriptions?.red_hat_enterprise_linux;
  const isMissingRequirements = !rbac?.templateWrite || !hasRHELSubscription;
  const missingRequirements =
    rbac?.templateWrite && !hasRHELSubscription ? 'subscription (RHEL)' : 'permission';

  return (
    <>
      <Header
        title='Templates'
        ouiaId='templates_description'
        paragraph='View all content templates within your organization.'
        aboutData={{
          headerContent: 'About content templates',
          bodyContent:
            'Templates provide consistent content across environments and time. They enable you to control the scope of package and advisory updates that will be installed on selected systems.',
          linkText: 'Content templates documentation',
          linkUrl:
            'https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/managing_system_content_and_patch_updates_on_rhel_systems/patching-using-content-templates_patch-service-overview',
        }}
      />
      {serviceUnavailable && <ServiceUnavailableAlert />}
      <Grid data-ouia-component-id='content_template_list_page'>
        <Outlet />
        <Flex className={classes.topContainer}>
          <TemplateFilters
            isLoading={isLoading}
            setFilterData={(values) => {
              setFilterData(values);
              setPage(1);
            }}
            filterData={filterData}
          />
          <FlexItem>
            <Hide hide={countIsZero}>
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
            </Hide>
          </FlexItem>
        </Flex>
        <Hide hide={!isLoading}>
          <Grid>
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
              aria-label='Content template table'
              ouiaId='content_template_table'
              variant='compact'
            >
              <Thead>
                <Tr>
                  {columnHeaders.map(({ title, width }, index) =>
                    title === 'Status' ? (
                      <Th key={title + 'column'} width={width} modifier='wrap'>
                        {title}
                      </Th>
                    ) : (
                      <Th
                        key={title + 'column'}
                        width={width}
                        modifier='wrap'
                        sort={sortParams(index)}
                      >
                        {title}
                      </Th>
                    ),
                  )}
                  <Th className={classes.spinnerMinWidth}>
                    <Spinner size='md' className={actionTakingPlace ? '' : classes.invisible} />
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {templateList.map(
                  (
                    {
                      uuid,
                      name,
                      description,
                      arch,
                      version,
                      date,
                      use_latest,
                      last_update_snapshot_error,
                      last_update_task,
                      to_be_deleted_snapshots,
                    }: TemplateItem,
                    index,
                  ) => (
                    <Tr key={uuid + index}>
                      <Td>
                        <Flex gap={{ default: 'gapXs' }}>
                          <FlexItem>
                            <Button
                              variant='link'
                              onClick={() => navigate(`${rootPath}/${TEMPLATES_ROUTE}/${uuid}`)}
                            >
                              {name}
                            </Button>
                          </FlexItem>
                          <Hide
                            hide={!(to_be_deleted_snapshots && to_be_deleted_snapshots.length > 0)}
                          >
                            <FlexItem>
                              <ConditionalTooltip
                                id={`to_be_deleted_snapshot_warning_for_repo_${name}`}
                                show={to_be_deleted_snapshots && to_be_deleted_snapshots.length > 0}
                                position='right'
                                content='This template contains snapshots that are going to be deleted in the next 14 days. At that time the template will be updated automatically to use the next available snapshot. Editing the template and selecting a more recent snapshot date will ensure the template does not change unexpectedly.'
                                enableFlip
                              >
                                <Icon status='warning' isInline>
                                  <ExclamationTriangleIcon />
                                </Icon>
                              </ConditionalTooltip>
                            </FlexItem>
                          </Hide>
                        </Flex>
                      </Td>
                      <Td>{description}</Td>
                      <Td>{archesDisplay(arch)}</Td>
                      <Td>{versionDisplay([version])}</Td>
                      <Td>
                        <ConditionalTooltip
                          show={!use_latest}
                          content={formatDateUTC(date)}
                          position='top-start'
                          enableFlip
                        >
                          <p>{use_latest ? 'Use latest' : formatDateDDMMMYYYY(date)}</p>
                        </ConditionalTooltip>
                      </Td>
                      <Td>
                        <StatusIcon
                          uuid={uuid}
                          last_update_snapshot_error={last_update_snapshot_error}
                          last_update_task={last_update_task}
                        />
                      </Td>
                      <Td>
                        <ConditionalTooltip
                          content='You do not have the required permission to perform this action.'
                          show={!rbac?.templateWrite}
                          setDisabled
                        >
                          <ActionsColumn
                            items={[
                              {
                                id: 'actions-column-edit',
                                className: isMissingRequirements ? classes.disabledButton : '',
                                title: 'Edit',
                                onClick: () => navigate(`${uuid}/edit`),
                                isDisabled: isMissingRequirements,
                                tooltipProps: isMissingRequirements
                                  ? {
                                      isVisible: isMissingRequirements,
                                      content: `You do not have the required ${missingRequirements} to perform this action.`,
                                      position: TooltipPosition.left,
                                      triggerRef: () =>
                                        document.getElementById('actions-column-edit') ||
                                        document.body,
                                    }
                                  : undefined,
                              },
                              { isSeparator: true },
                              {
                                title: 'Delete',
                                onClick: () => navigate(`${uuid}/${DELETE_ROUTE}`),
                              },
                            ]}
                          />
                        </ConditionalTooltip>
                      </Td>
                    </Tr>
                  ),
                )}
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
              <>
                <ConditionalTooltip
                  content={`You do not have the required ${missingRequirements} to perform this action.`}
                  show={isMissingRequirements}
                  setDisabled
                >
                  <Button
                    id='createContentTemplateButton'
                    ouiaId='create_content_template'
                    variant='primary'
                    isDisabled={isLoading}
                    onClick={() => navigate('add')}
                  >
                    Create a template
                  </Button>
                </ConditionalTooltip>
                <Button
                  className={classes.templateDocLink}
                  variant='link'
                  ouiaId='snapshot_package_count_button'
                  icon={<ExternalLinkAltIcon />}
                  iconPosition='end'
                  isInline
                >
                  <a href='https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html/managing_system_content_and_patch_updates_on_rhel_systems/patching-using-content-templates_patch-service-overview'>
                    Learn more about templates
                  </a>
                </Button>
              </>
            }
          />
        </Hide>
      </Grid>
    </>
  );
};

export default TemplatesTable;
