import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Features } from 'services/Features/FeatureApi';
import PackageJson from '../../package.json';
import { useFetchFeaturesQuery } from 'services/Features/FeatureQueries';
import { ContentOrigin } from 'services/Content/ContentApi';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import { ChromeAPI } from '@redhat-cloud-services/types';
import getRBAC from '@redhat-cloud-services/frontend-components-utilities/RBAC';
import { Subscriptions } from 'services/Subscriptions/SubscriptionApi';
import { useFetchSubscriptionsQuery } from 'services/Subscriptions/SubscriptionQueries';
import { useFlag } from '@unleash/proxy-client-react';

const { appname } = PackageJson.insights;

// Add permissions here
export enum RbacPermissions {
  'repoRead', // If the user doesn't have this permission, they won't see the app, it is thus presumed true.
  'repoWrite',
  'templateWrite',
  'templateRead',
}

export interface AppContextInterface {
  rbac?: Record<keyof typeof RbacPermissions, boolean>;
  features: Features | null;
  isFetchingPermissions: boolean;
  subscriptions?: Subscriptions;
  contentOrigin: ContentOrigin[];
  setContentOrigin: React.Dispatch<React.SetStateAction<ContentOrigin[]>>;
  chrome?: ChromeAPI;
  zeroState: boolean;
  setZeroState: (zeroState: boolean) => void;
  isLightspeedEnabled: boolean;
}

export const AppContext = createContext({} as AppContextInterface);

export const ContextProvider = ({ children }: { children: ReactNode }) => {
  const [rbac, setRbac] = useState<Record<keyof typeof RbacPermissions, boolean> | undefined>(
    undefined,
  );
  const [zeroState, setZeroState] = useState(true);
  const [features, setFeatures] = useState<Features | null>(null);
  const chrome = useChrome();
  const [contentOrigin, setContentOrigin] = useState<ContentOrigin[]>([
    ContentOrigin.EXTERNAL,
    ContentOrigin.UPLOAD,
  ]);
  const { fetchFeatures, isLoading: isFetchingFeatures } = useFetchFeaturesQuery();
  const { data: subscriptions, isLoading: isFetchingSubscriptions } = useFetchSubscriptionsQuery();
  const isLightspeedEnabled = useFlag('platform.lightspeed-rebrand') || false;

  useEffect(() => {
    if (chrome && !rbac) {
      // Get permissions and store them in context
      chrome.auth.getUser().then(async () =>
        getRBAC(appname).then((res) => {
          const rbacSet = new Set(res.permissions.map(({ permission }) => permission));

          setRbac({
            repoRead: rbacSet.has('content-sources:repositories:read'),
            repoWrite: rbacSet.has('content-sources:repositories:write'),
            templateRead: rbacSet.has('content-sources:templates:read'),
            templateWrite: rbacSet.has('content-sources:templates:write'),
          });
        }),
      );
    }

    (async () => {
      const fetchedFeatures = await fetchFeatures();
      setFeatures(fetchedFeatures);

      if (fetchedFeatures?.communityrepos?.enabled) {
        setContentOrigin((prev) =>
          prev.includes(ContentOrigin.COMMUNITY) ? prev : [...prev, ContentOrigin.COMMUNITY],
        );
      } else {
        setContentOrigin((prev) => prev.filter((origin) => origin !== ContentOrigin.COMMUNITY));
      }
    })();
  }, [!!chrome]);

  return (
    <AppContext.Provider
      value={{
        rbac: rbac,
        features: features,
        isFetchingPermissions: isFetchingFeatures || isFetchingSubscriptions,
        subscriptions: subscriptions,
        contentOrigin,
        setContentOrigin,
        chrome: chrome as ChromeAPI,
        zeroState,
        setZeroState,
        isLightspeedEnabled,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
