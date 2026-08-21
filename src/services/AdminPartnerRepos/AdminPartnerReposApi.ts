import axios from 'axios';

export const toggleAsPartner = async (uuid: string, partner: boolean): Promise<void> =>
  await axios.patch(`/api/content-sources/v1/admin/repositories/${uuid}/partner`, {
    partner,
  });
