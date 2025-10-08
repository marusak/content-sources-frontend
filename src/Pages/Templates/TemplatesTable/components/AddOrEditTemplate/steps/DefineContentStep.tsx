import {
  ExpandableSection,
  Form,
  FormGroup,
  Grid,
  Content,
  ContentVariants,
  Title,
  MenuToggle,
  Dropdown,
  DropdownItem,
  DropdownList,
} from '@patternfly/react-core';
import { useAddTemplateContext } from '../AddTemplateContext';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useState } from 'react';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  fullWidth: {
    width: '100%!important',
    maxWidth: 'unset!important',
  },
});

export default function DefineContentStep() {
  const classes = useStyles();
  const [archOpen, setArchOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const {
    isEdit,
    templateRequest,
    setTemplateRequest,
    distribution_versions,
    distribution_arches,
  } = useAddTemplateContext();

  const archesDisplay = (arch?: string) =>
    distribution_arches.find(({ label }) => arch === label)?.name || 'Select architecture';

  const versionDisplay = (
    version?: string,
  ): string => // arm64 aarch64
    distribution_versions.find(({ label }) => version === label)?.name || 'Select OS version';

  return (
    <Grid hasGutter>
      <Title ouiaId='define_template_content' headingLevel='h1'>
        Define template content
      </Title>
      <Content component={ContentVariants.p}>
        Templates provide consistent content across environments and time. They enable you to
        control the scope of package and advisory updates that will be installed on selected
        systems.
      </Content>

      <Title headingLevel='h3'>Preselect available content</Title>
      <Content component={ContentVariants.p}>
        Based on your filters, the base repositories will be added to this template.
      </Content>

      <Form>
        <FormGroup label='Architecture' isRequired>
          <Dropdown
            onSelect={(_, val) => {
              setTemplateRequest((prev) => ({ ...prev, arch: val as string }));
              setArchOpen(false);
            }}
            toggle={(toggleRef) => (
              <ConditionalTooltip
                position='top-start'
                content='Architecture cannot be changed after creation.'
                show={!!isEdit}
                setDisabled
              >
                <MenuToggle
                  ref={toggleRef}
                  className={classes.fullWidth}
                  isFullWidth
                  aria-label='filter architecture'
                  id='archSelection'
                  ouiaId='restrict_to_architecture'
                  onClick={() => setArchOpen((prev) => !prev)}
                  isExpanded={archOpen}
                >
                  {archesDisplay(templateRequest?.arch)}
                </MenuToggle>
              </ConditionalTooltip>
            )}
            onOpenChange={(isOpen) => setArchOpen(isOpen)}
            isOpen={archOpen}
          >
            <DropdownList>
              {distribution_arches
                .filter(({ label }) => ['x86_64', 'aarch64'].includes(label))
                .map(({ label, name }) => (
                  <DropdownItem
                    key={label}
                    value={label}
                    isSelected={label === templateRequest?.arch}
                    component='button'
                    data-ouia-component-id={`filter_${label}`}
                  >
                    {name}
                  </DropdownItem>
                ))}
            </DropdownList>
          </Dropdown>
        </FormGroup>
        <FormGroup label='OS version' isRequired>
          <Dropdown
            onSelect={(_, val) => {
              setTemplateRequest((prev) => ({ ...prev, version: val as string }));
              setVersionOpen(false);
            }}
            toggle={(toggleRef) => (
              <ConditionalTooltip
                position='top-start'
                content='OS version cannot be changed after creation.'
                show={!!isEdit}
                setDisabled
              >
                <MenuToggle
                  ref={toggleRef}
                  className={classes.fullWidth}
                  isFullWidth
                  aria-label='filter OS version'
                  id='versionSelection'
                  ouiaId='restrict_to_os_version'
                  onClick={() => setVersionOpen((prev) => !prev)}
                  isExpanded={versionOpen}
                >
                  {versionDisplay(templateRequest?.version)}
                </MenuToggle>
              </ConditionalTooltip>
            )}
            onOpenChange={(isOpen) => setVersionOpen(isOpen)}
            isOpen={versionOpen}
          >
            <DropdownList>
              {distribution_versions
                .filter(({ label }) => ['8', '9', '10'].includes(label))
                .map(({ label, name }) => (
                  <DropdownItem
                    key={label}
                    value={label}
                    isSelected={label === templateRequest?.version}
                    component='button'
                    data-ouia-component-id={`filter_${label}`}
                  >
                    {name}
                  </DropdownItem>
                ))}
            </DropdownList>
          </Dropdown>
        </FormGroup>
      </Form>
      <ExpandableSection
        toggleText='What does it mean?'
        aria-label='quickStart-expansion'
        data-ouia-component-id='quickstart_expand'
      >
        <Content>
          <Content component='ul'>
            <Content component='li'>
              Clients are configured to use date-based snapshots of Red Hat and custom repositories.
            </Content>
            <Content component='li'>Third-party tooling is used to update systems.</Content>
            {/* <TextListItem>Build Images from date based repository snapshots.</TextListItem> */}
          </Content>
        </Content>
      </ExpandableSection>
    </Grid>
  );
}
