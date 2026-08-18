import { useQuery } from '@tanstack/react-query';

import { LIGHTWELL_BEACON_USE_MOCK } from '../../constants';
import { mockVulnerabilities, type Vulnerability } from '../../mockVulnerabilities';

export type BeaconData = {
  vulnerabilities: Vulnerability[];
};

async function fetchBeaconData(_customerId: string): Promise<BeaconData> {
  if (LIGHTWELL_BEACON_USE_MOCK) {
    return {
      vulnerabilities: [...mockVulnerabilities],
    };
  }

  throw new Error('Beacon API is not yet available');
}

export function useBeaconData(customerId?: string) {
  return useQuery({
    queryKey: ['lightwell-beacon', customerId],
    queryFn: () => fetchBeaconData(customerId!),
    staleTime: 20_000,
    enabled: Boolean(customerId),
  });
}
