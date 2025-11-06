import {
  ActionsColumn,
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  type ThProps,
} from '@patternfly/react-table';

import { Button, Grid } from '@patternfly/react-core';
import { SkeletonTable } from '@patternfly/react-component-groups';
import { t_global_color_disabled_100 as global_disabled_color_100 } from '@patternfly/react-tokens';
import { createUseStyles } from 'react-jss';
import { useEffect, useState } from 'react';
import type { IDSystemItem } from 'services/Systems/SystemsApi';
import { TagIcon } from '@patternfly/react-icons';
import { reduceStringToCharsWithEllipsis } from 'helpers';
import useRootPath from 'Hooks/useRootPath';
import { PATCH_SYSTEMS_ROUTE } from 'Routes/constants';
import Hide from 'components/Hide/Hide';
import dayjs from 'dayjs';
import Workspace from './Components/Workspace';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';

const useStyles = createUseStyles({
  mainContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  forceDisabled: {
    color: global_disabled_color_100.value + '!important',
  },
  rightMargin: {
    marginRight: '0.5rem',
  },
  fixLabelFontSize: {
    fontSize: 'small!important',
  },
});

interface CustomThProps extends ThProps {
  title: string;
}

interface Props {
  isFetchingOrLoading: boolean;
  isLoadingOrZeroCount: boolean;
  systemsList: IDSystemItem[];
  perPage: number;
  selected: Set<string>;
  editAllowed: boolean;
  setSelected: (id: string) => void;
  deleteFromSystems: (items: string[]) => void;
  sortParams?: (columnIndex: number) => ThProps['sort'];
  selectAllToggle: () => void;
  allSelected: boolean;
}

export default function SystemsTable({
  isFetchingOrLoading,
  isLoadingOrZeroCount,
  deleteFromSystems,
  systemsList,
  perPage,
  editAllowed,
  sortParams,
  setSelected = () => undefined,
  selected,
  selectAllToggle,
  allSelected,
}: Props) {
  const classes = useStyles();
  const [prevLength, setPrev] = useState(perPage || 10);
  const rootPath = useRootPath().slice(1); // Using hrefs, we need to remove
  const basePath = rootPath.replace('content', '');

  useEffect(() => {
    setPrev(systemsList.length || 10);
  }, [systemsList.length]);

  const columnHeaders: CustomThProps[] = [
    { width: 25, title: 'Name' },
    { title: 'Tags' },
    { title: 'OS' },
    { title: 'Workspace' },
    { width: 15, title: 'Installable advisories' },
    { width: 15, title: 'Applicable advisories' },
    { title: 'Last seen' },
  ];

  return (
    <>
      <Hide hide={!isFetchingOrLoading}>
        <Grid className={classes.mainContainer}>
          <SkeletonTable
            rows={prevLength}
            columnsCount={columnHeaders.length}
            variant={TableVariant.compact}
          />
        </Grid>
      </Hide>
      <Hide hide={isFetchingOrLoading}>
        <Table aria-label='assign systems table' ouiaId='assign_systems_table' variant='compact'>
          <Hide hide={isLoadingOrZeroCount}>
            <Thead>
              <Tr>
                <Hide hide={!editAllowed}>
                  <Th
                    className={classes.fixLabelFontSize}
                    aria-label='select-all-box'
                    select={{
                      onSelect: () => selectAllToggle(),
                      isSelected: allSelected,
                    }}
                  />
                </Hide>
                {columnHeaders.map(({ title, ...props }, index) => (
                  <Th key={title + '_column'} sort={sortParams && sortParams(index)} {...props}>
                    {title}
                  </Th>
                ))}
              </Tr>
            </Thead>
          </Hide>
          <Tbody>
            {systemsList.map(
              (
                {
                  inventory_id,
                  attributes: {
                    display_name,
                    tags,
                    os,
                    groups,
                    last_upload,
                    installable_rhsa_count,
                    installable_rhba_count,
                    installable_rhea_count,
                    installable_other_count,
                    applicable_rhsa_count,
                    applicable_rhba_count,
                    applicable_rhea_count,
                    applicable_other_count,
                  },
                },
                rowIndex,
              ) => {
                const installable = [
                  installable_rhsa_count,
                  installable_rhba_count,
                  installable_rhea_count,
                  installable_other_count,
                ].reduce((a, b) => a + b);

                const applicable = [
                  applicable_rhsa_count,
                  applicable_rhba_count,
                  applicable_rhea_count,
                  applicable_other_count,
                ].reduce((a, b) => a + b);
                return (
                  <Tr key={inventory_id}>
                    <Hide hide={!editAllowed}>
                      <Td
                        className={classes.fixLabelFontSize}
                        select={{
                          rowIndex,
                          onSelect: () => setSelected(inventory_id),
                          isSelected: selected.has(inventory_id),
                        }}
                      />
                    </Hide>
                    <Td>
                      <Button
                        isInline
                        variant='link'
                        component='a'
                        href={`${basePath}${PATCH_SYSTEMS_ROUTE}${inventory_id}`}
                      >
                        {reduceStringToCharsWithEllipsis(display_name)}
                      </Button>
                    </Td>
                    <Td className={tags.length ? '' : classes.forceDisabled}>
                      <TagIcon className={classes.rightMargin} />
                      {tags.length}
                    </Td>
                    <Td>{os}</Td>
                    <Td className={groups.length ? '' : classes.forceDisabled}>
                      <Workspace workspace={groups} />
                    </Td>
                    <Td className={installable ? '' : classes.forceDisabled}>{installable}</Td>
                    <Td className={applicable ? '' : classes.forceDisabled}>{applicable}</Td>
                    <Td>{last_upload ? dayjs(last_upload).fromNow() : ''}</Td>
                    <Td isActionCell>
                      <ConditionalTooltip
                        content='You do not have the required permissions to perform this action.'
                        show={!editAllowed}
                        setDisabled
                      >
                        <ActionsColumn
                          items={[
                            {
                              tooltipProps: {
                                content: 'Unassign this template from this system.',
                              },
                              title: 'Delete',
                              onClick: () => deleteFromSystems([inventory_id]),
                            },
                          ]}
                        />
                      </ConditionalTooltip>
                    </Td>
                  </Tr>
                );
              },
            )}
          </Tbody>
        </Table>
      </Hide>
    </>
  );
}
