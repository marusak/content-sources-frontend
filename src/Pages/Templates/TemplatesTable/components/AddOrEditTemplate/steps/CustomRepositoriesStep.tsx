import {
  Bullseye,
  Button,
  Flex,
  FlexItem,
  Grid,
  InputGroup,
  InputGroupItem,
  Pagination,
  PaginationVariant,
  Content,
  TextInput,
  ContentVariants,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { useAddTemplateContext } from '../AddTemplateContext';
import { createUseStyles } from 'react-jss';
import { ContentItem, ContentOrigin } from 'services/Content/ContentApi';
import { useState } from 'react';
import { CONTENT_LIST_KEY, useContentListQuery } from 'services/Content/ContentQueries';
import { ExternalLinkAltIcon, SearchIcon, SyncAltIcon } from '@patternfly/react-icons';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import { useHref } from 'react-router-dom';
import Hide from 'components/Hide/Hide';
import { SkeletonTable } from '@patternfly/react-component-groups';
import { Table, TableVariant, Tbody, Td, Th, ThProps, Thead, Tr } from '@patternfly/react-table';
import UrlWithExternalIcon from 'components/UrlWithLinkIcon/UrlWithLinkIcon';
import PackageCount from 'Pages/Repositories/ContentListTable/components/PackageCount';
import StatusIcon from 'Pages/Repositories/ContentListTable/components/StatusIcon';
import useDebounce from 'Hooks/useDebounce';
import { ADD_ROUTE, REPOSITORIES_ROUTE } from 'Routes/constants';
import TdWithTooltip from 'components/TdWithTooltip/TdWithTooltip';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { reduceStringToCharsWithEllipsis } from 'helpers';
import UploadRepositoryLabel from 'components/RepositoryLabels/UploadRepositoryLabel';
import CommunityRepositoryLabel from 'components/RepositoryLabels/CommunityRepositoryLabel';

const useStyles = createUseStyles({
  topBottomContainers: {
    justifyContent: 'space-between',
    height: 'fit-content',
  },
  invisible: {
    opacity: 0,
  },
  reduceTrailingMargin: {
    marginRight: '12px!important',
  },
});

export default function CustomRepositoriesStep() {
  const classes = useStyles();
  const path = useHref('content');
  const pathname = path.split('content')[0] + 'content';

  const { queryClient, templateRequest, selectedCustomRepos, setSelectedCustomRepos } =
    useAddTemplateContext();

  const [toggled, setToggled] = useState(false);

  const setUUIDForList = (uuid: string) => {
    if (selectedCustomRepos.has(uuid)) {
      selectedCustomRepos.delete(uuid);
      if (selectedCustomRepos.size === 0) {
        setToggled(false);
      }
    } else {
      selectedCustomRepos.add(uuid);
    }
    setSelectedCustomRepos(new Set(selectedCustomRepos));
  };

  const storedPerPage = Number(20);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(storedPerPage);
  const [activeSortIndex, setActiveSortIndex] = useState<number>(0);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

  const onSetPage = (_, newPage: number) => setPage(newPage);
  const onPerPageSelect = (_, newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const columnHeaders = ['Name', 'Status', 'Packages'];

  const columnSortAttributes = ['name', 'status', 'package_count'];

  const sortString = (): string =>
    columnSortAttributes[activeSortIndex] + ':' + activeSortDirection;

  const sortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex,
      direction: activeSortDirection,
      defaultDirection: 'asc', // starting sort direction when first sorting a column. Defaults to 'asc'
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  const {
    isLoading,
    isFetching,
    data = { data: [], meta: { count: 0, limit: 20, offset: 0 } },
  } = useContentListQuery(
    page,
    perPage,
    {
      search: searchQuery === '' ? searchQuery : debouncedSearch,
      availableForArch: templateRequest.arch as string,
      availableForVersion: templateRequest.version as string,
      uuids: toggled ? [...selectedCustomRepos] : undefined,
    },
    sortString(),
    [ContentOrigin.CUSTOM, ContentOrigin.COMMUNITY],
  );

  const {
    data: contentList = [],
    meta: { count = 0 },
  } = data;
  const countIsZero = count === 0;
  const showLoader = countIsZero && !isLoading;

  const isEPELRepository = (repo: ContentItem): boolean => {
    if (repo.origin === ContentOrigin.COMMUNITY) {
      return true;
    }

    return repo.url?.includes('epel');
  };

  const isAnyEPELRepoSelected = (): boolean =>
    contentList.some((repo) => selectedCustomRepos.has(repo.uuid) && isEPELRepository(repo));

  return (
    <Grid data-ouia-component-id='custom_repositories_step' hasGutter>
      <Flex
        direction={{ default: 'row' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <Title ouiaId='custom_repositories' headingLevel='h1'>
          Other repositories
        </Title>
        <Button
          id='refreshContentList'
          ouiaId='refresh_content_list'
          variant='link'
          icon={isLoading || isFetching ? undefined : <SyncAltIcon />}
          isLoading={isLoading || isFetching}
          isDisabled={isLoading || isFetching}
          onClick={() => queryClient.invalidateQueries(CONTENT_LIST_KEY)}
        >
          Refresh repository list
        </Button>
      </Flex>
      <Flex direction={{ default: 'row' }}>
        <Content component={ContentVariants.p} className={classes.reduceTrailingMargin}>
          Select custom or EPEL repositories.
        </Content>
        <UrlWithExternalIcon
          href={pathname + '/' + REPOSITORIES_ROUTE}
          customText='Create and  manage repositories here.'
        />
      </Flex>
      <Hide hide={(countIsZero && !searchQuery) || isLoading}>
        <Flex className={classes.topBottomContainers}>
          <Flex>
            <FlexItem>
              <InputGroup>
                <InputGroupItem isFill>
                  <TextInput
                    isDisabled={isLoading}
                    id='name-url'
                    ouiaId='filter_name_url'
                    placeholder='Filter by name/url'
                    value={searchQuery}
                    onChange={(_event, value) => setSearchQuery(value)}
                    type='search'
                    customIcon={<SearchIcon />}
                  />
                </InputGroupItem>
              </InputGroup>
            </FlexItem>
            <Hide hide={countIsZero}>
              <FlexItem>
                <ToggleGroup aria-label='Default with single selectable'>
                  <ToggleGroupItem
                    text='All'
                    buttonId='custom-repositories-toggle-button'
                    data-ouia-component-id='all-selected-repositories-toggle'
                    isSelected={!toggled}
                    onChange={() => setToggled(false)}
                  />
                  <ToggleGroupItem
                    text='Selected'
                    buttonId='custom-repositories-selected-toggle-button'
                    data-ouia-component-id='custom-selected-repositories-toggle'
                    isSelected={toggled}
                    isDisabled={selectedCustomRepos.size === 0}
                    onChange={() => setToggled(true)}
                  />
                </ToggleGroup>
              </FlexItem>
            </Hide>
          </Flex>
          <Hide hide={countIsZero}>
            <FlexItem>
              <Pagination
                id='top-pagination-id'
                widgetId='topPaginationWidgetId'
                isDisabled={isLoading}
                itemCount={count}
                perPage={perPage}
                page={page}
                onSetPage={onSetPage}
                isCompact
                onPerPageSelect={onPerPageSelect}
              />
            </FlexItem>
          </Hide>
        </Flex>
      </Hide>
      {showLoader ? (
        <Bullseye data-ouia-component-id='custom_repositories_table'>
          <EmptyTableState
            notFiltered={searchQuery === ''}
            clearFilters={() => setSearchQuery('')}
            itemName='custom repositories'
            notFilteredBody='To get started, create a custom repository'
            notFilteredButton={
              <Button
                id='createContentSourceButton'
                ouiaId='create_content_source'
                variant='primary'
                component='a'
                target='_blank'
                href={pathname + '/' + REPOSITORIES_ROUTE + '/' + ADD_ROUTE}
                icon={<ExternalLinkAltIcon />}
                iconPosition='end'
              >
                Add repositories
              </Button>
            }
          />
        </Bullseye>
      ) : (
        <>
          <Hide hide={!isLoading}>
            <Grid className=''>
              <SkeletonTable
                rows={perPage}
                columnsCount={columnHeaders.length}
                variant={TableVariant.compact}
              />
            </Grid>
          </Hide>
          <Hide hide={countIsZero || isLoading}>
            <Table
              aria-label='custom repositories table'
              ouiaId='custom_repositories_table'
              variant='compact'
            >
              <Thead>
                <Tr>
                  <Th screenReaderText='empty' />
                  {columnHeaders.map((columnHeader, index) => (
                    <Th
                      width={index === 0 ? 50 : undefined}
                      key={columnHeader + 'column'}
                      sort={sortParams(index)}
                    >
                      {columnHeader}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {contentList.map((rowData: ContentItem, rowIndex) => {
                  const { uuid, name, url, origin } = rowData;
                  const shouldDisableOtherEPEL =
                    isEPELRepository(rowData) &&
                    isAnyEPELRepoSelected() &&
                    !selectedCustomRepos.has(uuid);

                  return (
                    <Tr key={uuid}>
                      <TdWithTooltip
                        show={!(rowData.snapshot && rowData.last_snapshot_uuid)}
                        tooltipProps={{
                          content: 'Snapshot not yet available for this repository',
                        }}
                        select={{
                          rowIndex,
                          onSelect: () => setUUIDForList(uuid),
                          isSelected: selectedCustomRepos.has(uuid),
                          isDisabled:
                            !(rowData.snapshot && rowData.last_snapshot_uuid) ||
                            shouldDisableOtherEPEL,
                        }}
                      />
                      <Td>
                        <ConditionalTooltip show={name.length > 60} content={name}>
                          <>
                            {reduceStringToCharsWithEllipsis(name, 60)}
                            <Hide hide={origin !== ContentOrigin.UPLOAD}>
                              <UploadRepositoryLabel />
                            </Hide>
                            <Hide hide={origin !== ContentOrigin.COMMUNITY}>
                              <CommunityRepositoryLabel />
                            </Hide>
                          </>
                        </ConditionalTooltip>
                        <Hide hide={origin === ContentOrigin.UPLOAD}>
                          <ConditionalTooltip show={url.length > 50} content={url}>
                            <UrlWithExternalIcon
                              href={url}
                              customText={reduceStringToCharsWithEllipsis(url)}
                            />
                          </ConditionalTooltip>
                        </Hide>
                      </Td>
                      <Td>
                        <StatusIcon rowData={rowData} />
                      </Td>
                      <Td>
                        <PackageCount
                          rowData={rowData}
                          href={pathname + '/' + REPOSITORIES_ROUTE + `/${rowData.uuid}/packages`}
                          opensNewTab
                        />
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
            <Hide hide={countIsZero}>
              <Flex className={classes.topBottomContainers}>
                <FlexItem />
                <FlexItem>
                  <Pagination
                    id='bottom-pagination-id'
                    widgetId='bottomPaginationWidgetId'
                    itemCount={count}
                    perPage={perPage}
                    page={page}
                    onSetPage={onSetPage}
                    variant={PaginationVariant.bottom}
                    onPerPageSelect={onPerPageSelect}
                  />
                </FlexItem>
              </Flex>
            </Hide>
          </Hide>
        </>
      )}
    </Grid>
  );
}
