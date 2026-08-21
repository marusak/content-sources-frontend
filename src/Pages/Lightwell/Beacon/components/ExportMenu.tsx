import { useState } from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  type MenuToggleElement,
} from '@patternfly/react-core';

import useErrorNotification from 'Hooks/useErrorNotification';
import { getVulnerabilities, type BeaconVulnerabilityFilters } from 'services/Lightwell/BeaconApi';
import type { Vulnerability } from '../types';

import { exportToCsv, exportToJson, exportToPdf } from '../utils/exportUtils';

type ExportMenuProps = {
  customerId?: string;
  filters?: BeaconVulnerabilityFilters;
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

export function ExportMenu({ customerId, filters }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const errorNotifier = useErrorNotification();

  const handleExport = async (format: ExportFormat) => {
    if (!customerId || isExporting) {
      return;
    }

    setIsExporting(true);
    try {
      const vulnerabilities = await fetchAllFilteredVulnerabilities(customerId, filters);

      if (format === 'csv') {
        exportToCsv(vulnerabilities, `lightwell-vulnerabilities.csv`);
      } else if (format === 'json') {
        exportToJson(vulnerabilities, `lightwell-vulnerabilities.json`);
      } else {
        exportToPdf(vulnerabilities, 'Lightwell Vulnerability Report');
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
      setIsOpen(false);
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
