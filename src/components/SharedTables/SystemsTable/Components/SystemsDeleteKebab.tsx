import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useState } from 'react';

interface Props {
  selected: string[];
  deselectAll: () => void;
  deleteFromSystems: (items: string[]) => void;
  isDisabled?: boolean;
}

const SystemsDeleteKebab = ({ deselectAll, isDisabled, selected, deleteFromSystems }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const onSelect = () => {
    setIsOpen(false);
    deselectAll();
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelect}
      onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          disabled={isDisabled}
          id='delete-kebab'
          onClick={() => setIsOpen((prev) => !prev)}
          isDisabled={isDisabled}
          icon={<EllipsisVIcon />}
          variant='plain'
          aria-label='plain kebab'
        />
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList>
        <ConditionalTooltip
          key='delete'
          content='Make a selection below to unassign this template from multiple systems'
          show={!selected.length}
          setDisabled
        >
          <DropdownItem autoFocus onClick={() => deleteFromSystems(selected)}>
            {`Unassign template from ${selected.length} system(s)`}
          </DropdownItem>
        </ConditionalTooltip>
      </DropdownList>
    </Dropdown>
  );
};

export default SystemsDeleteKebab;
