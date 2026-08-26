import { Flex } from '@patternfly/react-core';

import MarkAsPartneredInProgressLabel from 'components/RepositoryLabels/MarkPartnerInProgressLabel';
import PartneredLabel from 'components/RepositoryLabels/PartneredLabel';
import PartnerRepositoryLabel from 'components/RepositoryLabels/PartnerRepositoryLabel';
import UploadRepositoryLabel from 'components/RepositoryLabels/UploadRepositoryLabel';

import { ContentOrigin } from 'services/Content/ContentApi';

type RepositoryLabelsProps = {
  origin: ContentOrigin | undefined;
  isRepoBeingMarkedAsPartner: boolean;
  isPartner: boolean | undefined;
};

export const RepositoryLabels = ({
  origin,
  isRepoBeingMarkedAsPartner,
  isPartner,
}: RepositoryLabelsProps) => {
  // upload repositories
  if (origin === ContentOrigin.UPLOAD) {
    let additionalLabels;
    if (isRepoBeingMarkedAsPartner) additionalLabels = <MarkAsPartneredInProgressLabel />;
    if (isPartner) additionalLabels = <PartneredLabel />;

    return (
      <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }}>
        <UploadRepositoryLabel />
        {additionalLabels}
      </Flex>
    );
  }

  // partner repositories
  if (origin === ContentOrigin.COMMUNITY) return <PartnerRepositoryLabel />;

  return null;
};
