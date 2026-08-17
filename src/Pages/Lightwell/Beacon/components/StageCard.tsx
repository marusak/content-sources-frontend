import { Card, CardBody, CardHeader, CardTitle, Content, Tooltip } from '@patternfly/react-core';

import { STAGE_DESCRIPTIONS, type Stage } from '../../mockVulnerabilities';

type StageCardProps = {
  stage: Stage;
  count: number;
  stuckCount: number;
  className?: string;
};

export function StageCard({ stage, count, stuckCount, className }: StageCardProps) {
  const isStuck = stuckCount > 0;

  return (
    <Tooltip content={STAGE_DESCRIPTIONS[stage]}>
      <Card
        className={`lightwell-stage-card ${isStuck ? 'lightwell-stage-card--stuck' : ''} ${className ?? ''}`}
      >
        <CardHeader>
          <CardTitle className='lightwell-stage-card-label'>{stage}</CardTitle>
        </CardHeader>
        <CardBody className='lightwell-stage-card-body'>
          <div className='lightwell-stage-card-count'>
            <span className='lightwell-stage-card-number'>{count}</span>
            <Content component='small'>vulnerabilities</Content>
          </div>
          {isStuck && (
            <Content component='small' className='lightwell-stage-card-stuck'>
              {stuckCount} blocked
            </Content>
          )}
        </CardBody>
      </Card>
    </Tooltip>
  );
}
