import type { Severity, Stage } from './types';

export const STAGES: Stage[] = [
  'Submitted',
  'Classified',
  'Fix in Progress',
  'Validation',
  'Lightwell Network',
];

export const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  Submitted: 'Vulnerability submitted, undergoing initial review to identify a fix target.',
  Classified: 'Fix target identified.',
  'Fix in Progress': 'A fix is currently under development.',
  Validation: 'The fix is being validated within the Red Hat pipeline.',
  'Lightwell Network': 'The fix is available in the Lightwell Repository.',
  Upstreaming: 'The fix is being shared with the upstream community.',
  Published: 'The fix is available in upstream repos.',
};

export const SEVERITIES: Severity[] = ['Critical', 'Important', 'Moderate', 'Minor'];
