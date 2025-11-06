import React, { useRef, useMemo } from 'react';
import { SimpleSelectOption, SimpleSelect } from '@patternfly/react-templates';
import { Form, FormGroup, FormGroupLabelHelp, List, ListItem } from '@patternfly/react-core';
import HelpPopover from '../../../../../../components/HelpPopover';
import { TEMPLATE_DOCS_URL } from '../AssignTemplateModal';

export const AssignmentMethods = {
  SystemList: 'list',
  ApiAssignment: 'api-assign', // For registered systems
  ApiRegistration: 'api-register', // For unregistered systems
  ManualConfig: 'manual',
} as const;

export type AssignmentMethodOption = (typeof AssignmentMethods)[keyof typeof AssignmentMethods];

type Props = {
  selected: AssignmentMethodOption;
  setSelected: (option: AssignmentMethodOption) => void;
  hasRegisteredSystems: boolean;
};

const AssignmentMethodSelect = ({ selected, setSelected, hasRegisteredSystems }: Props) => {
  const labelHelpRef = useRef(null);

  const assignmentOptions: SimpleSelectOption[] = [
    { content: 'Via system list', value: AssignmentMethods.SystemList },
    {
      content: 'Via API',
      value: AssignmentMethods.ApiAssignment,
      description: 'For registered systems',
    },
    {
      content: 'Register and assign via API',
      value: AssignmentMethods.ApiRegistration,
      description: 'For non-registered systems',
    },
    {
      content: 'Manual configuration (cURL)',
      value: AssignmentMethods.ManualConfig,
      description: 'Limited advisories reporting',
    },
  ];

  const initialOptions = useMemo(
    () =>
      assignmentOptions.map((option) => ({
        ...option,
        selected: option.value === selected,
        isDisabled: option.value === AssignmentMethods.SystemList ? !hasRegisteredSystems : false,
      })),
    [selected, hasRegisteredSystems],
  );

  return (
    <Form>
      <FormGroup
        label='Assignment method'
        isRequired
        labelHelp={
          <HelpPopover
            headerContent='Assignment method'
            bodyContent={
              <>
                <p>Choose the method that best fits your workflow.</p>
                <List>
                  <ListItem>
                    Via system list: Select existing, registered systems directly from the table
                    view.
                  </ListItem>
                  <ListItem>Via API: Ideal for currently registered systems.</ListItem>
                  <ListItem>
                    Register and assign via API: Use for unregistered systems that require both
                    template assignment and initial registration.
                  </ListItem>
                  <ListItem>
                    Manual configuration (cURL): Provides limited advisories reporting and is best
                    for specific troubleshooting or minimal configurations.
                  </ListItem>
                </List>
              </>
            }
            linkText='Learn more about content templates'
            linkUrl={TEMPLATE_DOCS_URL}
          >
            <FormGroupLabelHelp ref={labelHelpRef} aria-label='More info for name field' />
          </HelpPopover>
        }
      >
        <SimpleSelect
          initialOptions={initialOptions}
          toggleWidth='250px' // To avoid truncation of the assignment option text
          onSelect={(_, selection) => setSelected(selection as AssignmentMethodOption)}
        />
      </FormGroup>
    </Form>
  );
};

export default AssignmentMethodSelect;
