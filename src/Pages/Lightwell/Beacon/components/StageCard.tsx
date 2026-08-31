import { Card, CardBody, CardHeader, CardTitle, Tooltip } from '@patternfly/react-core';

import { STAGE_DESCRIPTIONS } from '../constants';
import type { Stage } from '../types';

type StageCardProps = {
  stage: Stage;
  count: number;
  className?: string;
};

export function StageCard({ stage, count }: StageCardProps) {
  return (
    <Tooltip content={STAGE_DESCRIPTIONS[stage]}>
      <Card className='lightwell-stage-card'>
        <CardHeader>
          <CardTitle className='lightwell-stage-card-label'>{stage}</CardTitle>
        </CardHeader>
        <CardBody>
          <span className='lightwell-stage-card-number'>{count}</span>
        </CardBody>
      </Card>
    </Tooltip>
  );
}
