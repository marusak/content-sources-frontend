import axios from 'axios';

import { LIGHTWELL_BEACON_USE_MOCK } from 'Pages/Lightwell/constants';

const MOCK_CUSTOMER_IDS = ['CID-01', 'CID-214', 'CID-34'];

export const getCustomerIds = async (): Promise<string[]> => {
  if (LIGHTWELL_BEACON_USE_MOCK) {
    return [...MOCK_CUSTOMER_IDS];
  }

  const { data } = await axios.get<string[]>('/api/content-sources/v1/lightwell/customer_ids/');
  return data;
};
