import { Dropdown, DropdownItem, DropdownList, MenuToggle } from '@patternfly/react-core';
import { useState } from 'react';
import ConditionalTooltip from '../ConditionalTooltip/ConditionalTooltip';
import { useNavigate } from 'react-router-dom';
import { DELETE_ROUTE } from 'Routes/constants';
import { EllipsisVIcon } from '@patternfly/react-icons';

interface Props {
  atLeastOneRepoChecked: boolean;
  numberOfReposChecked: number;
  toggleOuiaId?: string;
  isDisabled?: boolean;
}

const DeleteKebab = ({ atLeastOneRepoChecked, numberOfReposChecked, isDisabled }: Props) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const onFocus = () => {
    const element = document.getElementById('delete-kebab') as HTMLElement;
    element.focus();
  };

  const onSelect = () => {
    setIsOpen(false);
    onFocus();
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelect}
      onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          ouiaId='delete-kebab'
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
          content='Choose one or more repositories to delete.'
          show={!atLeastOneRepoChecked}
          setDisabled
        >
          <DropdownItem onClick={() => navigate(DELETE_ROUTE)}>
            {numberOfReposChecked <= 1
              ? 'Delete repository'
              : `Delete ${numberOfReposChecked} repositories`}
          </DropdownItem>
        </ConditionalTooltip>
      </DropdownList>
    </Dropdown>
  );
};

export default DeleteKebab;
