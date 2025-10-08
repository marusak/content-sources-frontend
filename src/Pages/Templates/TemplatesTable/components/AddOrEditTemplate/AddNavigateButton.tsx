import {
  useWizardContext,
  Flex,
  Button,
  ButtonVariant,
  Dropdown,
  MenuToggle,
  MenuToggleAction,
  DropdownList,
  DropdownItem,
} from '@patternfly/react-core';
import useRootPath from 'Hooks/useRootPath';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES_ROUTE, DETAILS_ROUTE, SYSTEMS_ROUTE, ADD_ROUTE } from 'Routes/constants';
import type { TemplateItem } from 'services/Templates/TemplateApi';

interface Props {
  isAdding: boolean;
  add: () => Promise<TemplateItem>;
  onClose: () => void;
}

export const AddNavigateButton = ({ isAdding, add, onClose }: Props) => {
  const root = useRootPath();
  const navigate = useNavigate();
  const [isActionOpen, setIsActionOpen] = useState(false);
  const { goToPrevStep } = useWizardContext();

  return (
    <Flex gap={{ default: 'gapMd' }} direction={{ default: 'row' }}>
      <Button ouiaId='wizard-back-btn' variant={ButtonVariant.secondary} onClick={goToPrevStep}>
        Back
      </Button>
      <Dropdown
        isOpen={isActionOpen}
        onOpenChange={(isOpen: boolean) => setIsActionOpen(isOpen)}
        key='confirm'
        ouiaId='create-template'
        toggle={(toggleRef) => (
          <MenuToggle
            onClick={() => setIsActionOpen((prev) => !prev)}
            ref={toggleRef}
            isDisabled={isAdding}
            id='toggle-add'
            variant='primary'
            ouiaId='add_repo_toggle'
            splitButtonItems={[
              <MenuToggleAction
                isDisabled={isAdding}
                data-ouia-component-id='wizard-create-template-and-add'
                key='action'
                onClick={() =>
                  add().then((resp) => {
                    navigate(
                      `${root}/${TEMPLATES_ROUTE}/${resp.uuid}/${DETAILS_ROUTE}/${SYSTEMS_ROUTE}/${ADD_ROUTE}`,
                    );
                  })
                }
              >
                Create template and add to systems
              </MenuToggleAction>,
            ]}
            aria-label='Create other options'
          />
        )}
        shouldFocusToggleOnSelect
      >
        <DropdownList>
          <DropdownItem
            data-ouia-component-id='wizard-create-template-only'
            key='submit'
            component='button'
            type='submit'
            isLoading={isAdding}
            isDisabled={isAdding}
            onClick={() => add().then(() => onClose())}
          >
            Create template only
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </Flex>
  );
};
