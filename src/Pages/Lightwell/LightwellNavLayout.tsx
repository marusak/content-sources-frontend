import { createPortal } from 'react-dom';
import { Nav, NavList, NavItem, Panel, PanelMain, PanelMainBody } from '@patternfly/react-core';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useLightwellRootPath } from 'Hooks/Lightwell/navigation/useLightwellRootPath';
import { useDrawerContentSubnavPortal } from 'Hooks/Lightwell/navigation/useDrawerContentSubnavPortal';
import {
  lightwellNavigationPaths,
  type LightwellDestinationKey,
} from 'Hooks/Lightwell/navigation/lightwellNavigationPaths';

type NavItemConfig = {
  key: 'repositories' | 'lens' | 'beacon';
  title: string;
  destination: LightwellDestinationKey;
};

const NAV_ITEMS: NavItemConfig[] = [
  { key: 'repositories', title: 'Repositories', destination: 'repositories' },
  { key: 'lens', title: 'Lens', destination: 'lens' },
  { key: 'beacon', title: 'Beacon', destination: 'beacon' },
];

// Horizontal subnav for switching between Lightwell's index pages, per
// https://www.patternfly.org/components/navigation#horizontal-subnav, wrapped in a
// secondary Panel per https://www.patternfly.org/components/panel#secondary-variant.
// Portaled outside the scrollable main content (see useDrawerContentSubnavPortal).
// On stage Chrome the portal lands under drawer__main, between drawer__content and
// page__main-container — not inside page content.
// Detail routes (e.g. package pages) are rendered outside of this layout.
export default function LightwellNavLayout() {
  const { pathname } = useLocation();
  const rootPath = useLightwellRootPath();
  const subnavPortalContainer = useDrawerContentSubnavPortal();

  const activeKey: NavItemConfig['key'] = pathname.endsWith('/beacon')
    ? 'beacon'
    : pathname.endsWith('/lens')
      ? 'lens'
      : 'repositories';

  const panel = (
    <Panel variant='secondary'>
      <PanelMain>
        <PanelMainBody>
          <Nav aria-label='Horizontal subnav' variant='horizontal-subnav'>
            <NavList>
              {NAV_ITEMS.map(({ key, title, destination }) => (
                <NavItem key={key} itemId={key} isActive={activeKey === key} ouiaId={`lightwell-nav-${key}`}>
                  <Link to={lightwellNavigationPaths[destination]({ rootPath })}>{title}</Link>
                </NavItem>
              ))}
            </NavList>
          </Nav>
        </PanelMainBody>
      </PanelMain>
    </Panel>
  );

  return (
    <>
      {subnavPortalContainer ? createPortal(panel, subnavPortalContainer) : null}
      <Outlet />
    </>
  );
}
