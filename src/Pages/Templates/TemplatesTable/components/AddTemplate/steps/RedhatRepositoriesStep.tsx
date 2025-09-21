import {
  Bullseye,
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
import { useContentListQuery } from 'services/Content/ContentQueries';
import { SearchIcon } from '@patternfly/react-icons';
import EmptyTableState from 'components/EmptyTableState/EmptyTableState';
import { useHref } from 'react-router-dom';
import Hide from 'components/Hide/Hide';
import { SkeletonTable } from '@patternfly/react-component-groups';
import { Table, TableVariant, Tbody, Td, Th, ThProps, Thead, Tr } from '@patternfly/react-table';
import UrlWithExternalIcon from 'components/UrlWithLinkIcon/UrlWithLinkIcon';
import PackageCount from 'Pages/Repositories/ContentListTable/components/PackageCount';
import useDebounce from 'Hooks/useDebounce';
import { REPOSITORIES_ROUTE } from 'Routes/constants';
import TdWithTooltip from 'components/TdWithTooltip/TdWithTooltip';
import { reduceStringToCharsWithEllipsis } from 'helpers';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';

const useStyles = createUseStyles({
  topBottomContainers: {
    justifyContent: 'space-between',
    height: 'fit-content',
  },
  invisible: {
    opacity: 0,
  },
});

export default function RedhatRepositoriesStep() {
  const classes = useStyles();
  const path = useHref('content');
  const pathname = path.split('content')[0] + 'content';

  const {
    hardcodedRedhatRepositoryUUIDS,
    templateRequest,
    selectedRedhatRepos,
    setSelectedRedhatRepos,
  } = useAddTemplateContext();

  const noAdditionalRepos = selectedRedhatRepos.size - hardcodedRedhatRepositoryUUIDS.size === 0;

  const [toggled, setToggled] = useState(false);

  const setUUIDForList = (uuid: string) => {
    if (selectedRedhatRepos.has(uuid)) {
      selectedRedhatRepos.delete(uuid);
      if (noAdditionalRepos) {
        setToggled(false);
      }
    } else {
      selectedRedhatRepos.add(uuid);
    }
    setSelectedRedhatRepos(new Set(selectedRedhatRepos));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [activeSortIndex, setActiveSortIndex] = useState<number>(0);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

  const onSetPage = (_, newPage: number) => setPage(newPage);
  const onPerPageSelect = (_, newPerPage: number, newPage: number) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const columnHeaders = ['Name', /* 'Label',*/ 'Advisories', 'Packages'];

  const columnSortAttributes = ['name'];

  const sortString = (): string =>
    columnSortAttributes[activeSortIndex] + ':' + activeSortDirection;

  const sortParams = (columnIndex: number): ThProps['sort'] =>
    columnSortAttributes[columnIndex]
      ? {
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
        }
      : undefined;

  const { isLoading, data = { data: [], meta: { count: 0, limit: 20, offset: 0 } } } =
    useContentListQuery(
      page,
      perPage,
      {
        search: searchQuery === '' ? searchQuery : debouncedSearch,
        availableForArch: templateRequest.arch as string,
        availableForVersion: templateRequest.version as string,
        uuids: toggled ? [...selectedRedhatRepos] : undefined,
      },
      sortString(),
      [ContentOrigin.REDHAT],
    );

  const {
    data: contentList = [],
    meta: { count = 0 },
  } = data;

  const countIsZero = count === 0;
  const showLoader = countIsZero && !isLoading;
  const additionalReposAvailableToSelect =
    contentList.length - hardcodedRedhatRepositoryUUIDS.size > 0;

  return (
    <Grid hasGutter>
      <Flex
        direction={{ default: 'row' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <Title ouiaId='additional_red_hat_repositories' headingLevel='h1'>
          Additional Red Hat repositories
        </Title>
      </Flex>
      <Flex direction={{ default: 'row' }}>
        <Content component={ContentVariants.p}>
          {additionalReposAvailableToSelect
            ? 'You can select additional Red Hat repositories. '
            : ''}
          Core repositories of your OS version have been added.
        </Content>
      </Flex>
      <Hide hide={(countIsZero && !searchQuery) || isLoading}>
        <Flex className={classes.topBottomContainers}>
          <Flex>
            <FlexItem>
              <InputGroup>
                <InputGroupItem isFill>
                  <TextInput
                    isDisabled={isLoading}
                    id='name'
                    ouiaId='filter_name'
                    placeholder='Filter by name'
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
                    buttonId='redhat-repositories-toggle-button'
                    data-ouia-component-id='all-selected-repositories-toggle'
                    isSelected={!toggled}
                    onChange={() => setToggled(false)}
                  />
                  <ToggleGroupItem
                    text='Selected'
                    buttonId='redhat-repositories-selected-toggle-button'
                    data-ouia-component-id='redhat-selected-repositories-toggle'
                    isSelected={toggled}
                    isDisabled={noAdditionalRepos}
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
        <Bullseye data-ouia-component-id='redhat_repositories_table'>
          <EmptyTableState
            notFiltered={searchQuery === ''}
            clearFilters={() => setSearchQuery('')}
            itemName='Red Hat repositories'
            notFilteredBody='No Red Hat repositories match the version and arch'
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
              aria-label='Redhat repositories table'
              ouiaId='redhat_repositories_table'
              variant='compact'
            >
              <Thead>
                <Tr>
                  <Th screenReaderText='empty' />
                  {columnHeaders.map((columnHeader, index) => (
                    <Th key={columnHeader + 'column'} sort={sortParams(index)}>
                      {columnHeader}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {contentList.map((rowData: ContentItem, rowIndex) => {
                  const { uuid, name, url } = rowData;
                  return (
                    <Tr key={uuid}>
                      <TdWithTooltip
                        show={
                          !(rowData.snapshot && rowData.last_snapshot_uuid) ||
                          hardcodedRedhatRepositoryUUIDS.has(uuid)
                        }
                        tooltipProps={{
                          content: hardcodedRedhatRepositoryUUIDS.has(uuid)
                            ? 'This item is pre-selected for the chosen architecture and OS version.'
                            : 'A snapshot is not yet available for this repository.',
                        }}
                        select={{
                          rowIndex,
                          onSelect: () => setUUIDForList(uuid),
                          isSelected: selectedRedhatRepos.has(uuid),
                          isDisabled:
                            !(rowData.snapshot && rowData.last_snapshot_uuid) ||
                            hardcodedRedhatRepositoryUUIDS.has(uuid),
                        }}
                      />
                      <Td>
                        <ConditionalTooltip show={name.length > 60} content={name}>
                          <>{reduceStringToCharsWithEllipsis(name, 60)}</>
                        </ConditionalTooltip>
                        <ConditionalTooltip show={url.length > 50} content={url}>
                          <UrlWithExternalIcon
                            href={url}
                            customText={reduceStringToCharsWithEllipsis(url)}
                          />
                        </ConditionalTooltip>
                      </Td>
                      {/* <Td>{rowData.label || '-'}</Td> */}
                      <Td>{rowData.last_snapshot?.content_counts?.['rpm.advisory'] || '-'}</Td>
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
