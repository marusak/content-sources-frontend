import React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  TooltipPosition,
} from '@patternfly/react-core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DELETE_ROUTE, EDIT_ROUTE, TEMPLATES_ROUTE } from 'Routes/constants';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useAppContext } from 'middleware/AppContext';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  disabledButton: {
    pointerEvents: 'auto',
    cursor: 'default',
  },
});

export default function TemplateActionDropdown() {
  const classes = useStyles();
  const [isOpen, setIsOpen] = React.useState(false);
  const { pathname } = useLocation();
  const [mainRoute] = pathname?.split(`${TEMPLATES_ROUTE}/`) || [];
  const baseRoute = mainRoute + `${TEMPLATES_ROUTE}`;
  const navigate = useNavigate();
  const { templateUUID: uuid } = useParams();
  const { rbac, subscriptions } = useAppContext();

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (_, value: string | number | undefined) => {
    switch (value) {
      case 'edit':
        navigate(`${baseRoute}/${uuid}/${EDIT_ROUTE}`);
        setIsOpen(false);
        break;
      case 'delete':
        navigate(`${baseRoute}/${uuid}/${DELETE_ROUTE}`);
        setIsOpen(false);
        break;

      default:
        setIsOpen(false);
        break;
    }
  };

  const hasRHELSubscription = !!subscriptions?.red_hat_enterprise_linux;
  const isMissingRequirements = !rbac?.templateWrite || !hasRHELSubscription;
  const missingRequirements =
    rbac?.templateWrite && !hasRHELSubscription ? 'subscription (RHEL)' : 'permission';

  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={onSelect}
      onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <ConditionalTooltip
          content='You do not have the required permission to perform this action.'
          show={!rbac?.templateWrite}
          setDisabled
        >
          <MenuToggle ref={toggleRef} onClick={onToggleClick} isExpanded={isOpen}>
            Actions
          </MenuToggle>
        </ConditionalTooltip>
      )}
      ouiaId='template_actions'
    >
      <DropdownList>
        <DropdownItem
          className={isMissingRequirements ? classes.disabledButton : ''}
          value='edit'
          isDisabled={isMissingRequirements}
          tooltipProps={
            isMissingRequirements
              ? {
                  isVisible: isMissingRequirements,
                  content: `You do not have the required ${missingRequirements} to perform this action.`,
                  position: TooltipPosition.left,
                }
              : undefined
          }
        >
          Edit
        </DropdownItem>
        <DropdownItem value='delete'>Delete</DropdownItem>
      </DropdownList>
    </Dropdown>
  );
}
