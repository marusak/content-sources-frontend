import { Content, Flex, FlexItem, Title } from '@patternfly/react-core';
import {
  Chart,
  ChartAxis,
  ChartBar,
  ChartStack,
  ChartTooltip,
} from '@patternfly/react-charts/victory';

import {
  ECOSYSTEM_BREAKDOWN_CHART_MIN_WIDTH,
  ECOSYSTEM_CHART_DOMAIN_PADDING,
  ECOSYSTEM_CHART_PADDING,
  ECOSYSTEM_LEGEND_DATA,
  EXACT_MATCH_COLOR,
  FUZZY_MATCH_COLOR,
  NO_MATCH_COLOR,
} from '../constants';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { CompletedCoverageReport } from 'services/Lightwell/CoverageReportsApi';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import { useMemo } from 'react';

type EcosystemBreakdownCardProps = {
  report: CompletedCoverageReport;
};

const getEcosystemData = (report: CompletedCoverageReport) => ({
  exactPackages: report.ecosystem_coverage_summary.map((eco) => ({
    x: eco.ecosystem,
    y: eco.exact_matches,
  })),
  fuzzyPackages: report.ecosystem_coverage_summary.map((eco) => ({
    x: eco.ecosystem,
    y: eco.partial_matches,
  })),
  unmatchedPackages: report.ecosystem_coverage_summary.map((eco) => ({
    x: eco.ecosystem,
    y: eco.unmatched,
  })),
});

const EcosystemBreakdownCard = ({ report }: EcosystemBreakdownCardProps) => {
  const { containerRef, width: chartWidth } = useContainerWidth(
    ECOSYSTEM_BREAKDOWN_CHART_MIN_WIDTH,
  );

  const ecosystemCount = report.ecosystem_coverage_summary.length;
  const inNetwork = report.exact_matches + report.partial_matches;

  const { exactPackages, fuzzyPackages, unmatchedPackages } = useMemo(
    () => getEcosystemData(report),
    [report],
  );

  return (
    <>
      <Title headingLevel='h3' size='xl' className={spacing.pbSm}>
        By Ecosystem
      </Title>
      <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
        <FlexItem>
          <Content component='p'>
            <strong>{inNetwork}</strong> of <strong>{report.total}</strong> packages in supported
            ecosystems match the Lightwell Network catalog.
          </Content>
        </FlexItem>
        <FlexItem>
          <div ref={containerRef} style={{ width: '100%' }}>
            <Chart
              ariaDesc='Horizontal stacked bar chart showing package matches per ecosystem'
              horizontal
              domainPadding={ECOSYSTEM_CHART_DOMAIN_PADDING}
              height={75 + ecosystemCount * 55}
              width={chartWidth}
              padding={ECOSYSTEM_CHART_PADDING}
              legendPosition='right'
              legendOrientation='vertical'
              legendData={ECOSYSTEM_LEGEND_DATA}
            >
              <ChartAxis style={{ tickLabels: { fontSize: 14 } }} />
              <ChartAxis
                dependentAxis
                tickFormat={(t: number) => (Number.isInteger(t) ? t.toString() : '')}
                showGrid
                style={{
                  tickLabels: { fontSize: 14 },
                  axisLabel: { fontSize: 14, padding: 50 },
                }}
                label='Packages'
              />
              <ChartStack>
                <ChartBar
                  data={exactPackages}
                  style={{ data: { fill: EXACT_MATCH_COLOR } }}
                  labelComponent={<ChartTooltip constrainToVisibleArea />}
                  labels={({ datum }) => `${datum.x} exact match: ${datum.y}`}
                />
                <ChartBar
                  data={fuzzyPackages}
                  style={{ data: { fill: FUZZY_MATCH_COLOR } }}
                  labelComponent={<ChartTooltip constrainToVisibleArea />}
                  labels={({ datum }) => `${datum.x} partial match: ${datum.y}`}
                />
                <ChartBar
                  data={unmatchedPackages}
                  style={{ data: { fill: NO_MATCH_COLOR } }}
                  labelComponent={<ChartTooltip constrainToVisibleArea />}
                  labels={({ datum }) => `${datum.x} no match: ${datum.y}`}
                />
              </ChartStack>
            </Chart>
          </div>
        </FlexItem>
      </Flex>
    </>
  );
};

export default EcosystemBreakdownCard;
