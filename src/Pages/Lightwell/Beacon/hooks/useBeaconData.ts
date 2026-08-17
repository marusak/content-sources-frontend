import { useQuery } from '@tanstack/react-query';

import { LIGHTWELL_BEACON_USE_MOCK } from '../../constants';
import {
  mockBatches,
  mockVulnerabilities,
  type Batch,
  type Vulnerability,
} from '../../mockVulnerabilities';

export type BeaconData = {
  vulnerabilities: Vulnerability[];
  batches: Batch[];
};

async function fetchBeaconData(): Promise<BeaconData> {
  if (LIGHTWELL_BEACON_USE_MOCK) {
    return {
      vulnerabilities: [...mockVulnerabilities],
      batches: [...mockBatches],
    };
  }

  throw new Error('Beacon API is not yet available');
}

export function useBeaconData() {
  return useQuery({
    queryKey: ['lightwell-beacon'],
    queryFn: fetchBeaconData,
    staleTime: 20_000,
  });
}
