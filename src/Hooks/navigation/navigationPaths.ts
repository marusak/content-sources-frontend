import { ContentOrigin } from 'services/Content/ContentApi';

import {
  ADMIN_TASKS_ROUTE,
  PACKAGES_ROUTE,
  PARTNER_REPO_ROUTE,
  REPOSITORIES_ROUTE,
  SYSTEMS_ROUTE,
  TEMPLATES_ROUTE,
} from 'Routes/constants';

type FilterKey =
  'allRepositories' | 'redHatRepositories' | 'partnerRepositories' | 'customRepositories';

type NavigationKey =
  | 'repositories'
  | 'nonRedHatRepositories'
  | 'templates'
  | 'packagesLatest'
  | 'root'
  | 'adminTasks'
  | 'repositorySnapshots'
  | 'systems'
  | 'partnerRepo';

export type DestinationKey = FilterKey | NavigationKey;

type NavigationPaths = Record<NavigationKey, BuildDestinationPath>;
type BuildDestinationPath = (params: DestinationParams) => string;
type DestinationParams = {
  contentOrigin: ContentOrigin[];
  rootPath: string;
  repoUUID: string;
  templateUUID: string;
};

/**
 * Record that builds appropriate location string based on runtime parameters.
 *
 * To create a new destination, put (1) a new key into DestinationKey type.
 * (2) for this key define a new function that builds the final destination string.
 * You can use already defined DestinaionParams or define in the type new ones
 * if something is missing. In that case you also need to make appropriate
 * changes in the useNavigationTo hook.
 */
export const navigationPaths: NavigationPaths = {
  root: ({ rootPath, contentOrigin }) =>
    rootPath +
    (contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.REDHAT
      ? `?origin=${contentOrigin}`
      : ''),
  repositories: ({ rootPath, contentOrigin }) =>
    `${rootPath}/${REPOSITORIES_ROUTE}` +
    (contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.REDHAT
      ? `?origin=${contentOrigin}`
      : ''),
  nonRedHatRepositories: ({ rootPath }) => `${rootPath}/${REPOSITORIES_ROUTE}`,
  packagesLatest: ({ rootPath, repoUUID }) =>
    `${rootPath}/${REPOSITORIES_ROUTE}/${repoUUID}/${PACKAGES_ROUTE}`,
  adminTasks: ({ rootPath }) => `${rootPath}/${REPOSITORIES_ROUTE}/${ADMIN_TASKS_ROUTE}`,
  repositorySnapshots: ({ rootPath, repoUUID }) =>
    `${rootPath}/${REPOSITORIES_ROUTE}/${repoUUID}/snapshots`,
  templates: ({ rootPath }) => `${rootPath}/${TEMPLATES_ROUTE}`,
  systems: ({ rootPath, templateUUID }) =>
    `${rootPath}/${TEMPLATES_ROUTE}/${templateUUID}/${SYSTEMS_ROUTE}`,
  partnerRepo: ({ rootPath, repoUUID }) =>
    `${rootPath}/${REPOSITORIES_ROUTE}/${repoUUID}/${PARTNER_REPO_ROUTE}`,
};
