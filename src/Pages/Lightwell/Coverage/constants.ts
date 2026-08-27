import { chart_color_blue_400 } from '@patternfly/react-tokens/dist/esm/chart_color_blue_400';
import { chart_color_blue_200 } from '@patternfly/react-tokens/dist/esm/chart_color_blue_200';
import { chart_color_black_200 } from '@patternfly/react-tokens/dist/esm/chart_color_black_200';

export const EXACT_MATCH_COLOR = chart_color_blue_400.value;
export const FUZZY_MATCH_COLOR = chart_color_blue_200.value;
export const NO_MATCH_COLOR = chart_color_black_200.value;

export const COVERAGE_DONUT_WIDTH = 320;
export const COVERAGE_DONUT_HEIGHT = 280;
export const COVERAGE_DONUT_PADDING = { bottom: 10, left: 10, right: 10, top: 10 };
export const COVERAGE_DONUT_TITLE_LINE_HEIGHT = 1.3;

export const ECOSYSTEM_BREAKDOWN_CHART_MIN_WIDTH = 500;
export const ECOSYSTEM_CHART_PADDING = { bottom: 65, left: 100, right: 175, top: 10 };
export const ECOSYSTEM_CHART_DOMAIN_PADDING = { x: [15, 15] as [number, number] };

export const ECOSYSTEM_LEGEND_DATA = [
  { name: 'Exact match', symbol: { fill: EXACT_MATCH_COLOR } },
  { name: 'Partial match', symbol: { fill: FUZZY_MATCH_COLOR } },
  { name: 'No match', symbol: { fill: NO_MATCH_COLOR } },
];
