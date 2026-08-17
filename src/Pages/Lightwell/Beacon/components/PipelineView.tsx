import { Flex, FlexItem } from '@patternfly/react-core';

import { STAGES } from '../constants';
import { StageCard } from './StageCard';

type PipelineViewProps = {
  stageCounts?: Record<string, number>;
  className?: string;
};

export function PipelineView({ stageCounts = {}, className }: PipelineViewProps) {
  const stageStats = STAGES.map((stage) => ({
    stage,
    count: stageCounts[stage] ?? 0,
  }));

  return (
    <div className={`lightwell-pipeline ${className ?? ''}`}>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsStretch' }}>
        {stageStats.map((stat, idx) => (
          <FlexItem key={stat.stage} flex={{ default: 'flex_1' }}>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapNone' }}>
              <FlexItem flex={{ default: 'flex_1' }}>
                <StageCard stage={stat.stage} count={stat.count} />
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
