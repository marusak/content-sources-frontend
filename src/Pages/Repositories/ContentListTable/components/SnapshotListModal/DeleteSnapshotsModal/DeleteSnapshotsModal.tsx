import {
  Alert,
  Bullseye,
  Button,
  Content,
  ExpandableSection,
  ExpandableSectionToggle,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import Hide from 'components/Hide/Hide';
import { useQueryClient } from 'react-query';
import { useHref, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSnapshotListOutletContext } from '../SnapshotListModal';
import useRootPath from 'Hooks/useRootPath';
import { REPOSITORIES_ROUTE, TEMPLATES_ROUTE } from 'Routes/constants';
import { SnapshotItem } from 'services/Content/ContentApi';
import { useBulkDeleteSnapshotsMutate, useGetSnapshotList } from 'services/Content/ContentQueries';
import { TemplateItem } from 'services/Templates/TemplateApi';
import { useFetchTemplatesForSnapshots } from 'services/Templates/TemplateQueries';
import { formatDateDDMMMYYYY } from 'helpers';
import ChangedArrows from '../components/ChangedArrows';
import { SnapshotDetailTab } from '../../SnapshotDetailsModal/SnapshotDetailsModal';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px', // 4px on the title bottom padding makes this the "standard" 16 total padding
  },
  removeButton: {
    marginRight: '36px',
    transition: 'unset!important',
  },
  link: {
    padding: 0,
  },
  templateColumnMinWidth: {
    minWidth: '200px!important',
  },
  expandableSectionMargin: {
    marginTop: '8px',
  },
});

export default function DeleteSnapshotsModal() {
  const classes = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rootPath = useRootPath();
  const path = useHref('content');
  const pathname = path.split('content')[0] + 'content';
  const { repoUUID: uuid = '' } = useParams();
  const { search } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [affectsTemplates, setAffectsTemplates] = useState(false);
  const [expandState, setExpandState] = useState({});
  const maxTemplatesToShow = 3;

  const {
    clearCheckedSnapshots,
    deletionContext: { checkedSnapshots },
  } = useSnapshotListOutletContext();

  const snapshotUUIDFromPath = new URLSearchParams(search).get('snapshotUUID')?.split(',');
  const checkedSnapshotsArray = checkedSnapshots ? Array.from(checkedSnapshots) : [];
  const uuids = snapshotUUIDFromPath?.length
    ? snapshotUUIDFromPath
    : checkedSnapshotsArray.length
      ? checkedSnapshotsArray
      : [];
  const snapshotsToDelete = new Set(uuids);

  const { mutateAsync: deleteSnapshots, isLoading: isDeletingSnapshots } =
    useBulkDeleteSnapshotsMutate(queryClient, uuid, snapshotsToDelete);

  const onClose = () => navigate(`${rootPath}/${REPOSITORIES_ROUTE}/${uuid}/snapshots`);

  const onSave = async () => {
    deleteSnapshots(snapshotsToDelete).then(() => {
      onClose();
      clearCheckedSnapshots();
    });
  };

  const {
    isError: isSnapshotError,
    data: snapshots = { data: [], meta: { count: 0, limit: -1, offset: 0 } },
  } = useGetSnapshotList(uuid, 1, -1, '');

  const { isError: isTemplateError, data: templates } = useFetchTemplatesForSnapshots(uuid, uuids);

  useEffect(() => {
    if (snapshots && templates) {
      if (templates.data.length) {
        setAffectsTemplates(true);
      }
      setIsLoading(false);
    }
    if (isSnapshotError || isTemplateError) {
      onClose();
    }
  }, [isSnapshotError, snapshots.data, isTemplateError, templates]);

  const actionTakingPlace = isDeletingSnapshots || isLoading;

  const columnHeaders = ['Snapshots', 'Change', 'Packages', 'Advisories', 'Associated templates'];

  return (
    <Modal
      position='top'
      variant={ModalVariant.large}
      ouiaId='delete_snapshots'
      isOpen
      onClose={onClose}
      aria-labelledby='delete-snapshots-modal-title'
    >
      <ModalHeader
        title='Delete snapshots?'
        labelId='delete-snapshots-modal-title'
        titleIconVariant='warning'
        description={
          <>
            <Hide hide={!affectsTemplates}>
              <Alert variant='warning' isInline title='Some snapshots have associated templates.'>
                Deleting these snapshots will change content in their associated templates.
                Templates will switch to a snapshot taken closest to the deleted one.
              </Alert>
            </Hide>
            <Content component='p' className={classes.description}>
              Are you sure you want to delete these snapshots?
            </Content>
          </>
        }
      />
      <ModalBody>
        <Hide hide={!isLoading}>
          <Bullseye>
            <Spinner />
          </Bullseye>
        </Hide>
        <Hide hide={isLoading}>
          <Table variant='compact'>
            <Thead>
              <Tr>
                {columnHeaders.map((columnHeader) => (
                  <Th
                    key={columnHeader + 'column'}
                    width={
                      columnHeader != 'Associated templates'
                        ? columnHeader != 'Snapshots'
                          ? 10
                          : 25
                        : undefined
                    }
                  >
                    {columnHeader}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {snapshots.data
                ?.filter((snap) => snapshotsToDelete.has(snap.uuid))
                .map(
                  (
                    {
                      uuid: snap_uuid,
                      created_at,
                      added_counts,
                      removed_counts,
                      content_counts,
                    }: SnapshotItem,
                    index,
                  ) => {
                    const templatesForSnapshot =
                      templates?.data.filter(
                        (t) => t.snapshots.filter((s) => s.uuid == snap_uuid).length > 0,
                      ) ?? [];
                    return (
                      <Tr key={snap_uuid + index}>
                        <Td>{formatDateDDMMMYYYY(created_at, true)}</Td>
                        <Td>
                          <ChangedArrows
                            addedCount={added_counts?.['rpm.package'] || 0}
                            removedCount={removed_counts?.['rpm.package'] || 0}
                          />
                        </Td>
                        <Td>
                          <Button
                            variant='link'
                            ouiaId='snapshot_package_count_button'
                            isInline
                            isDisabled={!content_counts?.['rpm.package']}
                            onClick={() =>
                              navigate(
                                `${rootPath}/${REPOSITORIES_ROUTE}/${uuid}/snapshots/${snap_uuid}`,
                              )
                            }
                          >
                            {content_counts?.['rpm.package'] || 0}
                          </Button>
                        </Td>
                        <Td>
                          <Button
                            variant='link'
                            ouiaId='snapshot_advisory_count_button'
                            isInline
                            isDisabled={!content_counts?.['rpm.advisory']}
                            onClick={() =>
                              navigate(
                                `${rootPath}/${REPOSITORIES_ROUTE}/${uuid}/snapshots/${snap_uuid}?tab=${SnapshotDetailTab.ERRATA}`,
                              )
                            }
                          >
                            {content_counts?.['rpm.advisory'] || 0}
                          </Button>
                        </Td>
                        <Td>
                          {templatesForSnapshot.length ? (
                            <List isPlain>
                              {templatesForSnapshot
                                .slice(0, maxTemplatesToShow)
                                .map((template: TemplateItem, index) => (
                                  <ListItem key={template.uuid + index}>
                                    <Button
                                      ouiaId='template_using_snapshot_button'
                                      className={classes.link}
                                      variant='link'
                                      component='a'
                                      href={
                                        pathname +
                                        '/' +
                                        TEMPLATES_ROUTE +
                                        `/${template.uuid}/edit?tab=custom_repositories`
                                      }
                                      target='_blank'
                                    >
                                      {template.name}
                                    </Button>
                                  </ListItem>
                                ))}
                              <Hide hide={templatesForSnapshot.length <= maxTemplatesToShow}>
                                <ExpandableSection
                                  isExpanded={expandState[index]}
                                  isDetached
                                  toggleId={
                                    expandState[index]
                                      ? 'detached-expandable-section-toggle-open'
                                      : 'detached-expandable-section-toggle'
                                  }
                                  contentId={
                                    expandState[index]
                                      ? 'detached-expandable-section-content-open'
                                      : 'detached-expandable-section-content'
                                  }
                                  className={classes.expandableSectionMargin}
                                >
                                  {templatesForSnapshot
                                    .slice(maxTemplatesToShow, templatesForSnapshot.length)
                                    .map((template: TemplateItem, index) => (
                                      <ListItem key={template.uuid + index}>
                                        <Button
                                          ouiaId='template_using_snapshot_button'
                                          className={classes.link}
                                          variant='link'
                                          component='a'
                                          href={
                                            pathname +
                                            '/' +
                                            TEMPLATES_ROUTE +
                                            `/${template.uuid}/edit?tab=custom_repositories`
                                          }
                                          target='_blank'
                                        >
                                          {template.name}
                                        </Button>
                                      </ListItem>
                                    ))}
                                </ExpandableSection>
                                <ExpandableSectionToggle
                                  isExpanded={expandState[index]}
                                  onToggle={() =>
                                    setExpandState((prev) => ({ ...prev, [index]: !prev[index] }))
                                  }
                                  toggleId={
                                    expandState[index]
                                      ? 'detached-expandable-section-toggle-open'
                                      : 'detached-expandable-section-toggle'
                                  }
                                  contentId={
                                    expandState[index]
                                      ? 'detached-expandable-section-content-open'
                                      : 'detached-expandable-section-content'
                                  }
                                  direction='up'
                                >
                                  {expandState[index]
                                    ? 'Show less'
                                    : `and ${templatesForSnapshot.length - maxTemplatesToShow} more`}
                                </ExpandableSectionToggle>
                              </Hide>
                            </List>
                          ) : (
                            'None'
                          )}
                        </Td>
                      </Tr>
                    );
                  },
                )}
            </Tbody>
          </Table>
        </Hide>
      </ModalBody>
      <ModalFooter>
        <Stack>
          <StackItem>
            <Button
              key='confirm'
              ouiaId='delete_snapshot_modal_confirm'
              variant='danger'
              isLoading={actionTakingPlace}
              isDisabled={actionTakingPlace}
              onClick={onSave}
            >
              Delete
            </Button>
            <Button
              key='cancel'
              variant='link'
              onClick={onClose}
              ouiaId='delete_snapshot_modal_cancel'
            >
              Cancel
            </Button>
          </StackItem>
        </Stack>
      </ModalFooter>
    </Modal>
  );
}
