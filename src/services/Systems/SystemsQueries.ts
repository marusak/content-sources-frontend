import useErrorNotification from 'Hooks/useErrorNotification';
import {
  addTemplateToSystems,
  getSystemsList,
  listSystemsByTemplateId,
  deleteTemplateFromSystems,
  type IDSystemsCollectionResponse,
  type SystemsCollectionResponse,
  type SystemsFilters,
  TagsResponse,
  listTags,
} from './SystemsApi';
import { useMutation, useQuery, type QueryClient } from 'react-query';
import useNotification from 'Hooks/useNotification';
import { AlertVariant } from '@patternfly/react-core';

export const GET_SYSTEMS_KEY = 'GET_SYSTEMS_KEY';
export const GET_TEMPLATE_SYSTEMS_KEY = 'GET_TEMPLATE_SYSTEMS_KEY';

export const useSystemsListQuery = (
  page: number,
  limit: number,
  searchQuery: string,
  filter: SystemsFilters,
  sortBy?: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<SystemsCollectionResponse>(
    [GET_SYSTEMS_KEY, page, limit, searchQuery, filter, sortBy],
    () => getSystemsList(page, limit, searchQuery, filter, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier('Unable to get systems.', 'An error occurred', err, 'systems-list-error');
      },
    },
  );
};

export const useTagsQuery = (page: number, limit: number, search?: string) => {
  const errorNotifier = useErrorNotification();
  return useQuery<TagsResponse>(
    ['TAGS', page, limit, search],
    () => listTags(page, limit, search),
    {
      keepPreviousData: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier('Unable to get tags', 'An error occurred', err, 'tags-err');
      },
    },
  );
};

export const useListSystemsByTemplateId = (
  id: string,
  page: number,
  limit: number,
  searchQuery: string,
  sortBy?: string,
) => {
  const errorNotifier = useErrorNotification();
  return useQuery<IDSystemsCollectionResponse>(
    [GET_TEMPLATE_SYSTEMS_KEY, id, page, limit, searchQuery, sortBy],
    () => listSystemsByTemplateId(id, page, limit, searchQuery, sortBy),
    {
      keepPreviousData: true,
      optimisticResults: true,
      staleTime: 60000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (err: any) => {
        errorNotifier(
          `Unable to find systems with the given template id: ${id}`,
          'An error occurred',
          err,
          'systems-list-error',
        );
      },
    },
  );
};

export const useAddTemplateToSystemsQuery = (
  queryClient: QueryClient,
  templateId: string,
  systemUUIDs: string[],
) => {
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();
  return useMutation(() => addTemplateToSystems(templateId, systemUUIDs), {
    onSuccess: () => {
      notify({
        variant: AlertVariant.success,
        title: `Template successfully added to ${systemUUIDs.length} system${systemUUIDs.length > 1 ? 's' : ''}`,
      });

      queryClient.invalidateQueries(GET_TEMPLATE_SYSTEMS_KEY);
      queryClient.invalidateQueries(GET_SYSTEMS_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        'Error adding template to system(s)',
        'An error occurred',
        err,
        'add-template-to-system-error',
      );
    },
  });
};

export const useDeleteTemplateFromSystems = (queryClient: QueryClient) => {
  const errorNotifier = useErrorNotification();
  return useMutation(deleteTemplateFromSystems, {
    onSuccess: () => {
      queryClient.invalidateQueries(GET_SYSTEMS_KEY);
      queryClient.invalidateQueries(GET_TEMPLATE_SYSTEMS_KEY);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      errorNotifier(
        'Unable to unassign template from system.',
        'An error occurred',
        err,
        'remove-template-from-system-error',
      );
    },
  });
};
