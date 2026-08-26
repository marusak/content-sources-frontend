import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '../styles/lightwell-chrome-overrides.scss';
import '../styles/lightwell-clipboard-copy.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Loader from 'components/Loader';

import { ErrorPage } from 'components/Error/ErrorPage';
import usePageSafe from 'Hooks/usePageSafe';
import PackagesTable from 'Pages/Lightwell/Packages/PackagesTable';
import PackageDetails from 'Pages/Lightwell/Packages/PackageDetails';
import RepositoriesTable from 'Pages/Lightwell/Repositories/RepositoriesTable';
import Beacon from 'Pages/Lightwell/Beacon/Beacon';
import CoverageAnalyzer from 'Pages/Lightwell/Coverage/CoverageAnalyzer';
import LightwellNotFound from 'Pages/Lightwell/components/LightwellNotFound';
import { LightwellDemoLayout } from 'Pages/Lightwell/LightwellDemoContext';
import { useAppContext } from './middleware/AppContext';

export default function LightwellApp() {
  const pageSafe = usePageSafe();
  const { hideGlobalFilter } = useChrome();
  const { features, isFetchingPermissions } = useAppContext();

  useEffect(() => {
    hideGlobalFilter(true);
  }, [hideGlobalFilter]);

  return (
    <ErrorPage>
      <div data-ouia-safe={pageSafe} />
      {isFetchingPermissions ? (
        <Loader />
      ) : (
        <Routes>
          <Route path='demo' element={<LightwellDemoLayout />}>
            <Route index element={<RepositoriesTable />} />
            <Route path=':repoName/:group/:packageName' element={<PackageDetails />} />
            <Route path=':repoName/:packageName' element={<PackageDetails />} />
            <Route path=':repoName' element={<PackagesTable />} />
          </Route>
          <Route index element={<RepositoriesTable />} />
          {features?.lightwellbeacon?.enabled && features?.lightwellbeacon?.accessible ? (
            <Route path='beacon' element={<Beacon />} />
          ) : null}
          {features?.lightwelllens?.enabled && features?.lightwelllens?.accessible ? (
            <Route path='lens' element={<CoverageAnalyzer />} />
          ) : null}
          <Route path=':repoName/:group/:packageName' element={<PackageDetails />} />
          <Route path=':repoName/:packageName' element={<PackageDetails />} />
          <Route path=':repoName' element={<PackagesTable />} />
          <Route path='*' element={<LightwellNotFound />} />
        </Routes>
      )}
    </ErrorPage>
  );
}
