import { Content, Flex, FlexItem, Title } from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { ChartDonut, ChartLabel } from '@patternfly/react-charts/victory';
import { useMemo } from 'react';
import {
  COVERAGE_DONUT_HEIGHT,
  COVERAGE_DONUT_PADDING,
  COVERAGE_DONUT_TITLE_LINE_HEIGHT,
  COVERAGE_DONUT_WIDTH,
  EXACT_MATCH_COLOR,
  FUZZY_MATCH_COLOR,
  NO_MATCH_COLOR,
} from '../constants';
import type { CompletedCoverageReport } from 'services/Lightwell/CoverageReportsApi';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import MatchSummaryStats, { type MatchSummaryItem } from './MatchSummaryStats';

type CoverageSummaryCardProps = {
  report: CompletedCoverageReport;
};

const getMatchSummaryItems = (report: CompletedCoverageReport): MatchSummaryItem[] => [
  {
    count: report.exact_matches,
    label: 'Exact match',
    tooltip: 'Package name and version found in the Lightwell Network catalog.',
  },
  {
    count: report.partial_matches,
    label: 'Partial match',
    tooltip: 'Package name found in the catalog, but not the specific version you are running.',
  },
  {
    count: report.unmatched,
    label: 'No match',
    tooltip:
      'Package not found in the Lightwell Network catalog. Unmatched packages are logged as demand signals, but do not guarantee a build.',
  },
];

const getDonutData = (report: CompletedCoverageReport) => [
  { x: 'Exact match', y: report.exact_matches },
  { x: 'Partial match', y: report.partial_matches },
  { x: 'No match', y: report.unmatched },
];

const CoverageSummaryCard = ({ report }: CoverageSummaryCardProps) => {
  const { containerRef, width: chartWidth } = useContainerWidth(COVERAGE_DONUT_WIDTH);
  const chartHeight = Math.round((chartWidth * COVERAGE_DONUT_HEIGHT) / COVERAGE_DONUT_WIDTH);

  const inNetwork = report.exact_matches + report.partial_matches;
  const percentage = report.total > 0 ? Math.round((inNetwork / report.total) * 100) : 0;

  const matchSummaryItems = useMemo(() => getMatchSummaryItems(report), [report]);
  const donutData = useMemo(() => getDonutData(report), [report]);

  return (
    <Flex gap={{ default: 'gapXl' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem style={{ width: '100%', maxWidth: COVERAGE_DONUT_WIDTH }}>
        <div ref={containerRef} style={{ width: '100%' }}>
          <ChartDonut
            ariaDesc='Match summary donut chart'
            constrainToVisibleArea
            data={donutData}
            colorScale={[EXACT_MATCH_COLOR, FUZZY_MATCH_COLOR, NO_MATCH_COLOR]}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            title={`${percentage}%`}
            subTitle='packages matched'
            titleComponent={<ChartLabel lineHeight={COVERAGE_DONUT_TITLE_LINE_HEIGHT} />}
            width={chartWidth}
            height={chartHeight}
            padding={COVERAGE_DONUT_PADDING}
          />
        </div>
      </FlexItem>
      <FlexItem flex={{ default: 'flex_1' }}>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
          <FlexItem>
            <Title headingLevel='h3' size='2xl'>
              <strong>{percentage}%</strong> of packages match the Lightwell Network catalog
            </Title>
            <Content component='p' className={`${text.textColorSubtle} ${spacing.mtSm}`}>
              Applies to packages within supported ecosystems (see below).
            </Content>
          </FlexItem>
          <FlexItem>
            <MatchSummaryStats items={matchSummaryItems} />
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );
};

export default CoverageSummaryCard;
