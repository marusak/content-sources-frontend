import { Label, Tooltip } from '@patternfly/react-core';

const MarkAsPartneredInProgressLabel = () => (
  <Tooltip content='Partner marking request is in progress.'>
    <Label variant='outline' color='purple' isCompact>
      Marking as Partnered in progress
    </Label>
  </Tooltip>
);

export default MarkAsPartneredInProgressLabel;
