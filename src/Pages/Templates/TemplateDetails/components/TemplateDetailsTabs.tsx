import { Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ADVISORIES_ROUTE,
  CONTENT_ROUTE,
  PACKAGES_ROUTE,
  SYSTEMS_ROUTE,
  REPOSITORIES_ROUTE,
  TEMPLATES_ROUTE,
} from 'Routes/constants';
import { useEffect, useState } from 'react';
import useRootPath from 'Hooks/useRootPath';
import useSafeUUIDParam from '../../../../Hooks/useSafeUUIDParam';

type ContentTabType = typeof CONTENT_ROUTE | typeof SYSTEMS_ROUTE;
type ContentSubTabType =
  | typeof PACKAGES_ROUTE
  | typeof ADVISORIES_ROUTE
  | typeof REPOSITORIES_ROUTE;

const isSafeTabKey = (key: string) => {
  const ALLOWED_ROUTES = [
    CONTENT_ROUTE,
    SYSTEMS_ROUTE,
    PACKAGES_ROUTE,
    ADVISORIES_ROUTE,
    REPOSITORIES_ROUTE,
  ];
  return ALLOWED_ROUTES.includes(key);
};

export default function TemplateDetailsTabs() {
  const { pathname } = useLocation();
  const rootPath = useRootPath();
  const navigate = useNavigate();
  const uuid = useSafeUUIDParam('templateUUID');

  const baseRoute = `${rootPath}/${TEMPLATES_ROUTE}/${uuid}`;

  // State to track active tabs
  const [primaryTabKey, setPrimaryTabKey] = useState<ContentTabType>(SYSTEMS_ROUTE);
  const [secondaryTabKey, setSecondaryTabKey] = useState<ContentSubTabType>(PACKAGES_ROUTE);

  // Sync state with URL changes
  useEffect(() => {
    const tabPath = pathname.replace(baseRoute, '').replace(/^\//, '');
    const [firstSegment, secondSegment] = tabPath.split('/').filter(Boolean);

    if ([SYSTEMS_ROUTE, CONTENT_ROUTE].includes(firstSegment)) {
      setPrimaryTabKey(firstSegment as ContentTabType);
    }

    if (secondSegment && firstSegment === CONTENT_ROUTE) {
      if ([PACKAGES_ROUTE, ADVISORIES_ROUTE, REPOSITORIES_ROUTE].includes(secondSegment)) {
        setSecondaryTabKey(secondSegment as ContentSubTabType);
      }
    }
  }, [pathname, baseRoute]);

  const handlePrimaryTabSelect = (eventKey: string) => {
    if (!isSafeTabKey(eventKey)) {
      return;
    }

    if (eventKey === CONTENT_ROUTE) {
      navigate(
        `${baseRoute}/${CONTENT_ROUTE}/${isSafeTabKey(secondaryTabKey) ? secondaryTabKey : PACKAGES_ROUTE}`,
      );
    } else {
      navigate(`${baseRoute}/${eventKey}`);
    }
  };

  const handleSecondaryTabSelect = (eventKey: string) => {
    if (isSafeTabKey(eventKey)) {
      navigate(`${baseRoute}/${CONTENT_ROUTE}/${eventKey}`);
    }
  };

  return (
    <Tabs
      activeKey={primaryTabKey}
      variant='default'
      onSelect={(_, eventKey) => handlePrimaryTabSelect(eventKey as string)}
      aria-label='Template detail tabs'
    >
      <Tab
        eventKey={SYSTEMS_ROUTE}
        ouiaId='systems_tab'
        title={<TabTitleText>Systems</TabTitleText>}
        aria-label='Template systems detail tab'
      />
      <Tab
        eventKey={CONTENT_ROUTE}
        ouiaId='content_tab'
        title={<TabTitleText>Content</TabTitleText>}
        aria-label='Template content detail tab'
      >
        <Tabs
          activeKey={secondaryTabKey}
          onSelect={(_, eventKey) => handleSecondaryTabSelect(eventKey as string)}
          aria-label='Template content subtabs'
          isSubtab={true}
          variant='secondary'
        >
          <Tab
            eventKey={PACKAGES_ROUTE}
            ouiaId='packages_tab'
            title={<TabTitleText>Packages</TabTitleText>}
            aria-label='Template package detail tab'
          />
          <Tab
            eventKey={ADVISORIES_ROUTE}
            ouiaId='advisories_tab'
            title={<TabTitleText>Advisories</TabTitleText>}
            aria-label='Template advisories detail tab'
          />
          <Tab
            eventKey={REPOSITORIES_ROUTE}
            ouiaId='repositories_tab'
            title={<TabTitleText>Repositories</TabTitleText>}
            aria-label='Template repositories detail tab'
          />
        </Tabs>
      </Tab>
    </Tabs>
  );
}
