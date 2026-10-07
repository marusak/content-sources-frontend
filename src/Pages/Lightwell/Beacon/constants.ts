import type { Severity, Status } from './types';

export const STATUSES: Status[] = [
  'Submitted',
  'Classified',
  'Fix in Progress',
  'Validation',
  'Lightwell Network',
];

export const UNREMEDIATED_STATUS: Status = 'Unremediated';
export const NO_REMEDIATION_LABEL = 'No remediation';

export const FILTER_STATUSES: Status[] = [...STATUSES, UNREMEDIATED_STATUS];

export function statusLabel(status: Status): string {
  return status === UNREMEDIATED_STATUS ? NO_REMEDIATION_LABEL : status;
}

export const STATUS_DESCRIPTIONS: Record<Status, string> = {
  Submitted: 'Vulnerability submitted, undergoing initial review to identify a fix target.',
  Classified: 'Fix target identified.',
  'Fix in Progress': 'A fix is currently under development.',
  Validation: 'The fix is being validated within the Red Hat pipeline.',
  'Lightwell Network': 'The fix is available in the Lightwell Repository.',
  Upstreaming: 'The fix is being shared with the upstream community.',
  Published: 'The fix is available in upstream repos.',
  Unremediated: 'The vulnerability was closed without a shipped fix.',
};

export const SEVERITIES: Severity[] = ['Critical', 'Important', 'Moderate', 'Minor'];
