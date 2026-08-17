import { Flex, FlexItem } from '@patternfly/react-core';

import { STAGES, type Vulnerability } from '../../mockVulnerabilities';
import { StageCard } from './StageCard';

type PipelineViewProps = {
  vulnerabilities: Vulnerability[];
  stuckThreshold?: number;
  className?: string;
};

export function PipelineView({
  vulnerabilities,
  stuckThreshold = 30,
  className,
}: PipelineViewProps) {
  const stageStats = STAGES.map((stage) => {
    const items = vulnerabilities.filter((v) => v.stage === stage);
    const count = items.length;
    const totalAge = items.reduce((sum, v) => sum + v.ageDays, 0);
    const avgAge = count > 0 ? Math.round(totalAge / count) : 0;
    const stuckCount = items.filter((v) => v.ageDays > stuckThreshold).length;
    return { stage, count, avgAge, stuckCount };
  });

  return (
    <div className={`lightwell-pipeline ${className ?? ''}`}>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsStretch' }}>
        {stageStats.map((stat, idx) => (
          <FlexItem key={stat.stage} flex={{ default: 'flex_1' }}>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapNone' }}>
              <FlexItem flex={{ default: 'flex_1' }}>
                <StageCard
                  stage={stat.stage}
                  count={stat.count}
                  avgAge={stat.avgAge}
                  stuckCount={stat.stuckCount}
                />
              </FlexItem>
              {idx < stageStats.length - 1 && (
                <FlexItem className='lightwell-pipeline-arrow'>&#9654;</FlexItem>
              )}
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </div>
  );
}
