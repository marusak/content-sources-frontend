import { useState } from 'react';
import { Badge, Label } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { STAGES, type Batch, type Vulnerability } from '../../mockVulnerabilities';

type BatchListProps = {
  batches: Batch[];
  vulnerabilities: Vulnerability[];
  className?: string;
};

export function BatchList({ batches, vulnerabilities, className }: BatchListProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const toggleExpand = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  if (batches.length === 0) {
    return <p>No batches created yet. Upload a CSV to create a batch.</p>;
  }

  return (
    <div className={className}>
      <Table aria-label='Vulnerability batches' variant='compact'>
        <Thead>
          <Tr>
            <Th width={10}></Th>
            <Th width={25}>Batch Name</Th>
            <Th width={15}>Created</Th>
            <Th width={10}>Total</Th>
            <Th width={40}>Stage Breakdown</Th>
          </Tr>
        </Thead>
        {batches.map((batch) => {
          const isExpanded = expandedBatches.has(batch.id);
          const batchVulns = vulnerabilities.filter((v) => v.batchId === batch.id);

          return (
            <Tbody key={batch.id} isExpanded={isExpanded}>
              <Tr>
                <Td
                  expand={{
                    rowIndex: 0,
                    isExpanded,
                    onToggle: () => toggleExpand(batch.id),
                  }}
                />
                <Td dataLabel='Batch Name'>{batch.name}</Td>
                <Td dataLabel='Created'>{batch.createdDate}</Td>
                <Td dataLabel='Total'>
                  <Badge>{batch.vulnerabilityCount}</Badge>
                </Td>
                <Td dataLabel='Stages'>
                  <div className='lightwell-batch-stages'>
                    {STAGES.map((stage) => {
                      const count = batch.stages[stage];
                      if (count === 0) return null;
                      return (
                        <Label
                          key={stage}
                          isCompact
                          variant='outline'
                          className='lightwell-batch-stage-label'
                        >
                          {stage}: {count}
                        </Label>
                      );
                    })}
                  </div>
                </Td>
              </Tr>
              {isExpanded && (
                <Tr isExpanded>
                  <Td colSpan={5}>
                    <div className='lightwell-batch-expanded'>
                      {batchVulns.length > 0 ? (
                        <Table
                          aria-label={`Vulnerabilities in ${batch.name}`}
                          variant='compact'
                          borders={false}
                        >
                          <Thead>
                            <Tr>
                              <Th>Vulnerability ID</Th>
                              <Th>Package</Th>
                              <Th>Severity</Th>
                              <Th>Stage</Th>
                              <Th>Age</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {batchVulns.map((v) => (
                              <Tr key={v.id}>
                                <Td dataLabel='Vulnerability ID'>{v.vulnerabilityId}</Td>
                                <Td dataLabel='Package'>
                                  {v.componentName} {v.componentVersion}
                                </Td>
                                <Td dataLabel='Severity'>
                                  <Label
                                    color={
                                      v.severity === 'Critical'
                                        ? 'red'
                                        : v.severity === 'Important'
                                          ? 'orange'
                                          : v.severity === 'Moderate'
                                            ? 'yellow'
                                            : 'blue'
                                    }
                                    isCompact
                                  >
                                    {v.severity}
                                  </Label>
                                </Td>
                                <Td dataLabel='Stage'>
                                  <Label isCompact variant='outline'>
                                    {v.stage}
                                  </Label>
                                </Td>
                                <Td dataLabel='Age'>{v.ageDays}d</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      ) : (
                        <p className='lightwell-batch-no-vulns'>
                          No vulnerability details available for this batch.
                        </p>
                      )}
                    </div>
                  </Td>
                </Tr>
              )}
            </Tbody>
          );
        })}
      </Table>
    </div>
  );
}
