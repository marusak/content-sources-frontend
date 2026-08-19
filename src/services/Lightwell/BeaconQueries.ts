import { useQuery } from '@tanstack/react-query';

import type { Vulnerability } from 'Pages/Lightwell/mockVulnerabilities';

import { getVulnerabilities } from './BeaconApi';

export const BEACON_VULNERABILITIES_KEY = 'BEACON_VULNERABILITIES_KEY';

export type BeaconData = {
  vulnerabilities: Vulnerability[];
};

export const useBeaconVulnerabilitiesQuery = (customerId?: string) =>
  useQuery({
    queryKey: [BEACON_VULNERABILITIES_KEY, customerId],
    queryFn: async (): Promise<BeaconData> => ({
      vulnerabilities: await getVulnerabilities(customerId!),
    }),
    staleTime: 20_000,
    enabled: Boolean(customerId),
    meta: {
      title: 'Error loading beacon vulnerabilities',
      id: 'get-beacon-vulnerabilities-error',
    },
  });
