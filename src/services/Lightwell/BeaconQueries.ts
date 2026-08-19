import { useQuery } from '@tanstack/react-query';

import {
  getVulnerabilities,
  type BeaconData,
  type BeaconVulnerabilityFilters,
} from './BeaconApi';

export const BEACON_VULNERABILITIES_KEY = 'BEACON_VULNERABILITIES_KEY';

export type { BeaconData } from './BeaconApi';

export const useBeaconVulnerabilitiesQuery = (
  customerId?: string,
  filters?: BeaconVulnerabilityFilters,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: [BEACON_VULNERABILITIES_KEY, customerId, filters],
    queryFn: async (): Promise<BeaconData> => getVulnerabilities(customerId!, filters),
    staleTime: 20_000,
    enabled: options?.enabled ?? Boolean(customerId),
    meta: {
      title: 'Error loading beacon vulnerabilities',
      id: 'get-beacon-vulnerabilities-error',
    },
  });
