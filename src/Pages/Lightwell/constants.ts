import {
  LIGHTWELL_NOTIFICATION_ENABLED_LABEL,
  LIGHTWELL_NOTIFICATION_MINIMUM_LABEL,
  LIGHTWELL_NOTIFICATION_SEVERITIES,
  type LightwellNotificationSeverity,
} from 'services/Lightwell/UserPreferencesApi';
import type { NotificationSubscriptionType } from 'services/Notifications/NotificationsApi';

export {
  LIGHTWELL_NOTIFICATION_ENABLED_LABEL,
  LIGHTWELL_NOTIFICATION_MINIMUM_LABEL,
  LIGHTWELL_NOTIFICATION_SEVERITIES,
  type LightwellNotificationSeverity,
};

export const INSTANT_EMAIL_SUBSCRIPTION_TYPE: NotificationSubscriptionType = 'instant_email';

export const LIGHTWELL_FEATURE_NAME = 'lightwell-network';
export const LIGHTWELL_DEMO_FEATURE_NAME = 'lightwell-network-demo';
export const LIGHTWELL_ROUTE = '/lightwell';
export const LIGHTWELL_ORIGIN = 'lightwell';
export const LIGHTWELL_USE_MOCK = false;
export const LIGHTWELL_BEACON_USE_MOCK = true;

export const lightwellReposPerPageKey = 'lightwellRepositoriesPerPage';
export const lightwellPkgsPerPageKey = 'lightwellPackagesPerPage';

export const CONTENT_TYPE_PARAMETERS: Record<string, { ecosystem: string; label: string }> = {
  maven: { ecosystem: 'Java', label: 'Maven' },
  python: { ecosystem: 'Python', label: 'PyPI' },
};

export const REPOSITORY_DESCRIPTIONS: Record<string, Record<string, string>> = {
  maven: {
    validated:
      'Maven artifacts rebuilt from source by Red Hat. Verified end-to-end with no modifications.',
    remediated:
      'Maven artifacts with Red Hat backported fixes for known vulnerabilities in pinned versions.',
  },
  python: {
    validated:
      'Python wheels rebuilt from source by Red Hat. Verified end-to-end with no modifications.',
    remediated:
      'Python wheels with Red Hat backported fixes for known vulnerabilities in pinned versions.',
  },
};

export const LIGHTWELL_PROJECT_URL = 'https://www.redhat.com/en/lightwell';

export type LightwellNotificationPrefs = {
  enabled: boolean;
  minimumSeverity: LightwellNotificationSeverity;
};

export const LIGHTWELL_VULNERABILITY_SEVERITY_OPTIONS: {
  value: LightwellNotificationSeverity;
  label: string;
}[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'Important and above' },
  { value: 'medium', label: 'Moderate and above' },
  { value: 'low', label: 'All severities' },
];

export const DEFAULT_LIGHTWELL_NOTIFICATION_PREFS: LightwellNotificationPrefs = {
  enabled: false,
  minimumSeverity: 'high',
};

export const DEMO_LIGHTWELL_NOTIFICATION_PREFS: LightwellNotificationPrefs = {
  ...DEFAULT_LIGHTWELL_NOTIFICATION_PREFS,
  enabled: true,
};
