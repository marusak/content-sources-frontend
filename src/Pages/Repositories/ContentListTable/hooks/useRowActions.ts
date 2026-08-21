import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IAction } from '@patternfly/react-table';
import { TooltipPosition } from '@patternfly/react-core';
import { createUseStyles } from 'react-jss';
import { ContentOrigin } from 'services/Content/ContentApi';
import { useAppContext } from 'middleware/AppContext';
import { EDIT_ROUTE, UPLOAD_ROUTE, DELETE_ROUTE, PARTNER_REPO_ROUTE } from 'Routes/constants';
import type { ActionRowData } from '../components/RepositoryActionCell';

const useStyles = createUseStyles({
  disabledButton: {
    pointerEvents: 'auto',
    cursor: 'default',
  },
});

interface UseRowActionsProps {
  isRedHatRepository: boolean;
  isMarkingPartner: boolean;
  introspectRepoForUuid: (uuid: string) => Promise<void>;
  triggerIntrospectionAndSnapshot: (uuid: string) => Promise<void>;
  clearSelectedRepositories: () => void;
}

export default function useRowActions({
  isRedHatRepository,
  introspectRepoForUuid,
  triggerIntrospectionAndSnapshot,
  clearSelectedRepositories,
  isMarkingPartner,
}: UseRowActionsProps) {
  const navigate = useNavigate();
  const { rbac, features } = useAppContext();
  const classes = useStyles();

  const rowActions = useCallback(
    (rowData: ActionRowData): IAction[] => {
      // admin partner repository
      const isMarkRepoAsPartnerAllowed = (repository: ActionRowData) => {
        const isAllowed =
          features?.adminpartnerrepositories?.accessible &&
          features?.adminpartnerrepositories?.enabled &&
          repository.origin === ContentOrigin.UPLOAD &&
          // disable unmarking partner repo when it is already marked partnered
          repository.partner === false &&
          isMarkingPartner === false;
        return isAllowed;
      };

      const markRepoAsPartnerAction = {
        isDisabled: rowData?.status === 'Pending',
        title: 'Mark as partner repository',
        ouiaId: 'kebab-mark-as-partner',
        onClick: () => {
          navigate(`${rowData.uuid}/${PARTNER_REPO_ROUTE}`);
        },
      };

      return isRedHatRepository ||
        rowData.origin === ContentOrigin.REDHAT ||
        rowData.origin === ContentOrigin.COMMUNITY
        ? features?.snapshots?.accessible
          ? [
              {
                isDisabled: !rowData.snapshot || !(rowData.snapshot && rowData.last_snapshot_uuid),

                ouiaId: 'kebab-view-snapshots',
                title:
                  rowData.snapshot && rowData.last_snapshot_uuid
                    ? 'View all snapshots'
                    : 'No snapshots yet',
                onClick: () => {
                  navigate(`${rowData.uuid}/snapshots`);
                },
              },
            ]
          : []
        : [
            ...(rbac?.repoWrite
              ? [
                  {
                    isDisabled: rowData?.status === 'Pending',
                    title: 'Edit',
                    ouiaId: 'kebab-edit',
                    onClick: () => {
                      navigate(`${rowData.uuid}/${EDIT_ROUTE}`);
                    },
                  },
                  ...(rowData.origin === ContentOrigin.UPLOAD
                    ? [
                        {
                          isDisabled: rowData?.status === 'Pending',
                          title: 'Upload content',
                          ouiaId: 'kebab-upload-content',
                          onClick: () => {
                            navigate(`${rowData.uuid}/${UPLOAD_ROUTE}`);
                          },
                        },
                      ]
                    : []),
                  ...(isMarkRepoAsPartnerAllowed(rowData) ? [markRepoAsPartnerAction] : []),
                ]
              : []),
            ...(features?.snapshots?.accessible
              ? [
                  {
                    isDisabled: !rowData.last_snapshot_uuid,
                    title: rowData.last_snapshot_uuid ? 'View all snapshots' : 'No snapshots yet',
                    ouiaId: 'kebab-view-snapshots',
                    onClick: () => {
                      navigate(`${rowData.uuid}/snapshots`);
                    },
                  },
                  ...(rbac?.repoWrite && rowData.origin !== ContentOrigin.UPLOAD
                    ? [
                        {
                          id: `actions-column-snapshot-${rowData.uuid}`,
                          className:
                            rowData?.status === 'Pending' || !rowData.snapshot
                              ? classes.disabledButton
                              : '',
                          isDisabled: rowData?.status === 'Pending' || !rowData.snapshot,
                          title: 'Trigger snapshot',
                          ouiaId: 'kebab-trigger-snapshots',
                          onClick: () => {
                            triggerIntrospectionAndSnapshot(rowData?.uuid);
                          },
                          tooltipProps: !rowData.snapshot
                            ? {
                                content: 'Snapshots disabled for this repository.',
                                position: TooltipPosition.left,
                                triggerRef: () =>
                                  document.getElementById(
                                    `actions-column-snapshot-${rowData.uuid}`,
                                  ) || document.body,
                              }
                            : undefined,
                        },
                      ]
                    : []),
                ]
              : []),
            ...(rbac?.repoWrite && !rowData?.snapshot
              ? [
                  {
                    isDisabled: rowData?.status == 'Pending',
                    title: 'Introspect now',
                    ouiaId: 'kebab-introspect-now',
                    onClick: () =>
                      introspectRepoForUuid(rowData?.uuid).then(clearSelectedRepositories),
                  },
                ]
              : []),
            ...(rbac?.repoWrite
              ? [
                  { isSeparator: true },
                  {
                    title: 'Delete',
                    ouiaId: 'kebab-delete',
                    onClick: () => navigate(`${DELETE_ROUTE}?repoUUID=${rowData.uuid}`),
                  },
                ]
              : []),
          ];
    },
    [
      isRedHatRepository,
      features?.snapshots?.accessible,
      features?.adminpartnerrepositories?.accessible,
      rbac?.repoWrite,
      navigate,
      triggerIntrospectionAndSnapshot,
      introspectRepoForUuid,
      clearSelectedRepositories,
      classes.disabledButton,
      isMarkingPartner,
    ],
  );

  return { rowActions };
}
