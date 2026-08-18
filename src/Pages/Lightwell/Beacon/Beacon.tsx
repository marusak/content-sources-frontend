import { useState } from 'react';
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

import LightwellPageHeader from '../components/LightwellPageHeader';
import {
  STAGES,
  type Complexity,
  type Severity,
  type Stage,
  type Vulnerability,
} from '../mockVulnerabilities';
import { ExportMenu } from './components/ExportMenu';
import { PipelineView } from './components/PipelineView';
import { VulnerabilityTable } from './components/VulnerabilityTable';
import { useBeaconData } from './hooks/useBeaconData';

import '../../../../styles/lightwell-beacon.scss';

const SEVERITIES: Severity[] = ['Critical', 'Important', 'Moderate', 'Minor'];
const COMPLEXITIES: Complexity[] = [
  'Standard',
  'Complex',
  'Extensive',
  'Ecosystem Unavailable',
  "Won't Fix",
];

const Beacon = () => {
  const { isLoading, isError, error, data } = useBeaconData();

  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [selectedStages, setSelectedStages] = useState<Set<Stage>>(new Set());
  const [selectedComplexities, setSelectedComplexities] = useState<Set<Complexity>>(new Set());
  const [selectedLtwlsuptTickets, setSelectedLtwlsuptTickets] = useState<Set<string>>(new Set());
  const [showEmbargo, setShowEmbargo] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState<Record<string, boolean>>({});

  if (isError) throw error;

  const vulnerabilities = data?.vulnerabilities ?? [];
  const ltwlsuptTicketIds = [
    ...new Set(
      vulnerabilities
        .map((v) => v.ltwlsupt_ticket_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ].sort();

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

  const applyFilters = (vulns: Vulnerability[]) =>
    vulns.filter((v) => {
      if (selectedSeverities.size > 0 && !selectedSeverities.has(v.severity)) return false;
      if (selectedStages.size > 0 && !selectedStages.has(v.stage)) return false;
      if (selectedComplexities.size > 0 && !selectedComplexities.has(v.complexity)) return false;
      if (
        selectedLtwlsuptTickets.size > 0 &&
        (!v.ltwlsupt_ticket_id || !selectedLtwlsuptTickets.has(v.ltwlsupt_ticket_id))
      )
        return false;
      if (showEmbargo && !v.embargo) return false;
      if (showDuplicates && !v.duplicate) return false;
      return true;
    });

  const filteredVulns = applyFilters(vulnerabilities);

  const activeFilterCount =
    selectedSeverities.size +
    selectedStages.size +
    selectedComplexities.size +
    selectedLtwlsuptTickets.size +
    (showEmbargo ? 1 : 0) +
    (showDuplicates ? 1 : 0);

  return (
    <>
      <LightwellPageHeader
        title='Beacon'
        ouiaId='lightwell-beacon-header'
        description='Track vulnerability remediation progress through the Lightwell fix pipeline.'
        actions={<ExportMenu vulnerabilities={filteredVulns} />}
      />

      <PageSection hasBodyWrapper={false} data-ouia-component-id='lightwell-beacon-page'>
        {isLoading ? (
          <Stack hasGutter>
            <StackItem>
              <Skeleton height='120px' />
            </StackItem>
            <StackItem>
              <Skeleton height='400px' />
            </StackItem>
          </Stack>
        ) : (
          <Stack hasGutter className='lightwell-beacon-content'>
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
                          count={vulnerabilities.filter((v) => v.severity === sev).length}
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
                          count={vulnerabilities.filter((v) => v.stage === stage).length}
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
                          count={vulnerabilities.filter((v) => v.complexity === c).length}
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
                            count={
                              vulnerabilities.filter((v) => v.ltwlsupt_ticket_id === ticketId).length
                            }
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
                        checked={showEmbargo}
                        onClick={() => setShowEmbargo(!showEmbargo)}
                      >
                        Embargoed only
                      </FilterSidePanelCategoryItem>
                      <FilterSidePanelCategoryItem
                        checked={showDuplicates}
                        onClick={() => setShowDuplicates(!showDuplicates)}
                      >
                        Duplicates only
                      </FilterSidePanelCategoryItem>
                    </FilterSidePanelCategory>
                  </FilterSidePanel>
                </FlexItem>
                <FlexItem flex={{ default: 'flex_1' }} className='lightwell-beacon-table-area'>
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
                              <span className='lightwell-stat-number'>{filteredVulns.length}</span>
                              <Content component='small' style={{ display: 'block' }}>
                                Total
                              </Content>
                            </FlexItem>
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number lightwell-stat--critical'>
                                {filteredVulns.filter((v) => v.severity === 'Critical').length}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Critical
                              </Content>
                            </FlexItem>
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number lightwell-stat--stuck'>
                                {filteredVulns.filter((v) => v.ageDays > 30).length}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Blocked (&gt;30d)
                              </Content>
                            </FlexItem>
                            <FlexItem style={{ textAlign: 'center' }}>
                              <span className='lightwell-stat-number lightwell-stat--embargo'>
                                {filteredVulns.filter((v) => v.embargo).length}
                              </span>
                              <Content component='small' style={{ display: 'block' }}>
                                Embargoed
                              </Content>
                            </FlexItem>
                          </Flex>
                          <PipelineView vulnerabilities={filteredVulns} />
                        </CardBody>
                      </Card>
                    </StackItem>
                    <StackItem>
                      <VulnerabilityTable vulnerabilities={filteredVulns} />
                    </StackItem>
                  </Stack>
                </FlexItem>
              </Flex>
            </StackItem>
          </Stack>
        )}
      </PageSection>
    </>
  );
};

export default Beacon;
