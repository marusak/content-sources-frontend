import '@redhat-cloud-services/frontend-components-utilities/styles/_all';
import 'react18-json-view/src/style.css';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { NotificationsProvider } from '@redhat-cloud-services/frontend-components-notifications';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { last } from 'lodash';

import Routes from './Routes';
import { useAppContext } from './middleware/AppContext';
import { ContentOrigin, FilterData } from './services/Content/ContentApi';
import { useContentListQuery } from './services/Content/ContentQueries';
import { perPageKey } from './Pages/Repositories/ContentListTable/ContentListTable';
import { CONTENT_ROUTE, REPOSITORIES_ROUTE } from './Routes/constants';
import usePageSafe from 'Hooks/usePageSafe';

export default function App() {
  const { rbac, isFetchingPermissions, zeroState, setZeroState } = useAppContext();
  const storedPerPage = Number(localStorage.getItem(perPageKey)) || 20;
  const { pathname } = useLocation();
  const pageSafe = usePageSafe();
  const { hideGlobalFilter } = useChrome();

  const isDefaultRoute = useMemo(
    () => [REPOSITORIES_ROUTE, '', CONTENT_ROUTE].includes(last(pathname.split('/')) || ''),
    [pathname],
  );

  const [filterData] = useState<FilterData>({
    search: '',
    versions: [],
    arches: [],
    statuses: [],
  });

  const { data = { data: [], meta: { count: 0, limit: 20, offset: 0 } }, isLoading } =
    useContentListQuery(
      1,
      storedPerPage,
      filterData,
      '',
      [ContentOrigin.EXTERNAL, ContentOrigin.UPLOAD],
      isDefaultRoute && zeroState, // We only check if the route is correct and zerostate is true (defaults to true)
    );

  // Hide Insights' global filter bar
  useEffect(() => {
    hideGlobalFilter(true);
  }, [hideGlobalFilter]);

  // Check for user's custom repositories to determine whether we need to show zero state
  useEffect(() => {
    // Zero state may be true AND a user may have repositories if they have signed in via a different machine for the first time
    if ((zeroState && data.data.length > 0) || (zeroState && !isDefaultRoute)) {
      setZeroState(false);
    }
  }, [data.data.length, zeroState]);

  if (!rbac || isFetchingPermissions || isLoading) {
    return (
      <Bullseye>
        <div data-ouia-safe={false} />
        <Spinner size='xl' />
      </Bullseye>
    );
  }

  return (
    <NotificationsProvider>
      <div data-ouia-safe={pageSafe} />
      <Routes />
    </NotificationsProvider>
  );
}
