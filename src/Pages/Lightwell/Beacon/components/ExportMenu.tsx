import { useState } from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  type MenuToggleElement,
} from '@patternfly/react-core';

import type { Vulnerability } from '../types';
import { exportToCsv, exportToJson, exportToPdf } from '../utils/exportUtils';

type ExportMenuProps = {
  vulnerabilities: Vulnerability[];
};

export function ExportMenu({ vulnerabilities }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCsvExport = () => {
    exportToCsv(
      vulnerabilities,
      `lightwell-vulnerabilities-${new Date().toISOString().split('T')[0]}.csv`,
    );
    setIsOpen(false);
  };

  const handleJsonExport = () => {
    exportToJson(
      vulnerabilities,
      `lightwell-vulnerabilities-${new Date().toISOString().split('T')[0]}.json`,
    );
    setIsOpen(false);
  };

  const handlePdfExport = () => {
    exportToPdf(vulnerabilities, 'Lightwell Vulnerability Report');
    setIsOpen(false);
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={() => setIsOpen(false)}
      popperProps={{ position: 'right' }}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          variant='secondary'
          ouiaId='lightwell-beacon-export-toggle'
        >
          Export
        </MenuToggle>
      )}
    >
      <DropdownList>
        <DropdownItem key='csv' onClick={handleCsvExport}>
          Export as CSV
        </DropdownItem>
        <DropdownItem key='json' onClick={handleJsonExport}>
          Export as JSON
        </DropdownItem>
        <DropdownItem key='pdf' onClick={handlePdfExport}>
          Export as PDF
        </DropdownItem>
      </DropdownList>
    </Dropdown>
  );
}
