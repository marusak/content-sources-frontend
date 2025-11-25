import { QueryClient, QueryClientProvider } from 'react-query';
import {
  ContentItem,
  Links,
  Meta,
  PopularRepository,
  RepositoryParamsResponse,
  SnapshotByDateResponse,
  SnapshotForDate,
  SnapshotItem,
  ValidationResponse,
  type ErrataItem,
  type PackageItem,
  ContentOrigin,
} from 'services/Content/ContentApi';
import { AdminTask } from 'services/Admin/AdminTaskApi';
import { TemplateItem } from 'services/Templates/TemplateApi';
import type { IDSystemItem, SystemItem } from 'services/Systems/SystemsApi';

const queryClient = new QueryClient({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  logger: {
    log: console.log,
    warn: console.warn,
    // ✅ no more errors on the console with tests
    error: () => null,
  },
  defaultOptions: {
    queries: {
      // ✅ turns retries off (prevents testing timeouts)
      retry: false,
    },
  },
});

interface Props {
  children: React.ReactNode;
}

export const ReactQueryTestWrapper = ({ children }: Props) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export const testRepositoryParamsResponse: RepositoryParamsResponse = {
  distribution_versions: [
    {
      name: 'Any OS version',
      label: 'any',
    },
    {
      name: 'el7',
      label: '7',
    },
    {
      name: 'el8',
      label: '8',
    },
    {
      name: 'el9',
      label: '9',
    },
  ],
  distribution_arches: [
    { name: 'Any architecture', label: 'any' },
    {
      name: 'x86_64',
      label: 'x86_64',
    },
    {
      name: 's390x',
      label: 's390x',
    },
    {
      name: 'ppc64le',
      label: 'ppc64le',
    },
    {
      name: 'aarch64',
      label: 'aarch64',
    },
  ],
};

export const defaultValidationErrorData: ValidationResponse[] = [
  {
    name: {
      skipped: false,
      valid: true,
      error: '',
    },
    url: {
      skipped: false,
      valid: false,
      error: 'URL cannot be blank',
      http_code: 0,
      metadata_present: false,
      metadata_signature_present: false,
    },
  },
];

export const passingValidationErrorData: ValidationResponse = {
  name: {
    skipped: false,
    valid: true,
    error: '',
  },
  gpg_key: {
    skipped: false,
    valid: true,
    error: '',
  },
  url: {
    skipped: false,
    valid: true,
    error: '',
    http_code: 200,
    metadata_present: true,
    metadata_signature_present: true,
  },
};

export const defaultPopularRepository: PopularRepository = {
  uuid: '',
  existing_name: '',
  suggested_name: 'EPEL 9 Everything x86_64',
  url: 'https://download-i2.fedoraproject.org/pub/epel/9/Everything/x86_64/',
  distribution_versions: ['9'],
  distribution_arch: 'x86_64',
  gpg_key:
    '-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQINBGE3mOsBEACsU+XwJWDJVkItBaugXhXIIkb9oe+7aadELuVo0kBmc3HXt/Yp\nCJW9hHEiGZ6z2jwgPqyJjZhCvcAWvgzKcvqE+9i0NItV1rzfxrBe2BtUtZmVcuE6\n2b+SPfxQ2Hr8llaawRjt8BCFX/ZzM4/1Qk+EzlfTcEcpkMf6wdO7kD6ulBk/tbsW\nDHX2lNcxszTf+XP9HXHWJlA2xBfP+Dk4gl4DnO2Y1xR0OSywE/QtvEbN5cY94ieu\nn7CBy29AleMhmbnx9pw3NyxcFIAsEZHJoU4ZW9ulAJ/ogttSyAWeacW7eJGW31/Z\n39cS+I4KXJgeGRI20RmpqfH0tuT+X5Da59YpjYxkbhSK3HYBVnNPhoJFUc2j5iKy\nXLgkapu1xRnEJhw05kr4LCbud0NTvfecqSqa+59kuVc+zWmfTnGTYc0PXZ6Oa3rK\n44UOmE6eAT5zd/ToleDO0VesN+EO7CXfRsm7HWGpABF5wNK3vIEF2uRr2VJMvgqS\n9eNwhJyOzoca4xFSwCkc6dACGGkV+CqhufdFBhmcAsUotSxe3zmrBjqA0B/nxIvH\nDVgOAMnVCe+Lmv8T0mFgqZSJdIUdKjnOLu/GRFhjDKIak4jeMBMTYpVnU+HhMHLq\nuDiZkNEvEEGhBQmZuI8J55F/a6UURnxUwT3piyi3Pmr2IFD7ahBxPzOBCQARAQAB\ntCdGZWRvcmEgKGVwZWw5KSA8ZXBlbEBmZWRvcmFwcm9qZWN0Lm9yZz6JAk4EEwEI\nADgWIQT/itE0RZcQbs6BO5GKOHK/MihGfAUCYTeY6wIbDwULCQgHAgYVCgkICwIE\nFgIDAQIeAQIXgAAKCRCKOHK/MihGfFX/EACBPWv20+ttYu1A5WvtHJPzwbj0U4yF\n3zTQpBglQ2UfkRpYdipTlT3Ih6j5h2VmgRPtINCc/ZE28adrWpBoeFIS2YAKOCLC\nnZYtHl2nCoLq1U7FSttUGsZ/t8uGCBgnugTfnIYcmlP1jKKA6RJAclK89evDQX5n\nR9ZD+Cq3CBMlttvSTCht0qQVlwycedH8iWyYgP/mF0W35BIn7NuuZwWhgR00n/VG\n4nbKPOzTWbsP45awcmivdrS74P6mL84WfkghipdmcoyVb1B8ZP4Y/Ke0RXOnLhNe\nCfrXXvuW+Pvg2RTfwRDtehGQPAgXbmLmz2ZkV69RGIr54HJv84NDbqZovRTMr7gL\n9k3ciCzXCiYQgM8yAyGHV0KEhFSQ1HV7gMnt9UmxbxBE2pGU7vu3CwjYga5DpwU7\nw5wu1TmM5KgZtZvuWOTDnqDLf0cKoIbW8FeeCOn24elcj32bnQDuF9DPey1mqcvT\n/yEo/Ushyz6CVYxN8DGgcy2M9JOsnmjDx02h6qgWGWDuKgb9jZrvRedpAQCeemEd\nfhEs6ihqVxRFl16HxC4EVijybhAL76SsM2nbtIqW1apBQJQpXWtQwwdvgTVpdEtE\nr4ArVJYX5LrswnWEQMOelugUG6S3ZjMfcyOa/O0364iY73vyVgaYK+2XtT2usMux\nVL469Kj5m13T6w==\n=Mjs/\n-----END PGP PUBLIC KEY BLOCK-----',
  metadata_verification: false,
};

export const defaultRedHatRepository: Partial<ContentItem> = {
  uuid: '31c06bb4-ef1b-42f5-8c91-0ff67e7d8a1b',
  name: 'Red Hat CodeReady Linux Builder for RHEL 10 ARM 64 (RPMs)',
  url: 'https://cdn.redhat.com/content/dist/rhel10/10/aarch64/codeready-builder/os/',
  distribution_arch: 'aarch64',
  distribution_versions: ['10'],
  origin: ContentOrigin.REDHAT,
};

export const defaultEPELRepository: Partial<ContentItem> = {
  uuid: '053603c7-6ef0-4abe-8542-feacb8f7d575',
  name: 'EPEL 9 Everything x86_64',
  url: 'https://dl.fedoraproject.org/pub/epel/9/x86_64',
  distribution_arch: 'x86_64',
  distribution_versions: ['9'],
  origin: ContentOrigin.COMMUNITY,
};

export const defaultIntrospectTask: AdminTask = {
  uuid: '2375c35b-a67a-4ac2-a989-21139433c172',
  account_id: '11593016',
  org_id: '13446804',
  typename: 'introspect',
  status: 'completed',
  queued_at: '2023-06-15T10:41:02-04:00',
  started_at: '2023-06-15T10:42:02-04:00',
  finished_at: '2023-06-15T10:43:02-04:00',
  error: 'something went wrong',
  payload: {
    URL: 'https://example.com',
  },
};

export const defaultSnapshotTask: AdminTask = {
  ...defaultIntrospectTask,
  typename: 'snapshot',
  error: 'snapshot failed',
  pulp: {
    sync: {
      syncData: 'syncValue',
    },
    publication: {
      publicationData: 'publicationValue',
    },
    distribution: {
      distributionData: 'distributionValue',
    },
  },
};

export const defaultContentItem: ContentItem = {
  uuid: '053603c7-6ef0-4abe-8542-feacb8f7d575',
  name: 'SteveTheRepo',
  package_count: 100,
  url: 'https://stevetheRepo.org/epel/9',
  status: 'Pending',
  account_id: '',
  org_id: 'acme',
  distribution_arch: 'x86_64',
  gpg_key: defaultPopularRepository.gpg_key,
  distribution_versions: ['9'],
  last_introspection_error: '',
  last_introspection_time: '2023-03-07 17:13:48.619192 -0500 EST',
  failed_introspections_count: 0,
  metadata_verification: false,
  snapshot: true,
  module_hotfixes: false,
  last_snapshot_task: defaultSnapshotTask,
  last_introspection_status: 'Pending',
};

export const defaultContentItem_Upload: ContentItem = {
  uuid: '31c2db68-47eb-46c3-8dcb-c2dfac350f1a',
  name: 'SteveTheUploadRepo',
  package_count: 1,
  url: '',
  status: 'Pending',
  account_id: '',
  org_id: 'acme',
  distribution_arch: 'x86_64',
  gpg_key: defaultPopularRepository.gpg_key,
  distribution_versions: ['9'],
  last_introspection_error: '',
  last_introspection_time: '2023-03-07 17:13:48.619192 -0500 EST',
  failed_introspections_count: 0,
  metadata_verification: false,
  snapshot: true,
  module_hotfixes: false,
  last_snapshot_task: defaultSnapshotTask,
  last_introspection_status: 'Pending',
  origin: ContentOrigin.UPLOAD,
};

export const defaultUpdateTemplateTaskCompleted: AdminTask = {
  uuid: 'a44540de-b8ce-4843-94ae-53b1f630ca93',
  status: 'completed',
  error: '',
  org_id: '17684632',
  queued_at: '2024-09-18T20:24:57Z',
  started_at: '2024-09-18T20:24:57Z',
  finished_at: '2024-09-18T20:25:57Z',
  typename: 'update-template-content',
};

export const defaultUpdateTemplateTaskRunning: AdminTask = {
  uuid: 'b44540de-b8ce-4843-94ae-53b1f630ca94',
  status: 'running',
  error: '',
  org_id: '17684632',
  queued_at: '2024-09-18T20:24:57Z',
  started_at: '2024-09-18T20:24:57Z',
  finished_at: '',
  typename: 'update-template-content',
};

export const defaultUpdateTemplateTaskFailed: AdminTask = {
  uuid: 'x44540de-b8ce-4843-94ae-53b1f630ca99',
  status: 'failed',
  error: 'error',
  org_id: '17684632',
  queued_at: '2024-09-18T20:24:57Z',
  started_at: '2024-09-18T20:24:57Z',
  finished_at: '2024-09-18T20:25:57Z',
  typename: 'update-template-content',
};

export const defaultMetaItem: Meta = {
  limit: 10,
  offset: 0,
  count: 1,
};

export const defaultLinkItem: Links = {
  first:
    '/api/content-sources/v1/repositories/?arch=&limit=20&offset=0&search=&sort_by=name:asc&status=&version=',
  last: '/api/content-sources/v1/repositories/?arch=&limit=20&offset=0&search=&sort_by=name:asc&status=&version=',
};

export const defaultSnapshotItem: SnapshotItem = {
  uuid: '2375c35b-a67a-4ac2-a989-21139433c172',
  created_at: '2023-08-08T20:23:32.711372-06:00',
  distribution_path: 'b68beca3-d081-4c9f-9d8f-9868107c30e2/ea837ff5-62ed-4507-876d-2c600f55df54',
  content_counts: {
    'rpm.advisory': 3864,
    'rpm.package': 17208,
    'rpm.packagecategory': 1,
    'rpm.packageenvironment': 1,
    'rpm.packagegroup': 20,
  },
  added_counts: {
    'rpm.advisory': 100,
    'rpm.package': 200,
    'rpm.packagecategory': 1,
    'rpm.packageenvironment': 1,
    'rpm.packagegroup': 20,
  },
  removed_counts: {
    'rpm.advisory': 50,
    'rpm.package': 50,
    'rpm.packagecategory': 1,
    'rpm.packageenvironment': 1,
    'rpm.packagegroup': 1,
  },
  repository_name: 'SteveTheRepo',
  repository_uuid: '053603c7-6ef0-4abe-8542-feacb8f7d575',
};

export const defaultContentItemWithSnapshot: ContentItem = {
  account_id: 'undefined',
  distribution_arch: 'x86_64',
  distribution_versions: ['el7'],
  name: 'AwesomeNamewwyylse12',
  org_id: '13446804',
  url: 'https://google.ca/wwyylse12/x86_64/el7',
  uuid: '3375c35b-a67a-4ac2-a989-21139433c173',
  package_count: 0,
  origin: ContentOrigin.CUSTOM,
  status: '',
  last_introspection_error: '',
  last_introspection_time: '',
  failed_introspections_count: 0,
  gpg_key: '',
  metadata_verification: false,
  snapshot: true,
  last_snapshot: defaultSnapshotItem,
  module_hotfixes: false,
  last_introspection_status: '',
};

export const defaultTemplateItem: TemplateItem = {
  uuid: '50412eda-7df5-4fac-8556-278f45e2ef9b',
  name: 'Billybob!',
  org_id: '16758779',
  description: 'Tatata bala tu!',
  arch: 'aarch64',
  version: '9',
  date: '2024-01-22T00:00:00-07:00',
  repository_uuids: [
    '31c06bb4-ef1b-42f5-8c91-0ff67e7d8a1b',
    '28b8d2b1-e4d6-4d8a-be12-1104601fb96e',
    '053603c7-6ef0-4abe-8542-feacb8f7d575',
  ],
  snapshots: [defaultSnapshotItem],
  to_be_deleted_snapshots: [],
  use_latest: false,
  created_at: '2024-01-22T00:00:00-07:00',
  updated_at: '2024-01-22T00:00:00-07:00',
  created_by: 'Dudeguy',
  last_updated_by: 'Dudeguy',
  last_update_snapshot_error: '',
  last_update_task_uuid: '60412eda-7df5-4fac-8556-278f45e2ef9c',
  last_update_task: defaultUpdateTemplateTaskCompleted,
  rhsm_environment_created: true,
};

// Template used for testing delete modal where repo is not in any templates
export const defaultTemplateItem2: TemplateItem = {
  uuid: '60412eda-7df5-4fac-8556-278f45e2ef9a',
  name: 'Bettyboop!',
  org_id: '16758779',
  description: 'I am not associated with the default repo!',
  arch: 'aarch64',
  version: '9',
  date: '2024-01-22T00:00:00-07:00',
  repository_uuids: [
    '31c06bb4-ef1b-42f5-8c91-0ff67e7d8a1b',
    '28b8d2b1-e4d6-4d8a-be12-1104601fb96e',
  ],
  snapshots: [defaultSnapshotItem],
  to_be_deleted_snapshots: [defaultSnapshotItem],
  use_latest: false,
  created_at: '2024-01-22T00:00:00-07:00',
  updated_at: '2024-01-22T00:00:00-07:00',
  created_by: 'Dudeguy',
  last_updated_by: 'Dudeguy',
  last_update_snapshot_error: '',
  rhsm_environment_created: true,
};

export const defaultSnapshotForDateItem: SnapshotForDate = {
  repository_uuid: defaultContentItem.uuid,
  is_after: true,
  match: {
    uuid: '5fbe7478-50f9-4dc3-b5f2-eb9827bb2752',
    created_at: '2024-01-23T14:43:49.380795-07:00',
    repository_path:
      '096184ac/2b2aad70-d47f-4e15-bcc2-32cb5dc9ea54/bfa35d57-1224-4699-a36e-29ab3b1390f2',
    content_counts: {
      'rpm.advisory': 3233,
      'rpm.modulemd': 754,
      'rpm.modulemd_defaults': 48,
      'rpm.package': 27792,
      'rpm.packagecategory': 5,
      'rpm.packageenvironment': 2,
      'rpm.packagegroup': 51,
      'rpm.repo_metadata_file': 1,
    },
    added_counts: {
      'rpm.advisory': 3233,
      'rpm.modulemd': 754,
      'rpm.modulemd_defaults': 48,
      'rpm.package': 27792,
      'rpm.packagecategory': 5,
      'rpm.packageenvironment': 2,
      'rpm.packagegroup': 51,
      'rpm.repo_metadata_file': 1,
    },
    removed_counts: {},
    url: '',
  },
};

export const defaultSnapshotsByDateResponse: SnapshotByDateResponse = {
  data: [defaultSnapshotForDateItem],
};

export const defaultSystemsListItem: SystemItem = {
  attributes: {
    display_name: '14867.host.example.com',
    os: 'RHEL 9.3',
    rhsm: '',
    tags: [],
    last_evaluation: null,
    rhsa_count: 0,
    rhba_count: 0,
    rhea_count: 0,
    other_count: 0,
    packages_installed: 0,
    baseline_name: '',
    last_upload: '2024-07-22T14:43:58.803303Z',
    stale_timestamp: '2024-07-14T02:10:37.142532Z',
    stale_warning_timestamp: '2024-07-21T02:10:37.142532Z',
    culled_timestamp: '2024-07-28T02:10:37.142532Z',
    created: '2024-07-12T21:10:37.142509Z',
    stale: true,
    satellite_managed: false,
    built_pkgcache: false,
    packages_installable: 0,
    packages_applicable: 0,
    installable_rhsa_count: 0,
    installable_rhba_count: 0,
    installable_rhea_count: 0,
    installable_other_count: 0,
    applicable_rhsa_count: 0,
    applicable_rhba_count: 0,
    applicable_rhea_count: 0,
    applicable_other_count: 0,
    baseline_id: 0,
    template_name: 'asdf',
    template_uuid: '2bab9c0c-8518-48f8-bbe3-eb195547f3b6',
    groups: [],
    arch: 'x86_64',
  },
  id: 'edf803e4-caf3-48f4-b04e-db0eabe495df',
  type: 'system',
};

export const minorReleaseSystemsListItem: SystemItem = {
  id: '4b2c15a7-9e7f-40c2-b36d-01f807d9c6e3',
  attributes: {
    ...defaultSystemsListItem.attributes,
    display_name: '40098.host.example.com',
    rhsm: '9.3',
    template_name: '',
    template_uuid: '',
  },
  type: 'system',
};

export const defaultTemplateSystemsListItem: IDSystemItem = {
  attributes: {
    display_name: 'rhel9.jsherril-lap.example.com',
    os: 'RHEL 9.3',
    rhsm: '',
    installable_rhsa_count: 0,
    installable_rhba_count: 0,
    installable_rhea_count: 0,
    installable_other_count: 0,
    applicable_rhsa_count: 0,
    applicable_rhba_count: 0,
    applicable_rhea_count: 0,
    applicable_other_count: 0,
    tags: [],
    groups: [],
    last_upload: '2024-07-22T14:41:51.626621Z',
  },
  inventory_id: 'c05cb55e-acdd-44c8-b3e3-e21f00e714ff',
  type: 'system',
};

export const defaultPackageItem: PackageItem = {
  name: 'banana-base-libs',
  arch: 'x86_64',
  version: '1.2.3',
  release: '6.el9_fruit',
  epoch: '0',
  summary: 'Core libraries for 389 Banana Server',
};

export const defaultErrataItem: ErrataItem = {
  id: '0190a44a-fcd3-7aa1-a280-033399516ead',
  errata_id: 'RHSA-2024:4502',
  title: 'Important: skopeo security update',
  summary:
    'An update for skopeo is now available for Red Hat Enterprise Linux 9.\n\nRed Hat Product Security has rated this update as having a security impact of Important. A Common Vulnerability Scoring System (CVSS) base score, which gives a detailed severity rating, is available for each vulnerability from the CVE link(s) in the References section.',
  description:
    'The skopeo command lets you inspect images from container image registries, get images and image layers, and use signatures to create and verify files. \n\nSecurity Fix(es):\n\n* golang-fips/openssl: Memory leaks in code encrypting and decrypting RSA payloads (CVE-2024-1394)\n\nFor more details about the security issue(s), including the impact, a CVSS score, acknowledgments, and other related information, refer to the CVE page(s) listed in the References section.',
  issued_date: '2024-07-11 11:34:56',
  updated_date: '2024-07-11 11:34:56',
  type: 'security',
  severity: 'Important',
  reboot_suggested: false,
  cves: ['CVE-2024-1394'],
};
