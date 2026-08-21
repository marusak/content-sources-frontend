import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertVariant } from '@patternfly/react-core';
import useErrorNotification from 'Hooks/useErrorNotification';
import useNotification from 'Hooks/useNotification';
import { CONTENT_LIST_KEY } from 'services/Content/ContentQueries';
import { toggleAsPartner } from './AdminPartnerReposApi';
import { ContentListResponse } from 'services/Content/ContentApi';

export type ToggleAsPartner = { uuid: string; partner: boolean };

export const useToggleAsPartnerMutate = () => {
  const queryClient = useQueryClient();
  const errorNotifier = useErrorNotification();
  const { notify } = useNotification();

  return useMutation({
    mutationFn: ({ uuid, partner }: ToggleAsPartner) => toggleAsPartner(uuid, partner),
    onSuccess: (_data, { uuid }) => {
      notify({
        variant: AlertVariant.success,
        title: 'Repository marked as partner',
      });

      // Avoiding flicker after isPending flips false and queryClient invalidation
      queryClient.setQueriesData<ContentListResponse>(
        { queryKey: [CONTENT_LIST_KEY] },
        (current) => {
          if (!current?.data) return current;
          return {
            ...current,
            data: current.data.map((repo) =>
              repo.uuid === uuid ? { ...repo, partner: true } : repo,
            ),
          };
        },
      );

      queryClient.invalidateQueries({ queryKey: [CONTENT_LIST_KEY] });
    },
    onError: (err) => {
      errorNotifier(
        'Error marking repository as partner',
        'An error occurred',
        err,
        'toggle-as-partner-error',
      );
    },
  });
};
