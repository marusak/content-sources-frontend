import type { Complexity, Severity, Stage } from './types';

export const STAGES: Stage[] = [
  'Submitted',
  'Classified',
  'Fix in Progress',
  'Validation',
  'Lightwell Network',
];

export const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  Submitted:
    'Vulnerability submitted, undergoing initial review to determine complexity and identify fixed target.',
  Classified: 'Assessed for complexity; fixed target identified.',
  'Fix in Progress': 'A fix is currently under development.',
  Validation: 'The fix is being validated within the Red Hat pipeline.',
  'Lightwell Network': 'The fix is available in the Lightwell Repository.',
  Upstreaming: 'The fix is being shared with the upstream community following embargo guidelines.',
  Published: 'No longer embargoed; available in upstream repos.',
};

export const COMPLEXITY_SLA: Record<Complexity, number | null> = {
  Standard: 3,
  Complex: 8,
  Extensive: 16,
  'Ecosystem Unavailable': null,
  "Won't Fix": null,
};

export const SEVERITIES: Severity[] = ['Critical', 'Important', 'Moderate', 'Minor'];

export const COMPLEXITIES: Complexity[] = [
  'Standard',
  'Complex',
  'Extensive',
  'Ecosystem Unavailable',
  "Won't Fix",
];
