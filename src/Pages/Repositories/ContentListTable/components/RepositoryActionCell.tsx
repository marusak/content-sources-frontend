import { memo, useRef } from 'react';
import { Tooltip } from '@patternfly/react-core';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import { ContentItem } from 'services/Content/ContentApi';
import Hide from 'components/Hide/Hide';

export type ActionRowData = Pick<
  ContentItem,
  | 'uuid'
  | 'origin'
  | 'status'
  | 'snapshot'
  | 'last_snapshot_uuid'
  | 'last_snapshot_task'
  | 'partner'
>;

interface Props {
  rowData: ActionRowData;
  actions: IAction[];
  showPendingTooltipContent: string | undefined;
  isRedHatRepository: boolean;
}

const RepositoryActionCell = memo(
  ({ rowData, actions, showPendingTooltipContent, isRedHatRepository }: Props) => {
    const triggerRef = useRef<HTMLDivElement>(null);
    const shouldShowTooltip =
      !isRedHatRepository && rowData?.status === 'Pending' && !!showPendingTooltipContent;

    return (
      <Hide hide={!actions?.length}>
        <div ref={triggerRef}>
          <ActionsColumn items={actions} />
        </div>
        {shouldShowTooltip && (
          <Tooltip content={showPendingTooltipContent} triggerRef={triggerRef} />
        )}
      </Hide>
    );
  },
);

RepositoryActionCell.displayName = 'RepositoryActionCell';

export default RepositoryActionCell;
