import '@patternfly/react-catalog-view-extension/dist/css/react-catalog-view-extension.css';
import '../styles/lightwell-chrome-overrides.scss';
import '../styles/lightwell-clipboard-copy.scss';
import { useChrome } from '@redhat-cloud-services/frontend-components/useChrome';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';

import { ErrorPage } from 'components/Error/ErrorPage';
import usePageSafe from 'Hooks/usePageSafe';
import PackagesTable from 'Pages/Lightwell/Packages/PackagesTable';
import PackageDetails from 'Pages/Lightwell/Packages/PackageDetails';
import RepositoriesTable from 'Pages/Lightwell/Repositories/RepositoriesTable';
import Beacon from 'Pages/Lightwell/Beacon/Beacon';
import { LightwellDemoLayout } from 'Pages/Lightwell/LightwellDemoContext';

export default function LightwellApp() {
  const pageSafe = usePageSafe();
  const { hideGlobalFilter } = useChrome();

  useEffect(() => {
    hideGlobalFilter(true);
  }, [hideGlobalFilter]);

  return (
    <ErrorPage>
      <div data-ouia-safe={pageSafe} />
      <Routes>
        <Route path='demo' element={<LightwellDemoLayout />}>
          <Route index element={<RepositoriesTable />} />
          <Route path='beacon' element={<Beacon />} />
          <Route path=':repoName/:group/:packageName' element={<PackageDetails />} />
          <Route path=':repoName/:packageName' element={<PackageDetails />} />
          <Route path=':repoName' element={<PackagesTable />} />
        </Route>
        <Route index element={<RepositoriesTable />} />
        <Route path='beacon' element={<Beacon />} />
        <Route path=':repoName/:group/:packageName' element={<PackageDetails />} />
        <Route path=':repoName/:packageName' element={<PackageDetails />} />
        <Route path=':repoName' element={<PackagesTable />} />
      </Routes>
    </ErrorPage>
  );
}
