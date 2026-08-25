import { Content, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import type { AsyncState } from '@redhat-cloud-services/types';

import { STAGES } from '../constants';
import type { BeaconPdfAdditionalData, BeaconPdfColumn, BeaconPdfData } from './beaconPdf';
import {
  createDefaultVulnerabilityColumns,
  getVulnerabilityColumnValue,
  getVisibleVulnerabilityColumns,
} from '../utils/vulnerabilityTableColumns';

type BeaconPdfTemplateProps = {
  asyncData: AsyncState<BeaconPdfData>;
  additionalData?: Partial<BeaconPdfAdditionalData>;
};

const defaultColumns: BeaconPdfColumn[] = getVisibleVulnerabilityColumns(
  createDefaultVulnerabilityColumns(),
);

const BeaconPdfTemplate = ({ asyncData, additionalData }: BeaconPdfTemplateProps) => {
  const { data } = asyncData;
  const vulnerabilities = data?.vulnerabilities ?? [];
  const meta = data?.meta;
  const columns = additionalData?.visibleColumns?.length
    ? additionalData.visibleColumns
    : defaultColumns;
  const includeSummary = additionalData?.includeSummary !== false;
  const customerId = additionalData?.customerId;
  const generatedAt = additionalData?.generatedAt;
  const landscape = additionalData?.landscape === true;
  const stageCounts = meta?.stageCounts ?? {};

  return (
    <div className={`beacon-pdf ${landscape ? 'beacon-pdf--landscape' : 'beacon-pdf--portrait'}`}>
      <style>{`
        .beacon-pdf {
          color: #151515;
          font-family: 'Red Hat Text', Helvetica, Arial, sans-serif;
          padding: 8px 0 16px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .beacon-pdf h1 { color: #c9190b; margin: 0 0 8px; }
        .beacon-pdf h2 { margin: 28px 0 12px; page-break-after: avoid; }
        .beacon-pdf .beacon-pdf-meta { color: #6a6e73; margin-bottom: 16px; }
        .beacon-pdf .beacon-pdf-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          margin: 16px 0 28px;
        }
        .beacon-pdf--portrait .beacon-pdf-stats { gap: 32px; }
        .beacon-pdf .beacon-pdf-stat { text-align: center; }
        .beacon-pdf .beacon-pdf-stat-value { font-size: 24px; font-weight: 700; }
        .beacon-pdf .beacon-pdf-stat-value--critical { color: #c9190b; }
        .beacon-pdf .beacon-pdf-stat-value--blocked { color: #f0ab00; }
        .beacon-pdf .beacon-pdf-stat-value--embargo { color: #6753ac; }
        .beacon-pdf .beacon-pdf-stat-label { font-size: 11px; color: #6a6e73; }
        .beacon-pdf table,
        .beacon-pdf .pf-v6-c-table,
        .beacon-pdf .pf-v5-c-table {
          display: table;
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }
        .beacon-pdf thead { display: table-header-group; }
        .beacon-pdf tbody { display: table-row-group; }
        .beacon-pdf tr { display: table-row; page-break-inside: avoid; }
        .beacon-pdf th, .beacon-pdf td {
          display: table-cell;
          font-size: 10px;
          vertical-align: top;
        }
        .beacon-pdf th {
          background-color: #f0f0f0;
          font-weight: 700;
          padding: 8px 8px 6px;
        }
        .beacon-pdf td { padding: 6px 8px; white-space: nowrap; }
        .beacon-pdf .beacon-pdf-pipeline {
          display: flex;
          align-items: stretch;
          width: 100%;
          margin: 0 0 4px;
        }
        .beacon-pdf .beacon-pdf-pipeline-item {
          display: flex;
          align-items: center;
          flex: 1 1 0;
          min-width: 0;
        }
        .beacon-pdf .beacon-pdf-stage-card {
          flex: 1 1 auto;
          min-width: 0;
          text-align: center;
          border: 1px solid #d2d2d2;
          background: #fff;
          padding: 8px 6px;
        }
        .beacon-pdf .beacon-pdf-stage-label {
          font-weight: 700;
          font-size: 10px;
          line-height: 1.2;
          margin-bottom: 4px;
        }
        .beacon-pdf .beacon-pdf-stage-count {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
        }
        .beacon-pdf .beacon-pdf-stage-sub {
          font-size: 9px;
          color: #6a6e73;
        }
        .beacon-pdf .beacon-pdf-pipeline-arrow {
          color: #6a6e73;
          font-size: 10px;
          padding: 0 4px;
          flex: 0 0 auto;
        }
        .beacon-pdf .beacon-pdf-vuln-table { width: 100%; }
        .beacon-pdf .beacon-pdf-vuln-table tbody tr:nth-child(even) td {
          background-color: #fafafa;
        }
        .beacon-pdf .beacon-pdf-col-vulnerabilityId,
        .beacon-pdf .beacon-pdf-col-lastUpdated,
        .beacon-pdf .beacon-pdf-col-stage,
        .beacon-pdf .beacon-pdf-col-severity,
        .beacon-pdf .beacon-pdf-col-cvss,
        .beacon-pdf .beacon-pdf-col-repository,
        .beacon-pdf .beacon-pdf-col-age,
        .beacon-pdf .beacon-pdf-col-flags,
        .beacon-pdf .beacon-pdf-col-complexity,
        .beacon-pdf .beacon-pdf-col-customerPriority {
          width: 1%;
          white-space: nowrap;
        }
        .beacon-pdf .beacon-pdf-col-component,
        .beacon-pdf .beacon-pdf-col-title,
        .beacon-pdf .beacon-pdf-col-cvssVector,
        .beacon-pdf .beacon-pdf-col-batch {
          white-space: normal;
          overflow-wrap: anywhere;
        }
      `}</style>
      {includeSummary ? (
        <>
          <Title headingLevel='h1' size='xl'>
            Lightwell Vulnerability Report
          </Title>
          <Content className='beacon-pdf-meta'>
            {customerId ? `Customer ID: ${customerId}` : null}
            {customerId && generatedAt ? ' · ' : null}
            {generatedAt ? `Generated: ${generatedAt}` : null}
          </Content>
          <div className='beacon-pdf-stats'>
            <div className='beacon-pdf-stat'>
              <div className='beacon-pdf-stat-value'>{meta?.count ?? vulnerabilities.length}</div>
              <div className='beacon-pdf-stat-label'>Total</div>
            </div>
            <div className='beacon-pdf-stat'>
              <div className='beacon-pdf-stat-value beacon-pdf-stat-value--critical'>
                {meta?.criticalCount ?? 0}
              </div>
              <div className='beacon-pdf-stat-label'>Critical</div>
            </div>
            <div className='beacon-pdf-stat'>
              <div className='beacon-pdf-stat-value beacon-pdf-stat-value--blocked'>
                {meta?.blockedCount ?? 0}
              </div>
              <div className='beacon-pdf-stat-label'>Blocked</div>
            </div>
            <div className='beacon-pdf-stat'>
              <div className='beacon-pdf-stat-value beacon-pdf-stat-value--embargo'>
                {meta?.embargoCount ?? 0}
              </div>
              <div className='beacon-pdf-stat-label'>Embargoed</div>
            </div>
          </div>
          <Title headingLevel='h2' size='md'>
            By Stage
          </Title>
          <div
            className='beacon-pdf-pipeline'
            role='list'
            aria-label='Vulnerability counts by stage'
          >
            {STAGES.map((stage, idx) => (
              <div key={stage} className='beacon-pdf-pipeline-item' role='listitem'>
                <div className='beacon-pdf-stage-card'>
                  <div className='beacon-pdf-stage-label'>{stage}</div>
                  <div className='beacon-pdf-stage-count'>{stageCounts[stage] ?? 0}</div>
                  <div className='beacon-pdf-stage-sub'>vulnerabilities</div>
                </div>
                {idx < STAGES.length - 1 ? (
                  <span className='beacon-pdf-pipeline-arrow' aria-hidden='true'>
                    &#9654;
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <Title headingLevel='h2' size='md'>
            Vulnerabilities
          </Title>
        </>
      ) : (
        <Title headingLevel='h2' size='md'>
          Vulnerabilities (continued)
        </Title>
      )}
      <Table
        variant='compact'
        className='beacon-pdf-vuln-table'
        aria-label='Lightwell vulnerabilities'
        gridBreakPoint=''
      >
        <Thead>
          <Tr>
            {columns.map((column) => (
              <Th key={column.key} className={`beacon-pdf-col-${column.key}`}>
                {column.title}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {vulnerabilities.map((vulnerability) => (
            <Tr key={vulnerability.uuid}>
              {columns.map((column) => (
                <Td
                  key={column.key}
                  dataLabel={column.title}
                  className={`beacon-pdf-col-${column.key}`}
                >
                  {getVulnerabilityColumnValue(column.key, vulnerability)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </div>
  );
};

export default BeaconPdfTemplate;
