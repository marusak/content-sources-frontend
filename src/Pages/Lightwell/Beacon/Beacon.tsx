import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  PageSection,
  Popover,
  Skeleton,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  FilterSidePanel,
  FilterSidePanelCategory,
  FilterSidePanelCategoryItem,
} from '@patternfly/react-catalog-view-extension';
import HelpIcon from '@patternfly/react-icons/dist/esm/icons/help-icon';

import useDebounce from 'Hooks/useDebounce';
import LightwellPageHeader from '../components/LightwellPageHeader';
import { COMPLEXITIES, SEVERITIES, STAGES } from './constants';
import type { Complexity, Severity, Stage } from './types';
import { CustomerIdSelect } from './components/CustomerIdSelect';
import { ExportMenu } from './components/ExportMenu';
import { PipelineView } from './components/PipelineView';
import { VulnerabilityTable } from './components/VulnerabilityTable';
import { useBeaconData } from './hooks/useBeaconData';
import {
  type BeaconVulnerabilityFilters,
  type BeaconVulnerabilityFlag,
} from 'services/Lightwell/BeaconApi';
import { useLtwlsuptTicketIdsQuery } from 'services/Lightwell/BeaconQueries';

import '../../../../styles/lightwell-beacon.scss';

const DEFAULT_PER_PAGE = 20;

function buildBeaconFilters(
  selectedSeverities: Set<Severity>,
  selectedStages: Set<Stage>,
  selectedComplexities: Set<Complexity>,
  selectedLtwlsuptTickets: Set<string>,
  showEmbargo: boolean,
  showDuplicates: boolean,
  showBlocked: boolean,
): BeaconVulnerabilityFilters | undefined {
  const flags: BeaconVulnerabilityFlag[] = [];
  if (showEmbargo) flags.push('embargo');
  if (showDuplicates) flags.push('duplicate');
  if (showBlocked) flags.push('blocked');

  const filters: BeaconVulnerabilityFilters = {
    severities: selectedSeverities.size ? [...selectedSeverities] : undefined,
    stages: selectedStages.size ? [...selectedStages] : undefined,
    complexities: selectedComplexities.size ? [...selectedComplexities] : undefined,
    ltwlsuptTicketIds: selectedLtwlsuptTickets.size ? [...selectedLtwlsuptTickets] : undefined,
    flags: flags.length ? flags : undefined,
  };

  const hasFilters =
    (filters.severities?.length ?? 0) > 0 ||
    (filters.stages?.length ?? 0) > 0 ||
    (filters.complexities?.length ?? 0) > 0 ||
    (filters.ltwlsuptTicketIds?.length ?? 0) > 0 ||
    (filters.flags?.length ?? 0) > 0;

  return hasFilters ? filters : undefined;
}

const Beacon = () => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [selectedStages, setSelectedStages] = useState<Set<Stage>>(new Set());
  const [selectedComplexities, setSelectedComplexities] = useState<Set<Complexity>>(new Set());
  const [selectedLtwlsuptTickets, setSelectedLtwlsuptTickets] = useState<Set<string>>(new Set());
  const [showEmbargo, setShowEmbargo] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, searchQuery === '' ? 0 : 500);

  const apiFilters = useMemo(
    () =>
      buildBeaconFilters(
        selectedSeverities,
        selectedStages,
        selectedComplexities,
        selectedLtwlsuptTickets,
        showEmbargo,
        showDuplicates,
        showBlocked,
      ),
    [
      selectedSeverities,
      selectedStages,
      selectedComplexities,
      selectedLtwlsuptTickets,
      showEmbargo,
      showDuplicates,
      showBlocked,
    ],
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

  const resetFilters = useCallback(() => {
    setSelectedSeverities(new Set());
    setSelectedStages(new Set());
    setSelectedComplexities(new Set());
    setSelectedLtwlsuptTickets(new Set());
    setShowEmbargo(false);
    setShowDuplicates(false);
    setShowBlocked(false);
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

  const toggleStage = (stage: Stage) => {
    setSelectedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  };

  const toggleComplexity = (c: Complexity) => {
    setSelectedComplexities((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
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
    selectedStages.size +
    selectedComplexities.size +
    selectedLtwlsuptTickets.size +
    (showEmbargo ? 1 : 0) +
    (showDuplicates ? 1 : 0) +
    (showBlocked ? 1 : 0);

  const onSetPage = (_event: unknown, newPage: number) => setPage(newPage);
  const onPerPageSelect = (_event: unknown, newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  return (
    <>
      <LightwellPageHeader
        title='Beacon'
        ouiaId='lightwell-beacon-header'
        description='Understand the status of your Lightwell submissions'
        actions={<ExportMenu customerId={selectedCustomerId} filters={queryFilters} />}
      />

      <PageSection hasBodyWrapper={false} data-ouia-component-id='lightwell-beacon-page'>
        <Stack hasGutter className='lightwell-beacon-content'>
          <StackItem>
            <Flex
              gap={{ default: 'gapMd' }}
              alignItems={{ default: 'alignItemsFlexStart' }}
              className='lightwell-beacon-layout'
            >
              <FlexItem className='lightwell-filter-panel'>
                <CustomerIdSelect
                  selectedCustomerId={selectedCustomerId}
                  onCustomerIdChange={handleCustomerIdChange}
                />
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
                        {sev}
                      </FilterSidePanelCategoryItem>
                    ))}
                  </FilterSidePanelCategory>

                  <FilterSidePanelCategory
                    title='Status'
                    showAll={!!showAllCategories.pipeline}
                    onShowAllToggle={() => toggleShowAllCategory('pipeline')}
                  >
                    {STAGES.map((stage) => (
                      <FilterSidePanelCategoryItem
                        key={stage}
                        checked={selectedStages.has(stage)}
                        onClick={() => toggleStage(stage)}
                      >
                        {stage}
                      </FilterSidePanelCategoryItem>
                    ))}
                  </FilterSidePanelCategory>

                  <FilterSidePanelCategory
                    title='Complexity'
                    showAll={!!showAllCategories.complexity}
                    onShowAllToggle={() => toggleShowAllCategory('complexity')}
                  >
                    {COMPLEXITIES.map((c) => (
                      <FilterSidePanelCategoryItem
                        key={c}
                        checked={selectedComplexities.has(c)}
                        onClick={() => toggleComplexity(c)}
                      >
                        {c}
                      </FilterSidePanelCategoryItem>
                    ))}
                  </FilterSidePanelCategory>

                  {ltwlsuptTicketIds.length > 0 && (
                    <FilterSidePanelCategory
                      title='LTWLSUPT_TICKET'
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
                      checked={showBlocked}
                      onClick={() => setShowBlocked(!showBlocked)}
                    >
                      Blocked
                    </FilterSidePanelCategoryItem>
                    <FilterSidePanelCategoryItem
                      checked={showEmbargo}
                      onClick={() => setShowEmbargo(!showEmbargo)}
                    >
                      Embargoed
                    </FilterSidePanelCategoryItem>
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
                {isLoading || !selectedCustomerId ? (
                  <Stack hasGutter>
                    <StackItem>
                      <Skeleton height='120px' />
                    </StackItem>
                    <StackItem>
                      <Skeleton height='400px' />
                    </StackItem>
                  </Stack>
                ) : (
                  <Stack hasGutter>
                    <StackItem>
                      <Card isGlass>
                        <CardHeader>
                          <CardTitle>
                            <Flex
                              gap={{ default: 'gapSm' }}
                              alignItems={{ default: 'alignItemsCenter' }}
                            >
                              <FlexItem>
                                <Title headingLevel='h3' size='md'>
                                  Status Summary{activeFilterCount > 0 ? ' (filtered)' : ''}
                                </Title>
                              </FlexItem>
                              <FlexItem>
                                <Popover
                                  headerContent='SLA Policy'
                                  bodyContent={
                                    <Content>
                                      <p>
                                        <strong>Submit</strong> vulnerabilities to the clearinghouse
                                        at any time.
                                      </p>
                                      <p>
                                        <strong>Triage within 48 hours.</strong> We assess fix
                                        complexity and assign a lane.
                                      </p>
                                      <p>
                                        <strong>Priority is yours.</strong> Your severity sets the
                                        default order. Adjust at any time.
                                      </p>
                                      <p>
                                        A fix is complete when a patched artifact is published in
                                        the repository (or when it gets to the Lightwell Network).
                                      </p>
                                      <br />
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Lane</th>
                                            <th>SLA</th>
                                            <th>SLO</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td>Standard</td>
                                            <td>3 Days</td>
                                            <td>80% within 1 day</td>
                                          </tr>
                                          <tr>
                                            <td>Complex</td>
                                            <td>8 Days</td>
                                            <td>80% within 4 days</td>
                                          </tr>
                                          <tr>
                                            <td>Extensive</td>
                                            <td>16 Days</td>
                                            <td>80% within 10 days</td>
                                          </tr>
                                          <tr>
                                            <td>Ecosystem Unavailable</td>
                                            <td>No SLA</td>
                                            <td>Not a currently supported Lightwell Library</td>
                                          </tr>
                                          <tr>
                                            <td>Won&apos;t Fix</td>
                                            <td>No SLA</td>
                                            <td>
                                              Technically infeasible, no source available, or a
                                              licensing conflict
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <br />
                                      <p>
                                        SLA applies to up to 50 findings per member per week. All
                                        other findings are worked continuously on a best-effort
                                        basis.
                                      </p>
                                      <p>
                                        Items exceeding 30 days are flagged as &quot;blocked.&quot;
                                      </p>
                                    </Content>
                                  }
                                >
                                  <Button
                                    variant='plain'
                                    aria-label='Complexity SLA help'
                                    className='lightwell-help-btn'
                                  >
                                    <HelpIcon />
                                  </Button>
                                </Popover>
                              </FlexItem>
                            </Flex>
                          </CardTitle>
                        </CardHeader>
                        <CardBody>
                          <Flex
                            justifyContent={{ default: 'justifyContentCenter' }}
                            gap={{ default: 'gapXl' }}
                            alignItems={{ default: 'alignItemsCenter' }}
                            style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
                          >
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number'>
                                {displayMeta?.count ?? filteredVulns.length}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Total
                              </Content>
                            </FlexItem>
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number lightwell-stat--critical'>
                                {displayMeta?.criticalCount ?? 0}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Critical
                              </Content>
                            </FlexItem>
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number lightwell-stat--stuck'>
                                {displayMeta?.blockedCount ?? 0}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Blocked
                              </Content>
                            </FlexItem>
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number lightwell-stat--embargo'>
                                {displayMeta?.embargoCount ?? 0}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Embargoed
                              </Content>
                            </FlexItem>
                          </Flex>
                          <PipelineView stageCounts={displayMeta?.stageCounts} />
                        </CardBody>
                      </Card>
                    </StackItem>
                    <StackItem>
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
                      />
                    </StackItem>
                  </Stack>
                )}
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
      </PageSection>
    </>
  );
};

export default Beacon;
