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
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  PageSection,
  Popover,
  Skeleton,
  Stack,
  StackItem,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
  Title,
} from '@patternfly/react-core';
import {
  FilterSidePanel,
  FilterSidePanelCategory,
  FilterSidePanelCategoryItem,
} from '@patternfly/react-catalog-view-extension';
import HelpIcon from '@patternfly/react-icons/dist/esm/icons/help-icon';
import UploadIcon from '@patternfly/react-icons/dist/esm/icons/upload-icon';

import LightwellPageHeader from '../components/LightwellPageHeader';
import {
  STAGES,
  type Batch,
  type Complexity,
  type Severity,
  type Stage,
  type Vulnerability,
} from '../mockVulnerabilities';
import { BatchList } from './components/BatchList';
import { ExportMenu } from './components/ExportMenu';
import { PipelineView } from './components/PipelineView';
import { VulnFileUpload } from './components/VulnFileUpload';
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

  const [activeTab, setActiveTab] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedVulns, setUploadedVulns] = useState<Vulnerability[]>([]);
  const [uploadedBatches, setUploadedBatches] = useState<Batch[]>([]);

  const [selectedSeverities, setSelectedSeverities] = useState<Set<Severity>>(new Set());
  const [selectedStages, setSelectedStages] = useState<Set<Stage>>(new Set());
  const [selectedComplexities, setSelectedComplexities] = useState<Set<Complexity>>(new Set());
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [showEmbargo, setShowEmbargo] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState<Record<string, boolean>>({});

  if (isError) throw error;

  const baseVulnerabilities = data?.vulnerabilities ?? [];
  const baseBatches = data?.batches ?? [];
  const vulnerabilities = [...baseVulnerabilities, ...uploadedVulns];
  const batches = [...baseBatches, ...uploadedBatches];

  const toggleShowAllCategory = (key: string) => {
    setShowAllCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBatchCreated = (name: string, newVulns: Vulnerability[]) => {
    setUploadedVulns((prev) => [...prev, ...newVulns]);

    const stageCount: Record<Stage, number> = {} as Record<Stage, number>;
    for (const s of STAGES) stageCount[s] = 0;
    for (const v of newVulns) stageCount[v.stage]++;

    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      name,
      createdDate: new Date().toISOString().split('T')[0],
      vulnerabilityCount: newVulns.length,
      stages: stageCount,
    };
    setUploadedBatches((prev) => [newBatch, ...prev]);
    setIsUploadModalOpen(false);
    setActiveTab(1);
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

  const toggleBatch = (batchId: string) => {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  const applyFilters = (vulns: Vulnerability[]) =>
    vulns.filter((v) => {
      if (selectedSeverities.size > 0 && !selectedSeverities.has(v.severity)) return false;
      if (selectedStages.size > 0 && !selectedStages.has(v.stage)) return false;
      if (selectedComplexities.size > 0 && !selectedComplexities.has(v.complexity)) return false;
      if (selectedBatches.size > 0 && (!v.batchId || !selectedBatches.has(v.batchId))) return false;
      if (showEmbargo && !v.embargo) return false;
      if (showDuplicates && !v.duplicate) return false;
      return true;
    });

  const filteredVulns = applyFilters(vulnerabilities);
  const filteredBatches =
    selectedBatches.size > 0 ? batches.filter((b) => selectedBatches.has(b.id)) : batches;

  const activeFilterCount =
    selectedSeverities.size +
    selectedStages.size +
    selectedComplexities.size +
    selectedBatches.size +
    (showEmbargo ? 1 : 0) +
    (showDuplicates ? 1 : 0);

  return (
    <>
      <LightwellPageHeader
        title='Beacon'
        ouiaId='lightwell-beacon-header'
        description='Track vulnerability remediation progress through the Lightwell fix pipeline.'
        actions={
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Button
                variant='secondary'
                icon={<UploadIcon />}
                onClick={() => setIsUploadModalOpen(true)}
                ouiaId='lightwell-beacon-upload-button'
              >
                Upload CSV
              </Button>
            </FlexItem>
            <FlexItem>
              <ExportMenu vulnerabilities={filteredVulns} />
            </FlexItem>
          </Flex>
        }
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
              <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsFlexStart' }}>
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

                    {batches.length > 0 && (
                      <FilterSidePanelCategory
                        title='LTWWLSUPT Ticket ID'
                        showAll={!!showAllCategories.batch}
                        onShowAllToggle={() => toggleShowAllCategory('batch')}
                      >
                        {batches.map((batch) => (
                          <FilterSidePanelCategoryItem
                            key={batch.id}
                            count={vulnerabilities.filter((v) => v.batchId === batch.id).length}
                            checked={selectedBatches.has(batch.id)}
                            onClick={() => toggleBatch(batch.id)}
                          >
                            {batch.name}
                          </FilterSidePanelCategoryItem>
                        ))}
                      </FilterSidePanelCategory>
                    )}
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
                              <Label
                                color='grey'
                                isCompact
                                style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}
                              >
                                Nice to have
                              </Label>
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
                      <Tabs
                        activeKey={activeTab}
                        onSelect={(_e, idx) => setActiveTab(idx as number)}
                        ouiaId='lightwell-beacon-tabs'
                      >
                        <Tab
                          eventKey={0}
                          title={<TabTitleText>All Vulnerabilities</TabTitleText>}
                        />
                        <Tab
                          eventKey={1}
                          title={<TabTitleText>Batches ({filteredBatches.length})</TabTitleText>}
                        />
                      </Tabs>

                      <TabContent
                        id='tab-vulns'
                        hidden={activeTab !== 0}
                        className='lightwell-tab-content'
                      >
                        <VulnerabilityTable vulnerabilities={filteredVulns} batches={batches} />
                      </TabContent>
                      <TabContent
                        id='tab-batches'
                        hidden={activeTab !== 1}
                        className='lightwell-tab-content'
                      >
                        <BatchList batches={filteredBatches} vulnerabilities={filteredVulns} />
                      </TabContent>
                    </StackItem>
                  </Stack>
                </FlexItem>
              </Flex>
            </StackItem>
          </Stack>
        )}
      </PageSection>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        aria-labelledby='upload-modal-title'
        aria-describedby='upload-modal-body'
        ouiaId='lightwell-beacon-upload-modal'
      >
        <ModalHeader title='Upload Vulnerability CSV' labelId='upload-modal-title' />
        <ModalBody id='upload-modal-body'>
          <VulnFileUpload onBatchCreated={handleBatchCreated} />
        </ModalBody>
      </Modal>
    </>
  );
};

export default Beacon;
