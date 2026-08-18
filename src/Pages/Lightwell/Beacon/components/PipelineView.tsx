import { Flex, FlexItem } from '@patternfly/react-core';

import { STAGES, type Vulnerability } from '../../mockVulnerabilities';
import { StageCard } from './StageCard';

type PipelineViewProps = {
  vulnerabilities: Vulnerability[];
  className?: string;
};

export function PipelineView({ vulnerabilities, className }: PipelineViewProps) {
  const stageStats = STAGES.map((stage) => {
    const count = vulnerabilities.filter((v) => v.stage === stage).length;
    return { stage, count };
  });

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
