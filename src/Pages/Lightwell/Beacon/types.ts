export type Severity = 'Critical' | 'Important' | 'Moderate' | 'Minor';

export type Complexity =
  'Standard' | 'Complex' | 'Extensive' | 'Ecosystem Unavailable' | "Won't Fix";

export type Stage =
  | 'Submitted'
  | 'Classified'
  | 'Fix in Progress'
  | 'Validation'
  | 'Lightwell Network'
  | 'Upstreaming'
  | 'Published';

export type CustomerPriority = 'Priority 1' | 'Priority 2' | 'Priority 3' | 'Priority 4';

export interface Vulnerability {
  uuid: string;
  vulnerabilityId: string;
  purl: string;
  componentName: string;
  componentVersion: string;
  title: string;
  cwe: string;
  description: string;
  severity: Severity;
  cvss: number;
  cvssVector?: string;
  exploitTested: boolean;
  reproducerIncluded: boolean;
  customerPriority?: CustomerPriority;
  stage: Stage;
  complexity: Complexity;
  submittedDate: string;
  lastUpdated: string;
  ageDays: number;
  embargo: boolean;
  duplicate: boolean;
  blocked: boolean;
  duplicateOf?: string;
  ltwlsupt_ticket_id?: string;
  ltwlsupt_ticket_ids?: string[];
}
