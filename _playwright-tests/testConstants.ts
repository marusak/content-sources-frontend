/**
 * Centralized timeouts and polling intervals for Playwright tests.
 * Use these instead of hard-coded values to simplify tuning and reasoning.
 */

/** Full test suite timeout for long-running CI tests (template creation, containers, etc.) */
export const LONG_TEST_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Visibility timeouts */
export const MODAL_VISIBILITY_TIMEOUT_MS = 30_000;
export const SYSTEM_ROW_VISIBILITY_TIMEOUT_MS = 30_000;
export const PAGE_NAVIGATION_TIMEOUT_MS = 20_000;
export const PAGE_NAVIGATION_QUICK_TIMEOUT_MS = 10_000;
export const PAGE_READY_TIMEOUT_MS = 30_000;
export const SNAPSHOT_DIALOG_TIMEOUT_MS = 60_000;

/** Command execution timeouts (dnf, yum, container exec) */
export const DNF_COMMAND_TIMEOUT_MS = 120_000; // 2 min for package queries/installs
export const DNF_UPDATEINFO_TIMEOUT_MS = 10 * 60 * 1000; // 10 min for updateinfo list
export const YUM_INSTALL_TIMEOUT_MS = 120_000;
export const YUM_INSTALL_QUICK_TIMEOUT_MS = 60_000; // Faster installs (small packages with no deps)
export const SHORT_EXEC_TIMEOUT_MS = 10_000; // cat, ls, hostname, etc.
export const MEDIUM_EXEC_TIMEOUT_MS = 60_000;
export const LONG_EXEC_TIMEOUT_MS = 660_000; // 11 min for content propagation in CI

/** Template and repository status waits (content propagation can be slow in CI) */
export const TEMPLATE_VALID_STATUS_TIMEOUT_MS = 660_000;
/** Custom repo snapshot / introspection to Valid (matches IntrospectRepo and SnapshotErrata waits) */
export const REPO_VALID_STATUS_TIMEOUT_MS = 180_000;
export const UPLOAD_COMPLETION_TIMEOUT_MS = 240_000;
export const BULK_TASK_TIMEOUT_MS = 600_000;

/** Poll config for expect.poll (content propagation checks) */
export const CONTENT_PROPAGATION_POLL = {
  timeout: 120_000,
  intervals: [10_000, 15_000, 20_000] as const,
};

/** Poll config for errata counts (content propagation in CI) */
export const ERRATA_POLL = {
  timeout: 120_000,
  intervals: [15_000, 20_000, 25_000] as const,
  dnfTimeout: 2 * 60 * 1000,
};

/** Poll config for template update task completion */
export const TEMPLATE_UPDATE_TASK_POLL = {
  timeout: 660_000,
  intervals: [5_000, 10_000, 10_000, 10_000, 10_000] as const,
};

/** System row visibility when waiting for template assignment (content propagation) */
export const SYSTEM_ATTACHMENT_VISIBILITY_TIMEOUT_MS = 120_000;

/** RHSM client and container operation timeouts */
export const RHSM = {
  /** Unregister disconnect (allow time for remote server communication) */
  disconnectTimeoutMs: 10_000,
  /** RHC connect / registration */
  connectTimeoutMs: 75_000,
  /** Quick status checks (hostname, systemctl is-active) */
  statusCheckTimeoutMs: 5_000,
  /** systemctl status (before disconnect) */
  serviceStatusTimeoutMs: 5_000,
  /** DBus socket existence check */
  dbusCheckTimeoutMs: 1_000,
  /** systemctl start dbus */
  dbusStartTimeoutMs: 5_000,
  /** Poll delay between wait attempts */
  pollDelayMs: 1_000,
} as const;

/** waitForRhcdActive default parameters */
export const RHSM_RHCD_WAIT = {
  maxAttempts: 60,
  delayMs: 2_000,
} as const;

/** Release stream map of short names to human-readable names */
export const RELEASE_STREAMS = {
  eus: 'Extended Update Support (EUS)',
  e4s: 'Update Services for SAP Solutions (E4S)',
  eeus: 'Enhanced Extended Update Support (EEUS)',
} as const;
