import { Card, CardBody, CardHeader, CardTitle, Content, Tooltip } from '@patternfly/react-core';

import { STAGE_DESCRIPTIONS, type Stage } from '../../mockVulnerabilities';

type StageCardProps = {
  stage: Stage;
  count: number;
  className?: string;
};

export function StageCard({ stage, count, className }: StageCardProps) {
  return (
    <Tooltip content={STAGE_DESCRIPTIONS[stage]}>
      <Card className={`lightwell-stage-card ${className ?? ''}`}>
        <CardHeader>
          <CardTitle className='lightwell-stage-card-label'>{stage}</CardTitle>
        </CardHeader>
        <CardBody className='lightwell-stage-card-body'>
          <div className='lightwell-stage-card-count'>
            <span className='lightwell-stage-card-number'>{count}</span>
            <Content component='small'>vulnerabilities</Content>
          </div>
        </CardBody>
      </Card>
    </Tooltip>
  );
}
