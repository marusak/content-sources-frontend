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
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';

import { useEffect, useState } from 'react';
import { createUseStyles } from 'react-jss';
import Hide from 'components/Hide/Hide';
import {
  CONTENT_LIST_KEY,
  useBulkDeleteContentItemMutate,
  useContentListQuery,
} from 'services/Content/ContentQueries';
import { useQueryClient } from 'react-query';
import { useHref, useLocation, useNavigate } from 'react-router-dom';
import { useContentListOutletContext } from '../../ContentListTable';
import useRootPath from 'Hooks/useRootPath';
import { GET_TEMPLATES_KEY, useTemplateList } from 'services/Templates/TemplateQueries';
import { TemplateFilterData, TemplateItem } from 'services/Templates/TemplateApi';
import { REPOSITORIES_ROUTE, TEMPLATES_ROUTE } from 'Routes/constants';
import { ContentItem, ContentOrigin, FilterData } from 'services/Content/ContentApi';
import { isEmpty } from 'lodash';
import useDeepCompareEffect from 'Hooks/useDeepCompareEffect';
import { usePopularListOutletContext } from 'Pages/Repositories/PopularRepositoriesTable/PopularRepositoriesTable';
import { ActionButtons } from 'components/ActionButtons/ActionButtons';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';

const useStyles = createUseStyles({
  removeButton: {
    marginRight: '36px',
    transition: 'unset!important',
  },
  textAreaContent: {
    marginTop: '8px',
    height: '200px',
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

export default function DeleteContentModal() {
  const classes = useStyles();
  const path = useHref('content');
  const pathname = path.split('content')[0] + 'content';
  const navigate = useNavigate();
  const rootPath = useRootPath();
  const queryClient = useQueryClient();
  const { search } = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const maxTemplatesToShow = 3;
  const [expandState, setExpandState] = useState({});

  const {
    clearCheckedRepositories,
    deletionContext: { page, perPage, filterData, contentOrigin, sortString, checkedRepositories },
  } = useContentListOutletContext();

  const {
    deletionContext: { checkedRepositoriesToDelete },
  } = usePopularListOutletContext();

  const repoUUIDFromPath = new URLSearchParams(search).get('repoUUID')?.split(',');

  const uuids =
    repoUUIDFromPath && repoUUIDFromPath.length > 0
      ? repoUUIDFromPath
      : checkedRepositories
        ? Array.from(checkedRepositories.keys())
        : Array.from(checkedRepositoriesToDelete.keys());

  const repoFilterData: FilterData = { uuids: uuids };

  // Ignore pagination if fetching by a uuid from the path
  const selectedPage = repoUUIDFromPath && repoUUIDFromPath.length > 0 ? 1 : page;
  const selectedPerPage = repoUUIDFromPath && repoUUIDFromPath.length ? uuids.length : perPage;

  const {
    isError: isRepoError,
    data: repos = { data: [] as ContentItem[], meta: { count: 0, limit: 20, offset: 0 } },
  } = useContentListQuery(selectedPage, selectedPerPage, repoFilterData, '', [
    ContentOrigin.CUSTOM,
  ]);

  const reposToDelete = new Map(repos.data.map((repo) => [repo.uuid, repo]));

  const { mutateAsync: deleteItems, isLoading: isDeletingItems } = useBulkDeleteContentItemMutate(
    queryClient,
    reposToDelete,
    page,
    perPage,
    contentOrigin,
    filterData,
    sortString,
  );

  const onClose = () => navigate(`${rootPath}/${REPOSITORIES_ROUTE}}`);

  const onSave = async () => {
    deleteItems(reposToDelete).then(() => {
      onClose();
      clearCheckedRepositories();
      queryClient.invalidateQueries(CONTENT_LIST_KEY);
      queryClient.invalidateQueries(GET_TEMPLATES_KEY);
    });
  };

  const templateFilterData: TemplateFilterData = {
    arch: '',
    version: '',
    search: '',
    repository_uuids: uuids.join(','),
    snapshot_uuids: '',
  };

  const {
    isError: isTemplateError,
    data: templates = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useTemplateList(page, perPage, '', templateFilterData);

  useEffect(() => {
    if (repos && templates) {
      setIsLoading(false);
    }
    if (isRepoError || isTemplateError) {
      onClose();
    }
  }, [isRepoError, isTemplateError, repos.data, templates.data]);

  const actionTakingPlace = isDeletingItems || isLoading;

  const columnHeaders = ['Name', 'URL', 'Associated templates'];

  useDeepCompareEffect(() => {
    if (!isEmpty(expandState)) setExpandState({});
  }, [templates]);

  return (
    <Modal
      position='top'
      variant={ModalVariant.large}
      ouiaId='delete_custom_repositories'
      isOpen
      onClose={onClose}
      aria-labelledby='delete_custom_repositories'
    >
      <ModalHeader
        title='Delete repositories?'
        labelId='delete-custom-repositories-modal-title'
        titleIconVariant='warning'
        description={
          <Stack hasGutter>
            <Hide hide={templates.data.length <= 0}>
              <Alert
                variant='warning'
                isInline
                title='Some repositories have associated templates.'
              >
                Deleting these repositories will delete that content from their associated
                templates.
              </Alert>
            </Hide>
            <div className={spacing.pxLg}>
              <Content component='p'>Are you sure you want to delete these repositories?</Content>
            </div>
          </Stack>
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
                  <Th key={columnHeader + 'column'}>{columnHeader}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {repos.data?.map((repo: ContentItem, index) => {
                const templatesWithRepos = templates.data.filter((template: TemplateItem) =>
                  template.repository_uuids.includes(repo.uuid),
                );

                return (
                  <Tr key={repo.uuid + index}>
                    <Td>{repo.name}</Td>
                    <Td>{repo.url}</Td>
                    <Td className={classes.templateColumnMinWidth}>
                      {templatesWithRepos.length > 0 ? (
                        <List isPlain>
                          {templatesWithRepos
                            .slice(0, maxTemplatesToShow)
                            .map((template: TemplateItem, index) => (
                              <ListItem key={template.uuid + index}>
                                <Button
                                  ouiaId='template_with_repo_button'
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
                          <Hide hide={templatesWithRepos.length <= maxTemplatesToShow}>
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
                              {templatesWithRepos
                                .slice(maxTemplatesToShow, templatesWithRepos.length)
                                .map((template: TemplateItem, index) => (
                                  <ListItem key={template.uuid + index}>
                                    <Button
                                      ouiaId='template_with_repo_button'
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
                                : `and ${templatesWithRepos.length - maxTemplatesToShow} more`}
                            </ExpandableSectionToggle>
                          </Hide>
                        </List>
                      ) : (
                        'None'
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Hide>
      </ModalBody>
      <ModalFooter>
        <ActionButtons isAction={actionTakingPlace} onSave={onSave} onClose={onClose} />
      </ModalFooter>
    </Modal>
  );
}
