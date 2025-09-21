import { AlertVariant } from '@patternfly/react-core';
import { useState } from 'react';
import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import { cloneDeep } from 'lodash';

import {
  ContentListResponse,
  deleteContentListItem,
  getContentList,
  RepositoryParamsResponse,
  getRepositoryParams,
  AddContentListItems,
  CreateContentRequest,
  FilterData,
  validateContentListItems,
  EditContentListItem,
  getGpgKey,
  PackagesResponse,
  getPackages,
  getPopularRepositories,
  PopularRepositoriesResponse,
  CreateContentRequestResponse,
  ContentItem,
  introspectRepository,
  IntrospectRepositoryRequestItem,
  fetchContentItem,
  deleteContentListItems,
  Meta,
  ErrorResponse,
  getSnapshotList,
  SnapshotListResponse,
  ContentOrigin,
  getRepoConfigFile,
  triggerSnapshot,
  getSnapshotsByDate,
  getSnapshotPackages,
  getSnapshotErrata,
  ErrataResponse,
  type EditContentRequestItem,
  type ValidateContentRequestItem,
  addUploads,
  type AddUploadRequest,
  deleteSnapshots,
  getLatestRepoConfigFile,
  PopularRepository,
} from './ContentApi';
import { ADMIN_TASK_LIST_KEY } from '../Admin/AdminTaskQueries';
import useErrorNotification from 'Hooks/useErrorNotification';
import useNotification from 'Hooks/useNotification';
import {
  GET_TEMPLATES_KEY,
  GET_TEMPLATE_PACKAGES_KEY,
  TEMPLATE_ERRATA_KEY,
  TEMPLATE_SNAPSHOTS_KEY,
  TEMPLATES_FOR_SNAPSHOTS,
} from '../Templates/TemplateQueries';

export const CONTENT_LIST_KEY = 'CONTENT_LIST_KEY';
export const POPULAR_REPOSITORIES_LIST_KEY = 'POPULAR_REPOSITORIES_LIST_KEY';
export const REPOSITORY_PARAMS_KEY = 'REPOSITORY_PARAMS_KEY';
export const CREATE_PARAMS_KEY = 'CREATE_PARAMS_KEY';
export const PACKAGES_KEY = 'PACKAGES_KEY';
export const SNAPSHOT_PACKAGES_KEY = 'SNAPSHOT_PACKAGES_KEY';
export const SNAPSHOT_ERRATA_KEY = 'SNAPSHOT_ERRATA_KEY';
export const LIST_SNAPSHOTS_KEY = 'LIST_SNAPSHOTS_KEY';
export const CONTENT_ITEM_KEY = 'CONTENT_ITEM_KEY';
export const REPO_CONFIG_FILE_KEY = 'REPO_CONFIG_FILE_KEY';
export const LATEST_REPO_CONFIG_FILE_KEY = 'LATEST_REPO_CONFIG_FILE_KEY';

const CONTENT_LIST_POLLING_TIME = 10000; // 10 seconds

const buildContentListKey = (
  page: number,
  limit: number,
  sortBy?: string,
  contentOrigin?: ContentOrigin[],
  filterData?: Partial<FilterData>,
) =>
  `${page}${limit}${sortBy}${contentOrigin?.sort().join(',')}${filterData?.arches?.join(
    '',
  )}${filterData?.versions?.join('')}${filterData?.urls?.join('')}${filterData?.uuids?.join(
    '',
  )}${filterData?.statuses?.join('')}${filterData?.availableForArch}${filterData?.availableForVersion}${filterData?.search}`;

export const useFetchContent = (uuid: string, enabled = true) => {
  const errorNotifier = useErrorNotification();
  return useQuery<ContentItem>([CONTENT_ITEM_KEY, uuid], () => fetchContentItem(uuid), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) =>
      errorNotifier(
        'Unable to find associated repository.',
        'An error occurred',
        err,
        'fetch-content-error',
      ),
    keepPreviousData: true,
    staleTime: 20000,
    enabled,
  });
};

export const usePopularRepositoriesQuery = (
  page: number,
  limit: number,
  filterData?: Partial<FilterData>,
  sortBy?: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<PopularRepositoriesResponse>(
    [POPULAR_REPOSITORIES_LIST_KEY, page, limit, sortBy, ...Object.values(filterData || {})], // NOTE: Update this if larger list!!!!
    () => getPopularRepositories(page, limit, filterData, sortBy),
    {
      keepPreviousData: true,
      staleTime: 20000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        errorNotifier(
          'Unable to get popular repositories list',
          'An error occurred',
          err,
          'popular-repository-error',
        ),
    },
  );
};

export const useContentListQuery = (
  page: number,
  limit: number,
  filterData: FilterData,
  sortBy: string,
  contentOrigin: ContentOrigin[],
  enabled: boolean = true,
  polling: boolean = false,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<ContentListResponse>(
    // Below MUST match the "contentListKeyArray" seen below in the useDeleteContent.
    [CONTENT_LIST_KEY, buildContentListKey(page, limit, sortBy, contentOrigin, filterData)],
    () => getContentList(page, limit, filterData, sortBy, contentOrigin),
    {
      onError: (err) => {
        errorNotifier(
          'Unable to get repositories list',
          'An error occurred',
          err,
          'content-list-error',
        );
      },
      refetchInterval: polling ? CONTENT_LIST_POLLING_TIME : undefined,
      refetchIntervalInBackground: false, // This prevents endless polling when our app isn't the focus tab in a browser
      refetchOnWindowFocus: polling, // If polling and navigate to another tab, on refocus, we want to poll once more. (This is based off of the stalestime below)
      keepPreviousData: true,
      staleTime: 20000,
      enabled,
    },
  );
};

export const useAddContentQuery = (request: CreateContentRequest) => {
  const queryClient = useQueryClient();
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => AddContentListItems(request.filter((item) => !!item)), {
    onSuccess: (data: CreateContentRequestResponse) => {
      const hasPending = (data as ContentItem[]).some(({ status }) => status === 'Pending');

      notify({
        variant: AlertVariant.success,
        title:
          request?.length > 1
            ? `${request?.length} custom repositories added`
            : `Custom repository "${request?.[0]?.name}" added`,
        ...(request[0]?.origin === ContentOrigin.UPLOAD
          ? {}
          : {
              description: hasPending
                ? 'Repository introspection in progress'
                : 'Repository introspection data already available',
            }),
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        'Error adding items to content list',
        'An error occurred',
        err,
        'add-content-error',
      );
    },
  });
};

export const useAddUploadsQuery = (request: AddUploadRequest) => {
  const queryClient = useQueryClient();
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => addUploads(request), {
    onSuccess: (data) => {
      const uploadCount = (request?.uploads?.length || 0) + (request?.artifacts?.length || 0);
      notify({
        variant: AlertVariant.success,
        title:
          uploadCount > 1
            ? `${uploadCount} rpms successfully uploaded to ${data.object_name}`
            : `One rpm successfully uploaded to ${data.object_name}`,
        description: 'This repository will be snapshotted shortly',
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        'Error uploading rpms to this repository',
        'An error occurred',
        err,
        'add-upload-error',
      );
    },
  });
};

export const useAddPopularRepositoryQuery = (
  queryClient: QueryClient,
  request: CreateContentRequest,
  page: number,
  perPage: number,
  filterData?: FilterData,
) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  const popularRepositoriesKeyArray = [
    POPULAR_REPOSITORIES_LIST_KEY,
    page,
    perPage,
    undefined,
    ...Object.values(filterData || {}),
  ];
  const filteredRequest = request.filter((item) => !!item);
  return useMutation(() => AddContentListItems(filteredRequest), {
    onMutate: async () => {
      const { name } = filteredRequest[0];
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(popularRepositoriesKeyArray);
      // Snapshot the previous value
      const previousPopularData: Partial<PopularRepositoriesResponse> =
        queryClient.getQueryData(popularRepositoriesKeyArray) || {};

      queryClient.setQueryData(popularRepositoriesKeyArray, () => ({
        ...previousPopularData,
        data: previousPopularData.data?.map((data) => {
          if (name === data.suggested_name && !data.uuid) {
            return { ...data, uuid: 'temp', existing_name: name };
          }
          return data;
        }),
      }));
      return { previousData: previousPopularData };
    },
    onSuccess: (data: CreateContentRequestResponse) => {
      const hasPending = (data as ContentItem[]).some(({ status }) => status === 'Pending');
      notify({
        variant: AlertVariant.success,
        title: `Custom repository "${data?.[0]?.name}" added`,
        description: hasPending
          ? 'Repository introspection in progress'
          : 'Repository introspection data already available',
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    onError: (err, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: PopularRepositoriesResponse;
        };
        queryClient.setQueryData(popularRepositoriesKeyArray, previousData);
      }
      errorNotifier(
        'Error adding item from popularRepo',
        'An error occurred',
        err,
        'add-popular-repo-error',
      );
    },
  });
};

export const useEditContentQuery = (request: EditContentRequestItem) => {
  const queryClient = useQueryClient();
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => EditContentListItem(request), {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: `Successfully edited repository ${request.name}`,
      });

      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(CONTENT_ITEM_KEY);
      queryClient.invalidateQueries(LIST_SNAPSHOTS_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        'Error editing items on content list',
        'An error occurred',
        err,
        'edit-content-error',
      );
    },
  });
};

export const useValidateContentList = () => {
  const errorNotifier = useErrorNotification();
  return useMutation((request: ValidateContentRequestItem) => validateContentListItems(request), {
    onError: (err) => {
      errorNotifier(
        'Error validating form fields',
        'An error occurred',
        err,
        'validate-content-error',
      );
    },
  });
};

export const useDeletePopularRepositoryMutate = (
  queryClient: QueryClient,
  page: number,
  perPage: number,
  filterData?: FilterData,
) => {
  const popularRepositoriesKeyArray = [
    POPULAR_REPOSITORIES_LIST_KEY,
    page,
    perPage,
    undefined,
    ...Object.values(filterData || {}),
  ];
  const errorNotifier = useErrorNotification();
  return useMutation(deleteContentListItem, {
    onMutate: async (uuid: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(popularRepositoriesKeyArray);
      // Snapshot the previous value
      const previousPopularData: Partial<PopularRepositoriesResponse> =
        queryClient.getQueryData(popularRepositoriesKeyArray) || {};

      queryClient.setQueryData(popularRepositoriesKeyArray, () => ({
        ...previousPopularData,
        data: previousPopularData.data?.map((data) => {
          if (data.uuid === uuid) {
            return { ...data, uuid: undefined };
          }
          return data;
        }),
      }));
      // Return a context object with the snapshotted value
      return { previousData: previousPopularData, queryClient };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: PopularRepositoriesResponse;
        };
        queryClient.setQueryData(popularRepositoriesKeyArray, previousData);
      }
      errorNotifier(
        'Unable to delete the given repository.',
        'An error occurred',
        err,
        'delete-popular-repository-error',
      );
    },
  });
};

export const useDeleteContentItemMutate = (
  queryClient: QueryClient,
  page: number,
  perPage: number,
  contentOrigin: ContentOrigin[],
  filterData?: FilterData,
  sortString?: string,
) => {
  // Below MUST match the "useContentList" key found above or updates will fail.
  const contentListKeyArray = [
    CONTENT_LIST_KEY,
    buildContentListKey(page, perPage, sortString, contentOrigin, filterData),
  ];
  const errorNotifier = useErrorNotification();
  return useMutation(deleteContentListItem, {
    onMutate: async (uuid: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(contentListKeyArray);
      // Snapshot the previous value
      const previousData: Partial<ContentListResponse> =
        queryClient.getQueryData(contentListKeyArray) || {};

      // Optimistically update to the new value
      queryClient.setQueryData(contentListKeyArray, () => ({
        ...previousData,
        data: previousData.data?.filter((data) => uuid !== data.uuid),
        meta: previousData.meta
          ? {
              ...previousData.meta,
              count: previousData.meta.count ? previousData.meta.count - 1 : 1,
            }
          : undefined,
      }));
      // Return a context object with the snapshotted value
      return { previousData, queryClient };
    },
    onSuccess: (_data, _variables, context) => {
      // Update all of the existing calls "count" to prevent number jumping on pagination
      const { previousData } = context as {
        previousData: ContentListResponse;
      };
      queryClient.setQueriesData(CONTENT_LIST_KEY, (data: Partial<ContentListResponse> = {}) => {
        if (data?.meta?.count) {
          data.meta.count = previousData?.meta?.count - 1;
        }

        return data;
      });
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: ContentListResponse;
        };
        queryClient.setQueryData(contentListKeyArray, previousData);
      }
      errorNotifier(
        'Unable to delete the given repository.',
        'An error occurred',
        err,
        'delete-content-item-error',
      );
    },
  });
};

type DeletableItem = ContentItem | PopularRepository;

export const useBulkDeleteContentItemMutate = <T extends DeletableItem>(
  queryClient: QueryClient,
  selected: Map<string, T>,
  page: number,
  perPage: number,
  contentOrigin: ContentOrigin[],
  filterData?: FilterData,
  sortString?: string,
) => {
  // Below MUST match the "useContentList" key found above or updates will fail.
  const contentListKeyArray = [
    CONTENT_LIST_KEY,
    buildContentListKey(page, perPage, sortString, contentOrigin, filterData),
  ];
  const errorNotifier = useErrorNotification();
  return useMutation(
    (selected: Map<string, ContentItem>) => {
      const uuids = Array.from(selected.keys());
      return deleteContentListItems(uuids);
    },
    {
      onMutate: async (selected: Map<string, ContentItem>) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries(contentListKeyArray);
        // Snapshot the previous value
        const previousData: Partial<ContentListResponse> =
          queryClient.getQueryData(contentListKeyArray) || {};

        const newMeta = previousData.meta
          ? {
              ...previousData.meta,
              count: previousData.meta.count ? previousData.meta.count - selected.size : 1,
            }
          : undefined;

        // Optimistically update to the new value
        queryClient.setQueryData(contentListKeyArray, () => ({
          ...previousData,
          data: previousData.data?.filter((data) => !selected.has(data.uuid)),
          meta: newMeta,
        }));
        // Return a context object with the snapshotted value
        return { previousData, newMeta, queryClient };
      },
      onSuccess: (_data, _variables, context) => {
        // Update all of the existing calls "count" to prevent number jumping on pagination
        const { newMeta } = context as {
          newMeta: Meta;
        };
        queryClient.setQueriesData(CONTENT_LIST_KEY, (data: Partial<ContentListResponse> = {}) => {
          if (data?.meta?.count) {
            data.meta.count = newMeta?.count;
          }
          return data;
        });
        queryClient.invalidateQueries(CONTENT_LIST_KEY);
        queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
        queryClient.invalidateQueries(POPULAR_REPOSITORIES_LIST_KEY);
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (err: { response?: { data: ErrorResponse } }, _newData, context) => {
        if (context) {
          const { previousData } = context as {
            previousData: ContentListResponse;
          };
          queryClient.setQueryData(contentListKeyArray, previousData);
        }
        errorNotifier(
          'Error deleting items from content list',
          'An error occurred',
          err,
          'bulk-delete-error',
        );
      },
    },
  );
};

export const useGetSnapshotsByDates = (uuids: string[], date: string) => {
  const errorNotifier = useErrorNotification();
  return useMutation(() => getSnapshotsByDate(uuids, date), {
    onError: (err) => {
      errorNotifier(
        'Error deleting items from content list',
        'An error occurred',
        err,
        'snapshot-by-date-error',
      );
    },
  });
};

export const useRepositoryParams = () =>
  useQuery<RepositoryParamsResponse>(REPOSITORY_PARAMS_KEY, getRepositoryParams, {
    keepPreviousData: true,
    staleTime: Infinity,
  });

export const useFetchGpgKey = () => {
  const errorNotifier = useErrorNotification();
  const [isLoading, setIsLoading] = useState(false);

  const fetchGpgKey = async (url: string): Promise<string> => {
    setIsLoading(true);
    let gpg_key = url;
    try {
      const data = await getGpgKey(url);
      gpg_key = data.gpg_key;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      errorNotifier(
        'Error fetching GPG key from provided URL',
        'An error occurred',
        err,
        'fetch-gpgkey-error',
      );
    }
    setIsLoading(false);
    return gpg_key;
  };

  return { fetchGpgKey, isLoading };
};

export const useGetSnapshotList = (uuid: string, page: number, limit: number, sortBy: string) => {
  const errorNotifier = useErrorNotification();
  return useQuery<SnapshotListResponse>(
    [LIST_SNAPSHOTS_KEY, uuid, page, limit, sortBy],
    () => getSnapshotList(uuid, page, limit, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find snapshots with the given UUID.',
          'An error occurred',
          err,
          'snapshot-list-error',
        );
      },
    },
  );
};

export const useGetPackagesQuery = (
  uuid: string,
  page: number,
  limit: number,
  searchQuery: string,
  sortBy?: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<PackagesResponse>(
    [PACKAGES_KEY, uuid, page, limit, searchQuery, sortBy],
    () => getPackages(uuid, page, limit, searchQuery, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find packages with the given UUID.',
          'An error occurred',
          err,
          'packages-list-error',
        );
      },
    },
  );
};

export const useGetSnapshotPackagesQuery = (
  snap_uuid: string,
  page: number,
  limit: number,
  searchQuery: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<PackagesResponse>(
    [SNAPSHOT_PACKAGES_KEY, snap_uuid, page, limit, searchQuery],
    () => getSnapshotPackages(snap_uuid, page, limit, searchQuery),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find packages with the given UUID.',
          'An error occurred',
          err,
          'snapshot-package-list-error',
        );
      },
    },
  );
};

export const useGetSnapshotErrataQuery = (
  snap_uuid: string,
  page: number,
  limit: number,
  search: string,
  type: string[],
  severity: string[],
  sortBy: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<ErrataResponse>(
    [SNAPSHOT_ERRATA_KEY, snap_uuid, page, limit, search, type, severity, sortBy],
    () => getSnapshotErrata(snap_uuid, page, limit, search, type, severity, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find errata with the given UUID.',
          'An error occurred',
          err,
          'snapshot-errata-list-error',
        );
      },
    },
  );
};

export const useTriggerSnapshot = (queryClient: QueryClient) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(triggerSnapshot, {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: 'Snapshot triggered successfully',
      });
      queryClient.invalidateQueries(LIST_SNAPSHOTS_KEY);
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
    },
    onError: (err) => {
      errorNotifier(
        'Error triggering snapshot',
        'An error occurred',
        err,
        'trigger-snapshot-error',
      );
    },
  });
};

export const useIntrospectRepositoryMutate = (
  queryClient: QueryClient,
  page: number,
  perPage: number,
  contentOrigin: ContentOrigin[],
  filterData?: FilterData,
  sortString?: string,
) => {
  // Below MUST match the "useContentList" key found above or updates will fail.
  const contentListKeyArray = [
    CONTENT_LIST_KEY,
    buildContentListKey(page, perPage, sortString, contentOrigin, filterData),
  ];
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  let hasSnapshottingEnabled: boolean | undefined = false;
  return useMutation(introspectRepository, {
    onMutate: async (item: IntrospectRepositoryRequestItem) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(contentListKeyArray);
      // Snapshot the previous value
      const previousData: Partial<ContentListResponse> =
        queryClient.getQueryData(contentListKeyArray) || {};

      const previousStatus = previousData.data?.find((data) => item.uuid == data.uuid)?.status;
      const newData = cloneDeep(previousData);
      if (previousStatus) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        newData.data.filter((data) => item.uuid == data.uuid).at(0).status = 'Pending';
      }

      // Optimistically update to the new value
      queryClient.setQueryData(contentListKeyArray, () => ({
        ...newData,
      }));

      hasSnapshottingEnabled = newData.data?.at(0)?.snapshot;
      // Return a context object with the snapshotted value
      return { previousData, queryClient };
    },
    onSuccess: () => {
      if (!hasSnapshottingEnabled) {
        notify({
          variant: AlertVariant.success,
          title: 'Repository introspection in progress',
        });
      }
      queryClient.invalidateQueries(CONTENT_ITEM_KEY);
      queryClient.invalidateQueries(LIST_SNAPSHOTS_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: ContentListResponse;
        };
        queryClient.setQueryData(contentListKeyArray, previousData);
      }
      errorNotifier(
        'Error introspecting repository',
        'An error occurred',
        err,
        'introspect-repository-error',
      );
    },
  });
};

export const useGetRepoConfigFileQuery = (repo_uuid: string, snapshot_uuid: string) => {
  const errorNotifier = useErrorNotification();
  return useMutation<string>(
    [REPO_CONFIG_FILE_KEY, repo_uuid, snapshot_uuid],
    async () => await getRepoConfigFile(snapshot_uuid),
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find config.repo with the given UUID.',
          'An error occurred',
          err,
          'repo-config-error',
        );
      },
    },
  );
};

export const useGetLatestRepoConfigFileQuery = (repo_uuid: string) => {
  const errorNotifier = useErrorNotification();
  return useMutation<string>(
    [LATEST_REPO_CONFIG_FILE_KEY, repo_uuid],
    async () => await getLatestRepoConfigFile(repo_uuid),
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find config.repo with the given UUID.',
          'An error occurred',
          err,
          'repo-config-error',
        );
      },
    },
  );
};

export const useBulkDeleteSnapshotsMutate = (
  queryClient: QueryClient,
  repoUuid: string,
  selected: Set<string>,
) => {
  const uuids = Array.from(selected);
  const snapshotListKeyArray = [LIST_SNAPSHOTS_KEY, repoUuid];
  const errorNotifier = useErrorNotification();

  return useMutation(() => deleteSnapshots(repoUuid, uuids), {
    onMutate: async (checkedSnapshots: Set<string>) => {
      await queryClient.cancelQueries(snapshotListKeyArray);
      const previousData: Partial<SnapshotListResponse> =
        queryClient.getQueryData(snapshotListKeyArray) || {};

      const newMeta = previousData.meta
        ? {
            ...previousData.meta,
            count: previousData.meta.count ? previousData.meta.count - checkedSnapshots.size : 1,
          }
        : undefined;

      queryClient.setQueryData(snapshotListKeyArray, () => ({
        ...previousData,
        data: previousData.data?.filter((data) => !checkedSnapshots.has(data.uuid)),
        meta: newMeta,
      }));
      return { previousData, newMeta, queryClient };
    },
    onSuccess: (_data, _variables, context) => {
      const { newMeta } = context as {
        newMeta: Meta;
      };
      queryClient.setQueriesData(LIST_SNAPSHOTS_KEY, (data: Partial<SnapshotListResponse> = {}) => {
        if (data?.meta?.count) {
          data.meta.count = newMeta?.count;
        }
        return data;
      });
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(GET_TEMPLATES_KEY);
      queryClient.invalidateQueries(ADMIN_TASK_LIST_KEY);
      queryClient.invalidateQueries(TEMPLATE_SNAPSHOTS_KEY);
      queryClient.invalidateQueries(TEMPLATES_FOR_SNAPSHOTS);
      queryClient.invalidateQueries(TEMPLATE_ERRATA_KEY);
      queryClient.invalidateQueries(GET_TEMPLATE_PACKAGES_KEY);
      queryClient.invalidateQueries(LIST_SNAPSHOTS_KEY);
      queryClient.invalidateQueries(SNAPSHOT_ERRATA_KEY);
      queryClient.invalidateQueries(SNAPSHOT_PACKAGES_KEY);
      queryClient.invalidateQueries(REPO_CONFIG_FILE_KEY);
      queryClient.invalidateQueries(LATEST_REPO_CONFIG_FILE_KEY);
    },
    onError: (err: { response?: { data: ErrorResponse } }, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: SnapshotListResponse;
        };
        queryClient.setQueryData(snapshotListKeyArray, previousData);
      }
      errorNotifier(
        'Error deleting snapshot from the snapshot list',
        'An error occured',
        err,
        'bulk-delete-error',
      );
    },
  });
};
