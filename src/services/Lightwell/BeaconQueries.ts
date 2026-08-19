import { useQuery } from '@tanstack/react-query';

import {
  getVulnerabilities,
  type BeaconData,
  type BeaconPagination,
  type BeaconVulnerabilityFilters,
} from './BeaconApi';

export const BEACON_VULNERABILITIES_KEY = 'BEACON_VULNERABILITIES_KEY';

export type { BeaconData } from './BeaconApi';

export const useBeaconVulnerabilitiesQuery = (
  customerId?: string,
  filters?: BeaconVulnerabilityFilters,
  pagination?: BeaconPagination,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: [BEACON_VULNERABILITIES_KEY, customerId, filters, pagination],
    queryFn: async (): Promise<BeaconData> =>
      getVulnerabilities(customerId!, filters, pagination),
    staleTime: 20_000,
    enabled: options?.enabled ?? Boolean(customerId),
    placeholderData: (previousData, previousQuery) => {
      if (!previousData || !previousQuery) {
        return undefined;
      }

      const previousCustomerId = previousQuery.queryKey[1];
      return previousCustomerId === customerId ? previousData : undefined;
    },
    meta: {
      title: 'Error loading beacon vulnerabilities',
      id: 'get-beacon-vulnerabilities-error',
    },
  });
