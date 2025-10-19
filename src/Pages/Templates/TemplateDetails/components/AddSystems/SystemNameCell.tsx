import { Button, Flex, FlexItem, Icon, Popover } from '@patternfly/react-core';
import { ExclamationTriangleIcon, ExternalLinkSquareAltIcon } from '@patternfly/react-icons';
import { reduceStringToCharsWithEllipsis } from 'helpers';
import { PATCH_SYSTEMS_ROUTE } from 'Routes/constants';
import type { SystemItem } from 'services/Systems/SystemsApi';
import { isMinorRelease } from './AddSystemModal';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';

type Props = Pick<SystemItem, 'id'> &
  Pick<SystemItem['attributes'], 'display_name' | 'rhsm'> & {
    basePath: string;
  };

const RHSM_DOCS_URL =
  'https://docs.redhat.com/en/documentation/red_hat_insights/1-latest/html-single/managing_system_content_and_patch_updates_on_rhel_systems/index#about-content-templates_patching-using-content-templates';

/**
 * Renders a system name with a warning icon if the system has a minor RHEL release set.
 * Systems locked to minor releases cannot be associated with templates.
 */
export default function SystemNameCell({ id, display_name, rhsm, basePath }: Props) {
  const name = (
    <Button isInline variant='link' component='a' href={`${basePath}${PATCH_SYSTEMS_ROUTE}${id}`}>
      {reduceStringToCharsWithEllipsis(display_name)}
    </Button>
  );

  return isMinorRelease(rhsm) ? (
    <Flex columnGap={{ default: 'columnGapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{name}</FlexItem>
      <FlexItem>
        <Popover
          headerContent={`RHEL is locked at version ${rhsm}`}
          headerIcon={<ExclamationTriangleIcon />}
          alertSeverityVariant='warning'
          position='right'
          triggerAction='hover'
          hasAutoWidth
          bodyContent={
            <>
              <p className={spacing.mbSm}>
                Unset the minor release version to associate a template.
              </p>
              <Button
                variant='link'
                component='a'
                icon={<ExternalLinkSquareAltIcon />}
                iconPosition='end'
                href={RHSM_DOCS_URL}
                target='_blank'
                // Use 'noopener noreferrer' alongside target='_blank' to prevent tabnabbing and protect user privacy
                rel='noopener noreferrer'
              >
                Learn how to unset the version
              </Button>
            </>
          }
        >
          <Icon data-ouia-component-id='system-list-warning-icon' status='warning'>
            <ExclamationTriangleIcon />
          </Icon>
        </Popover>
      </FlexItem>
    </Flex>
  ) : (
    name
  );
}
