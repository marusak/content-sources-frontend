import { QueryClient, useMutation, useQuery } from 'react-query';

import useErrorNotification from 'Hooks/useErrorNotification';
import {
  TemplateFilterData,
  TemplateItem,
  fetchTemplate,
  getTemplates,
  TemplateCollectionResponse,
  createTemplate,
  TemplateRequest,
  deleteTemplateItem,
  EditTemplateRequest,
  EditTemplate,
  type SnapshotRpmCollectionResponse,
  getTemplatePackages,
  getTemplateErrata,
  getTemplateSnapshots,
  getTemplatesForSnapshots,
} from './TemplateApi';
import useNotification from 'Hooks/useNotification';
import { AlertVariant } from '@patternfly/react-core';
import { ErrataResponse, SnapshotListResponse } from 'services/Content/ContentApi';

export const FETCH_TEMPLATE_KEY = 'FETCH_TEMPLATE_KEY';
export const GET_TEMPLATES_KEY = 'GET_TEMPLATES_KEY';
export const GET_TEMPLATE_PACKAGES_KEY = 'GET_TEMPLATE_PACKAGES_KEY';
export const TEMPLATE_ERRATA_KEY = 'TEMPLATE_ERRATA_KEY';
export const TEMPLATE_SNAPSHOTS_KEY = 'TEMPLATE_SNAPSHOTS_KEY';
export const TEMPLATES_FOR_SNAPSHOTS = 'TEMPLATES_BY_SNAPSHOTS_KEY';

const TEMPLATE_LIST_POLLING_TIME = 15000; // 15 seconds
const TEMPLATE_FETCH_POLLING_TIME = 5000; // 5 seconds

export const useEditTemplateQuery = (queryClient: QueryClient, request: EditTemplateRequest) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => EditTemplate(request), {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: `Successfully edited template '${request.name}'`,
      });

      queryClient.invalidateQueries(GET_TEMPLATES_KEY);
      queryClient.invalidateQueries(FETCH_TEMPLATE_KEY);
      queryClient.invalidateQueries(GET_TEMPLATE_PACKAGES_KEY);
      queryClient.invalidateQueries(TEMPLATE_ERRATA_KEY);
      queryClient.invalidateQueries(TEMPLATES_FOR_SNAPSHOTS);
      queryClient.invalidateQueries(TEMPLATE_SNAPSHOTS_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        `Error editing template '${request.name}'`,
        'An error occurred',
        err,
        'edit-template-error',
      );
    },
  });
};

export const useFetchTemplate = (
  uuid: string,
  enabled: boolean = true,
  polling: boolean = false,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<TemplateItem>([FETCH_TEMPLATE_KEY, uuid], () => fetchTemplate(uuid), {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) =>
      errorNotifier(
        'Unable to find associated content template.',
        'An error occurred',
        err,
        'fetch-template-error',
      ),
    refetchInterval: polling ? TEMPLATE_FETCH_POLLING_TIME : undefined,
    keepPreviousData: true,
    staleTime: 20000,
    enabled,
  });
};

export const useFetchTemplatePackages = (
  page: number,
  limit: number,
  search: string,
  uuid: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<SnapshotRpmCollectionResponse>(
    [GET_TEMPLATE_PACKAGES_KEY, page, limit, search, uuid],
    () => getTemplatePackages(page, limit, search, uuid),
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) =>
        errorNotifier(
          'Unable to find associated packages for content template.',
          'An error occurred',
          err,
          'fetch-packages-template-error',
        ),
      keepPreviousData: true,
      staleTime: 60000,
    },
  );
};

export const useFetchTemplateErrataQuery = (
  uuid: string,
  page: number,
  limit: number,
  search: string,
  type: string[],
  severity: string[],
  sortBy: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<ErrataResponse>(
    [TEMPLATE_ERRATA_KEY, uuid, page, limit, search, type, severity, sortBy],
    () => getTemplateErrata(uuid, page, limit, search, type, severity, sortBy),
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          'Unable to find errata with the given UUID.',
          'An error occurred',
          err,
          'Template-errata-list-error',
        );
      },
      keepPreviousData: true,
      staleTime: 60000,
    },
  );
};

export const useFetchTemplateSnapshotsQuery = (
  uuid: string,
  page: number,
  limit: number,
  search: string,
  sortBy: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<SnapshotListResponse>(
    [TEMPLATE_SNAPSHOTS_KEY, uuid, page, limit, search, sortBy],
    () => getTemplateSnapshots(uuid, page, limit, search, sortBy),
    {
      onError: (err) => {
        errorNotifier(
          'Unable to find snapshots for the given template UUID.',
          'An error occurred',
          err,
          'template-snapshots-list-error',
        );
      },
      keepPreviousData: true,
      staleTime: 60000,
    },
  );
};

export const useFetchTemplatesForSnapshots = (repoUuid: string, snapshotUuids: string[]) => {
  const errorNotifier = useErrorNotification();
  return useQuery<TemplateCollectionResponse>(
    [TEMPLATES_FOR_SNAPSHOTS, repoUuid, ...snapshotUuids],
    () => getTemplatesForSnapshots(snapshotUuids),
    {
      onError: (err) => {
        errorNotifier(
          'Unable to find templates for the given snapshots.',
          'An error occurred',
          err,
          'template-for-snapshots-error',
        );
      },
      keepPreviousData: true,
      staleTime: 20000,
    },
  );
};

export const useTemplateList = (
  page: number,
  limit: number,
  sortBy: string,
  filterData: TemplateFilterData,
  polling: boolean = false,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<TemplateCollectionResponse>(
    // Below MUST match the "templateListKeyArray" seen below (once written) in the useDeleteTemplate.
    [GET_TEMPLATES_KEY, page, limit, sortBy, ...Object.values(filterData)],
    () => getTemplates(page, limit, sortBy, filterData),
    {
      onError: (err) => {
        errorNotifier(
          'Unable to get content template list',
          'An error occurred',
          err,
          'template-list-error',
        );
      },
      refetchInterval: polling ? TEMPLATE_LIST_POLLING_TIME : undefined,
      keepPreviousData: true,
      staleTime: 20000,
    },
  );
};

export const useCreateTemplateQuery = (queryClient: QueryClient, request: TemplateRequest) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation<TemplateItem>(() => createTemplate(request), {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: `Content Template "${request?.name}" created`,
      });

      queryClient.invalidateQueries(GET_TEMPLATES_KEY);
      queryClient.invalidateQueries(FETCH_TEMPLATE_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        'Error creating content template',
        'An error occurred',
        err,
        'create-template-error',
      );
    },
  });
};

export const useDeleteTemplateItemMutate = (queryClient: QueryClient) => {
  // Below MUST match the "useTemplateList" key found above or updates will fail.
  const contentListKeyArray = [GET_TEMPLATES_KEY];
  const errorNotifier = useErrorNotification();
  return useMutation(deleteTemplateItem, {
    onMutate: async (uuid: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries(contentListKeyArray);
      // Snapshot the previous value
      const previousData: Partial<TemplateCollectionResponse> =
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
        previousData: TemplateCollectionResponse;
      };
      queryClient.setQueriesData(
        GET_TEMPLATES_KEY,
        (data: Partial<TemplateCollectionResponse> = {}) => {
          if (data?.meta?.count) {
            data.meta.count = previousData?.meta?.count - 1;
          }

          return data;
        },
      );
      queryClient.invalidateQueries(GET_TEMPLATES_KEY);
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any, _newData, context) => {
      if (context) {
        const { previousData } = context as {
          previousData: TemplateCollectionResponse;
        };
        queryClient.setQueryData(contentListKeyArray, previousData);
      }
      errorNotifier(
        'Unable to delete the given template.',
        'An error occurred',
        err,
        'delete-template-error',
      );
    },
  });
};
