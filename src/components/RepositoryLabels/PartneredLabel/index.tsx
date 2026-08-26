import { Label, Tooltip } from '@patternfly/react-core';

const PartneredLabel = () => (
  <Tooltip content='This upload repository is marked as a partner repository.'>
    <Label color='purple' isCompact>
      Partnered
    </Label>
  </Tooltip>
);

export default PartneredLabel;
