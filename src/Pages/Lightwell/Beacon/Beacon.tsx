import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRemoteHook } from '@scalprum/react-core';
import { useFlag } from '@unleash/proxy-client-react';
import {
  Content,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  FilterSidePanel,
  FilterSidePanelCategory,
  FilterSidePanelCategoryItem,
} from '@patternfly/react-catalog-view-extension';
import UserIcon from '@patternfly/react-icons/dist/esm/icons/user-icon';
import HelpIcon from '@patternfly/react-icons/dist/esm/icons/help-icon';

import useDebounce from 'Hooks/useDebounce';
import { useLightwellRootPath } from '../../../Hooks/Lightwell/navigation/useLightwellRootPath';
import {
  LwButtonGroup,
  LwLoaded,
  LwMetricsCard,
  LwMetricsCount,
  LwMetricsCountSlots,
  LwMetricsStepper,
  LwPageHeader,
  PageChromeSlot,
  PageChromeSlotFooter,
  PageChromeSlots,
  PageTitleStack,
} from 'kit/components/assemblies';
import { LwButton, LwEmptyState, LwMenu, LwPopover, LwSkeleton } from 'kit/components/primitives';

import {
  FILTER_STATUSES,
  NO_REMEDIATION_LABEL,
  ON_HOLD_STATUS,
  SEVERITIES,
  severityLabel,
  SLA_POLICY_HEADER,
  statusLabel,
  UNREMEDIATED_STATUS,
} from './constants';
import { buildPipelineMetricSteps } from './pipeline';
import type { Severity, Status } from './types';
import { ExportMenu } from './components/ExportMenu';
import { VulnerabilityTable } from './components/VulnerabilityTable';
import { useBeaconData } from './hooks/useBeaconData';
import {
  type BeaconVulnerabilityFilters,
  type BeaconVulnerabilityFlag,
} from 'services/Lightwell/BeaconApi';
import { useBeaconStatusQuery, useLtwlsuptTicketIdsQuery } from 'services/Lightwell/BeaconQueries';
import { useCustomerIdsQuery } from 'services/Lightwell/CustomerQueries';
import {
  createDefaultVulnerabilityColumns,
  getVisibleVulnerabilityColumns,
} from './utils/vulnerabilityTableColumns';

import '../../../../styles/lightwell-beacon.scss';

const DEFAULT_PER_PAGE = 20;

const DROP_LAST_CHROME_SEGMENT_OPTIONS = { dropLastChromeSegment: true };

function buildBeaconFilters(
  selectedSeverities: Set<Severity>,
  selectedStatuses: Set<Status>,
  selectedLtwlsuptTickets: Set<string>,
  showDuplicates: boolean,
): BeaconVulnerabilityFilters | undefined {
  const flags: BeaconVulnerabilityFlag[] = [];
  if (showDuplicates) flags.push('duplicate');

  const filters: BeaconVulnerabilityFilters = {
    severities: selectedSeverities.size ? [...selectedSeverities] : undefined,
    statuses: selectedStatuses.size ? [...selectedStatuses] : undefined,
    ltwlsuptTicketIds: selectedLtwlsuptTickets.size ? [...selectedLtwlsuptTickets] : undefined,
    flags: flags.length ? flags : undefined,
  };

  const hasFilters =
    (filters.severities?.length ?? 0) > 0 ||
    (filters.statuses?.length ?? 0) > 0 ||
    (filters.ltwlsuptTicketIds?.length ?? 0) > 0 ||
    (filters.flags?.length ?? 0) > 0;

  return hasFilters ? filters : undefined;
}

const Beacon = () => {
  const rootPath = useLightwellRootPath();
  const appBreadcrumbsEnabled = useFlag('platform.chrome.app-breadcrumbs');
  const breadcrumbs = useMemo(
    () => [{ pathname: `${rootPath}/beacon`, title: 'Lightwell Beacon' }],
    [rootPath],
  );

  useRemoteHook({
    scope: 'chrome',
    module: './breadcrumbs/useReplaceBreadcrumbs',
    args: appBreadcrumbsEnabled ? [breadcrumbs, DROP_LAST_CHROME_SEGMENT_OPTIONS] : [[]],
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<Status>>(new Set());
  const [selectedLtwlsuptTickets, setSelectedLtwlsuptTickets] = useState<Set<string>>(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const [columns, setColumns] = useState(createDefaultVulnerabilityColumns);
  const debouncedSearch = useDebounce(searchQuery, searchQuery === '' ? 0 : 500);

  const apiFilters = useMemo(
    () =>
      buildBeaconFilters(
        selectedSeverities,
        selectedStatuses,
        selectedLtwlsuptTickets,
        showDuplicates,
      ),
    [selectedSeverities, selectedStatuses, selectedLtwlsuptTickets, showDuplicates],
  );

  const queryFilters = useMemo((): BeaconVulnerabilityFilters | undefined => {
    const search = debouncedSearch.trim();
    const hasSearch = search.length >= 2;

    if (!apiFilters && !hasSearch) {
      return undefined;
    }

    return {
      ...apiFilters,
      search: hasSearch ? search : undefined,
    };
  }, [apiFilters, debouncedSearch]);

  const pagination = useMemo(
    () => ({
      limit: perPage,
      offset: (page - 1) * perPage,
    }),
    [page, perPage],
  );

  useEffect(() => {
    setPage(1);
  }, [selectedCustomerId, queryFilters]);

  const handleCustomerIdChange = useCallback(
    (customerId: string) => {
      if (customerId === selectedCustomerId) {
        return;
      }

      setSelectedLtwlsuptTickets(new Set());
      setSearchQuery('');
      setSelectedCustomerId(customerId);
    },
    [selectedCustomerId],
  );

  const { data: customerIds, isLoading: isLoadingCustomers } = useCustomerIdsQuery();

  useEffect(() => {
    if (!selectedCustomerId && customerIds?.length === 1) {
      handleCustomerIdChange(customerIds[0]);
    }
  }, [selectedCustomerId, customerIds, handleCustomerIdChange]);

  const customerIdMenuItems = (customerIds ?? []).map((customerId) => ({
    id: customerId,
    children: customerId,
    onSelect: () => handleCustomerIdChange(customerId),
  }));

  const resetFilters = useCallback(() => {
    setSelectedSeverities(new Set());
    setSelectedStatuses(new Set());
    setSelectedLtwlsuptTickets(new Set());
    setShowDuplicates(false);
    setSearchQuery('');
    setPage(1);
  }, []);

  const {
    data: displayData,
    isLoading: isLoadingDisplay,
    isError,
    error,
  } = useBeaconData(selectedCustomerId, queryFilters, pagination);
  const { data: ltwlsuptTicketIds = [] } = useLtwlsuptTicketIdsQuery(selectedCustomerId);
  const { data: lastUpdated } = useBeaconStatusQuery();

  const isLoading = !displayData && isLoadingDisplay;

  if (isError) throw error;

  const filteredVulns = displayData?.vulnerabilities ?? [];
  const displayMeta = displayData?.meta;

  const toggleShowAllCategory = (key: string) => {
    setShowAllCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSeverity = (sev: Severity) => {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const toggleStatus = (status: Status) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const toggleLtwlsuptTicket = (ticketId: string) => {
    setSelectedLtwlsuptTickets((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  };

  const activeFilterCount =
    selectedSeverities.size +
    selectedStatuses.size +
    selectedLtwlsuptTickets.size +
    (showDuplicates ? 1 : 0);

  const onSetPage = (_event: unknown, newPage: number) => setPage(newPage);
  const onPerPageSelect = (_event: unknown, newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const isPipelineHydrated = Boolean(selectedCustomerId && !isLoading);
  const pipelineMetricSteps = buildPipelineMetricSteps(
    displayMeta?.statusCounts,
    isPipelineHydrated,
  );

  const showCustomerEmpty = !selectedCustomerId && !isLoadingCustomers;

  return (
    <>
      <LwPageHeader hero bodyWidth='100%' bodyMaxWidth='100%'>
        <PageChromeSlots>
          <PageChromeSlot>
            <PageTitleStack
              title='Beacon'
              description={
                <>
                  Track your Lightwell submissions from initial review to fix availability.
                  {lastUpdated ? (
                    <>
                      <br />
                      Last updated: {lastUpdated}
                    </>
                  ) : null}
                </>
              }
              ouiaId='lightwell-beacon-header'
            />
            <PageChromeSlotFooter>
              <LwMetricsStepper
                isHorizontal
                aria-label='Submission pipeline metrics'
                isHydrated={isPipelineHydrated}
                steps={pipelineMetricSteps}
              />
            </PageChromeSlotFooter>
          </PageChromeSlot>
          {showCustomerEmpty ? (
            <PageChromeSlot>
              <LwEmptyState
                headingLevel='h2'
                icon={UserIcon}
                titleText='Which customer would you like to view?'
                variant={EmptyStateVariant.sm}
              >
                <EmptyStateFooter>
                  <EmptyStateActions>
                    <LwMenu
                      label={selectedCustomerId ?? 'Select customer ID'}
                      toggleProps={{
                        ouiaId: 'customer-id-select-toggle',
                        size: 'lg',
                        variant: 'primary',
                      }}
                      isDisabled={customerIdMenuItems.length === 0}
                      items={customerIdMenuItems}
                    />
                  </EmptyStateActions>
                </EmptyStateFooter>
                <EmptyStateBody>
                  Select a customer ID to view their Lightwell submissions.
                </EmptyStateBody>
              </LwEmptyState>
            </PageChromeSlot>
          ) : selectedCustomerId ? (
            <PageChromeSlot>
              <LwMetricsCard
                hasHeader={`Status Summary${activeFilterCount > 0 ? ' (filtered)' : ''}`}
                hasAction={
                  <LwPopover
                    hasHeader={SLA_POLICY_HEADER}
                    hasBody={
                      <Content>
                        <p>
                          <strong>Submit:</strong> Submit findings at any time.
                        </p>
                        <p>
                          <strong>Response time:</strong> Triaged within <strong>48 hours</strong>{' '}
                          (up to 25 findings per member per week).
                        </p>
                        <p>
                          <strong>Prioritize:</strong> Your severity sets the default order. Adjust
                          at any time.
                        </p>
                        <p>
                          <strong>Fix completion:</strong> Applied after a patched artifact is
                          published to the repository or Lightwell Network.
                        </p>
                      </Content>
                    }
                    hasTrigger={
                      <LwButton isCircle variant='plain' aria-label='SLA help'>
                        <HelpIcon />
                      </LwButton>
                    }
                  />
                }
              >
                <LwLoaded
                  isLoaded={!isLoading}
                  fallback={
                    <LwMetricsCountSlots>
                      <Flex
                        direction={{ default: 'column' }}
                        gap={{ default: 'gapSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <LwSkeleton
                          fontSize='3xl'
                          width='4ch'
                          screenreaderText='Loading status summary'
                        />
                        <LwSkeleton fontSize='sm' width='5ch' />
                      </Flex>
                      <Flex
                        direction={{ default: 'column' }}
                        gap={{ default: 'gapSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <LwSkeleton fontSize='3xl' width='4ch' />
                        <LwSkeleton fontSize='sm' width='5ch' />
                      </Flex>
                      <Flex
                        direction={{ default: 'column' }}
                        gap={{ default: 'gapSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <LwSkeleton fontSize='3xl' width='4ch' />
                        <LwSkeleton fontSize='sm' width='5ch' />
                      </Flex>
                      <Flex
                        direction={{ default: 'column' }}
                        gap={{ default: 'gapSm' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                      >
                        <LwSkeleton fontSize='3xl' width='4ch' />
                        <LwSkeleton fontSize='sm' width='5ch' />
                      </Flex>
                    </LwMetricsCountSlots>
                  }
                >
                  <LwMetricsCountSlots>
                    <LwMetricsCount
                      value={displayMeta?.count ?? filteredVulns.length}
                      label='Total'
                    />
                    <LwMetricsCount
                      value={displayMeta?.criticalCount ?? 0}
                      label='Critical'
                      color='red'
                    />
                    <LwMetricsCount
                      value={displayMeta?.statusCounts?.[ON_HOLD_STATUS] ?? 0}
                      label={ON_HOLD_STATUS}
                      color='none'
                    />
                    <LwMetricsCount
                      value={displayMeta?.statusCounts?.[UNREMEDIATED_STATUS] ?? 0}
                      label={NO_REMEDIATION_LABEL}
                    />
                  </LwMetricsCountSlots>
                </LwLoaded>
              </LwMetricsCard>
            </PageChromeSlot>
          ) : null}
        </PageChromeSlots>
      </LwPageHeader>
      <PageSection hasBodyWrapper={false} data-ouia-component-id='lightwell-beacon-page'>
        <Stack hasGutter className='lightwell-beacon-content'>
          {!showCustomerEmpty ? (
            <StackItem>
              <LwButtonGroup>
                {isLoadingCustomers ? (
                  <div className='lw-c-menu lw-c-menu-group' role='group' aria-label='Customer ID'>
                    <span className='lw-c-menu-group__label'>Customer ID</span>
                    <LwSkeleton height='36px' />
                  </div>
                ) : (
                  <LwMenu
                    fieldLabel='Customer ID'
                    label={selectedCustomerId ?? 'Select customer ID'}
                    toggleProps={{ ouiaId: 'customer-id-select-toggle' }}
                    isDisabled={customerIdMenuItems.length === 0}
                    items={customerIdMenuItems}
                  />
                )}
                <ExportMenu
                  customerId={selectedCustomerId}
                  filters={queryFilters}
                  visibleColumns={getVisibleVulnerabilityColumns(columns)}
                  itemCount={displayMeta?.count ?? 0}
                  lastUpdated={lastUpdated ?? undefined}
                />
              </LwButtonGroup>
            </StackItem>
          ) : null}
          <StackItem>
            <Flex
              gap={{ default: 'gapMd' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
              className='lightwell-beacon-layout'
            >
              <FlexItem className='lightwell-filter-panel'>
                <span className='lightwell-filter-panel-header'>
                  <Title headingLevel='h4' size='md'>
                    Filters
                  </Title>
                  {activeFilterCount > 0 && (
                    <Content component='small' className='lightwell-filter-count'>
                      {activeFilterCount} active
                    </Content>
                  )}
                </span>
                <FilterSidePanel id='beacon-filter-panel'>
                  <FilterSidePanelCategory
                    title='Severity'
                    showAll={!!showAllCategories.severity}
                    onShowAllToggle={() => toggleShowAllCategory('severity')}
                  >
                    {SEVERITIES.map((sev) => (
                      <FilterSidePanelCategoryItem
                        key={sev}
                        checked={selectedSeverities.has(sev)}
                        onClick={() => toggleSeverity(sev)}
                      >
                        {severityLabel(sev)}
                      </FilterSidePanelCategoryItem>
                    ))}
                  </FilterSidePanelCategory>

                  <FilterSidePanelCategory
                    title='Status'
                    showAll={!!showAllCategories.pipeline}
                    onShowAllToggle={() => toggleShowAllCategory('pipeline')}
                  >
                    {FILTER_STATUSES.map((status) => (
                      <FilterSidePanelCategoryItem
                        key={status}
                        checked={selectedStatuses.has(status)}
                        onClick={() => toggleStatus(status)}
                      >
                        {statusLabel(status)}
                      </FilterSidePanelCategoryItem>
                    ))}
                  </FilterSidePanelCategory>

                  {ltwlsuptTicketIds.length > 0 && (
                    <FilterSidePanelCategory
                      title='Support ticket'
                      showAll={!!showAllCategories.ltwlsuptTicket}
                      onShowAllToggle={() => toggleShowAllCategory('ltwlsuptTicket')}
                    >
                      {ltwlsuptTicketIds.map((ticketId) => (
                        <FilterSidePanelCategoryItem
                          key={ticketId}
                          checked={selectedLtwlsuptTickets.has(ticketId)}
                          onClick={() => toggleLtwlsuptTicket(ticketId)}
                        >
                          {ticketId}
                        </FilterSidePanelCategoryItem>
                      ))}
                    </FilterSidePanelCategory>
                  )}

                  <FilterSidePanelCategory title='Flags'>
                    <FilterSidePanelCategoryItem
                      checked={showDuplicates}
                      onClick={() => setShowDuplicates(!showDuplicates)}
                    >
                      Duplicates
                    </FilterSidePanelCategoryItem>
                  </FilterSidePanelCategory>
                </FilterSidePanel>
              </FlexItem>
              <FlexItem flex={{ default: 'flex_1' }} className='lightwell-beacon-table-area'>
                {selectedCustomerId && !isLoading ? (
                  <VulnerabilityTable
                    vulnerabilities={filteredVulns}
                    itemCount={displayMeta?.count ?? 0}
                    page={page}
                    perPage={perPage}
                    onSetPage={onSetPage}
                    onPerPageSelect={onPerPageSelect}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    onSearchClear={() => setSearchQuery('')}
                    onResetFilters={resetFilters}
                    columns={columns}
                    onColumnsChange={setColumns}
                  />
                ) : selectedCustomerId ? (
                  <LwSkeleton height='400px' />
                ) : null}
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
      </PageSection>
    </>
  );
};

export default Beacon;
