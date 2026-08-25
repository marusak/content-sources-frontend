import { useState } from 'react';
import {
  AlertVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Spinner,
  type MenuToggleElement,
} from '@patternfly/react-core';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import type { PDFRequestPayload } from '@redhat-cloud-services/types';

import useErrorNotification from 'Hooks/useErrorNotification';
import useNotification from 'Hooks/useNotification';
import { getVulnerabilities, type BeaconVulnerabilityFilters } from 'services/Lightwell/BeaconApi';
import type { Vulnerability } from '../types';

import { buildBeaconPdfPayload } from '../pdf/beaconPdf';
import { exportToCsv, exportToJson } from '../utils/exportUtils';
import type { VulnerabilityTableColumn } from '../utils/vulnerabilityTableColumns';

type ExportMenuProps = {
  customerId?: string;
  filters?: BeaconVulnerabilityFilters;
  visibleColumns: Pick<VulnerabilityTableColumn, 'key' | 'title'>[];
  itemCount?: number;
};

type ExportFormat = 'csv' | 'json' | 'pdf';

const EXPORT_PAGE_SIZE = 200;

export async function fetchAllFilteredVulnerabilities(
  customerId: string,
  filters?: BeaconVulnerabilityFilters,
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  let offset = 0;

  while (true) {
    const { vulnerabilities: page } = await getVulnerabilities(customerId, filters, {
      limit: EXPORT_PAGE_SIZE,
      offset,
    });

    vulnerabilities.push(...page);

    if (page.length < EXPORT_PAGE_SIZE) {
      break;
    }

    offset += page.length;
  }

  return vulnerabilities;
}

async function resolvePdfItemCount(
  customerId: string,
  filters: BeaconVulnerabilityFilters | undefined,
  itemCount: number,
): Promise<number> {
  if (itemCount > 0) {
    return itemCount;
  }

  const { meta } = await getVulnerabilities(customerId, filters, { limit: 1, offset: 0 });
  return meta.count;
}

export function ExportMenu({
  customerId,
  filters,
  visibleColumns,
  itemCount = 0,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  const { requestPdf } = useChrome();

  const handleExport = async (format: ExportFormat) => {
    if (!customerId || isExporting) {
      return;
    }

    setIsOpen(false);
    setIsExporting(true);
    try {
      if (format === 'pdf') {
        notify({
          variant: AlertVariant.info,
          title: 'Generating PDF',
          description: 'Your PDF is being generated. The download will start when it is ready.',
        });
        const count = await resolvePdfItemCount(customerId, filters, itemCount);
        await requestPdf({
          filename: `lightwell-beacon-${customerId}.pdf`,
          payload: buildBeaconPdfPayload({
            customerId,
            filters,
            visibleColumns,
            itemCount: count,
          }) as unknown as PDFRequestPayload,
        });
        notify({
          variant: AlertVariant.success,
          title: 'PDF ready',
          description: 'Your download should start shortly.',
        });
        return;
      }

      const vulnerabilities = await fetchAllFilteredVulnerabilities(customerId, filters);

      if (format === 'csv') {
        exportToCsv(vulnerabilities, `lightwell-vulnerabilities.csv`);
      } else {
        exportToJson(vulnerabilities, `lightwell-vulnerabilities.json`);
      }
    } catch (err) {
      errorNotifier(
        'Error exporting vulnerabilities',
        'Unable to export vulnerabilities',
        err,
        'beacon-export-error',
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!isExporting) {
          setIsOpen(open);
        }
      }}
      popperProps={{ position: 'right' }}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={!customerId || isExporting}
          variant='secondary'
          ouiaId='lightwell-beacon-export-toggle'
          aria-busy={isExporting}
          icon={isExporting ? <Spinner size='sm' aria-hidden='true' /> : undefined}
        >
          {isExporting ? 'Exporting' : 'Export'}
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem
          key='csv'
          isDisabled={isExporting}
          onClick={() => {
            void handleExport('csv');
          }}
        >
          Export as CSV
        </DropdownItem>
        <DropdownItem
          key='json'
          isDisabled={isExporting}
          onClick={() => {
            void handleExport('json');
          }}
        >
          Export as JSON
        </DropdownItem>
        <DropdownItem
          key='pdf'
          isDisabled={isExporting}
          onClick={() => {
            void handleExport('pdf');
          }}
        >
          Export as PDF
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
}
