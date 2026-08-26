import { ActionsColumn, IAction } from '@patternfly/react-table';
import { Package } from 'services/Content/ContentApi';
import { SkeletonTableBody } from '@patternfly/react-component-groups';
import { useCallback, useMemo } from 'react';
import DeleteKebab from 'components/DeleteKebab/DeleteKebab';

import { useDataViewSelection } from '@patternfly/react-data-view/dist/dynamic/Hooks';
import {
  BulkSelect,
  BulkSelectValue,
} from '@patternfly/react-component-groups/dist/dynamic/BulkSelect';

import { DataView } from '@patternfly/react-data-view/dist/dynamic/DataView';
import {
  DataViewTable,
  DataViewTh,
  DataViewTrObject,
} from '@patternfly/react-data-view/dist/dynamic/DataViewTable';

import { DataViewFilters } from '@patternfly/react-data-view/dist/dynamic/DataViewFilters';
import { DataViewToolbar } from '@patternfly/react-data-view/dist/dynamic/DataViewToolbar';
import { DataViewTextFilter } from '@patternfly/react-data-view/dist/dynamic/DataViewTextFilter';

import EmptyTableDataView from 'components/EmptyTableDataView/EmptyTableDataView';
import { useNavigate } from 'react-router-dom';
import { DELETE_ROUTE } from 'Routes/constants';

import { Pagination, ToolbarItem, ToolbarItemVariant } from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { FilterProps } from 'components/Tables/Packages/hooks/usePackageTableFilters';
import { PaginationLocalStorage } from 'Hooks/tables/usePaginationLocalStorage';
import useTableActiveState from 'Hooks/tables/useTableActiveState';

interface PackagesTableProps {
  isFetching: boolean;
  isLoading: boolean;
  count: number;
  packagesList: Package[];
  enabledBulkDelete?: boolean;
  enabledRowActions?: boolean;
  paginationData: PaginationLocalStorage;
  filterProps: FilterProps;
  selection?: ReturnType<typeof useDataViewSelection>;
}

const PackagesTableWithToolbars = ({
  packagesList,
  paginationData,
  enabledBulkDelete = false,
  enabledRowActions = false,
  isFetching,
  isLoading,
  count,
  filterProps,
  selection = {
    selected: [],
    onSelect: () => {},
    isSelected: () => false,
    setSelected: () => {},
  },
}: PackagesTableProps) => {
  const navigate = useNavigate();

  const { selected, onSelect, isSelected } = selection;

  const paginationProps = {
    ...paginationData,
    itemCount: count,
  };

  const isFetchingOrLoading = isFetching || isLoading;
  const isLoadingOrZeroCount = isFetchingOrLoading || !count;

  const activeState = useTableActiveState({ isLoading, count, isFetching });

  // delete single rpm through kebab
  const handleSingleRowDelete = useCallback(
    (packageUuid: string) => {
      onSelect(false);
      onSelect(true, [{ id: packageUuid, row: [] } as DataViewTrObject]);
      navigate(DELETE_ROUTE);
    },
    [navigate, onSelect],
  );

  const rowActions = useCallback(
    (packageUuid: string): IAction[] => [
      {
        title: 'Delete package',
        ouiaId: 'kebab_delete_package',
        onClick: () => handleSingleRowDelete(packageUuid),
      },
    ],
    [handleSingleRowDelete],
  );

  const kebab = (uuid) =>
    enabledRowActions
      ? [{ cell: <ActionsColumn items={rowActions(uuid)} />, props: { isActionCell: true } }]
      : [];

  // DataView table props, rows and columns
  const ouiaId =
    enabledRowActions && enabledBulkDelete ? 'packages_table_select' : 'packages_table_noselect';
  const columns = [
    { name: 'Name' },
    { name: 'Version' },
    { name: 'Release' },
    { name: 'Architecture' },
  ];

  const dataViewColumns: DataViewTh[] = columns.map(({ name }) => ({ cell: name }));
  const dataViewRows: DataViewTrObject[] = packagesList.map((packageRpm) => {
    const { name, version, release, arch } = packageRpm;
    const cells = [{ cell: name }, { cell: version }, { cell: release }, { cell: arch }];

    if (packageRpm.uuid !== undefined) {
      return {
        id: packageRpm.uuid,
        row: [...cells, ...kebab(packageRpm.uuid)],
      };
    }
    return {
      id: `${name}-${version}-${release}-${arch}`,
      row: cells,
    };
  });

  // filter handlers
  const { clearAllFilters, filters, onSetFilters } = filterProps;
  const { setPage } = paginationProps;
  const clearAllFiltersAndResetPage = useCallback(() => {
    clearAllFilters();
    setPage(1);
    // setter functions from useState have a stable identity across re-renders, therefore setPage is not in the dependency array
  }, [clearAllFilters]);

  // paginations
  const bottomPagination = (
    <Pagination
      id='bottom-pagination-id'
      widgetId='bottomPaginationWidgetId'
      {...paginationProps}
      variant='bottom'
    />
  );

  const topPagination = (
    <Pagination
      id='top-pagination-id'
      widgetId='topPaginationWidgetId'
      {...paginationProps}
      isCompact
      isDisabled={isFetchingOrLoading}
    />
  );

  // filter by rpm name
  const handleFilterChange = (_key, newValues) => {
    onSetFilters(newValues);
    setPage(1);
  };
  const searchFilter = (
    <DataViewFilters values={filters} onChange={handleFilterChange}>
      <DataViewTextFilter
        filterId='search'
        ouiaId='filter_packages_search'
        title='Name'
        placeholder='Filter by name'
        isDisabled={isFetchingOrLoading}
      />
    </DataViewFilters>
  );

  // bulk select for delete
  const handleBulkSelect = (value: BulkSelectValue) => {
    if (value === BulkSelectValue.none) {
      onSelect(false);
    } else if (value === BulkSelectValue.page) {
      onSelect(false);
      onSelect(true, dataViewRows);
    } else if (value === BulkSelectValue.nonePage) {
      onSelect(false, dataViewRows);
    }
  };

  const pageSelectionCount = dataViewRows.filter(isSelected).length;
  const isPageSelected = dataViewRows.length > 0 && pageSelectionCount === dataViewRows.length;
  const isPagePartiallySelected = pageSelectionCount > 0 && !isPageSelected;

  const bulkSelect = (
    <BulkSelect
      isDataPaginated
      onSelect={handleBulkSelect}
      selectedCount={selected.length}
      pageCount={dataViewRows.length}
      pageSelected={isPageSelected}
      pagePartiallySelected={isPagePartiallySelected}
      menuToggleCheckboxProps={{
        id: 'bulk-select-packages-checkbox',
        isDisabled: isLoadingOrZeroCount,
      }}
    />
  );

  // delete items through kebab
  const deleteRpmsText = useMemo(() => {
    const count = pageSelectionCount;
    const text = count <= 1 ? 'Delete package' : `Delete ${count} packages`;
    return text;
  }, [pageSelectionCount]);

  const deleteKebab = (
    <DeleteKebab
      isDisabled={isLoadingOrZeroCount}
      atLeastOneRepoChecked={pageSelectionCount > 0}
      text={deleteRpmsText}
    />
  );

  const bulkDeleteProps = {
    bulkSelect,
    actions: deleteKebab,
  };

  // table states
  const emptyStateTable = (
    <EmptyTableDataView
      ouiaId={ouiaId}
      variant={filters.search ? 'filtered' : 'zero'}
      itemName='packages'
      zeroBody='You may need to add repositories that contain packages.'
      colSpan={columns.length}
      onClearFilters={clearAllFiltersAndResetPage}
    />
  );
  const loadingStateTable = (
    <SkeletonTableBody rowsCount={paginationProps.perPage} columnsCount={columns.length} />
  );

  return (
    <DataView
      data-ouia-component-id='packages_table'
      activeState={activeState}
      {...(enabledBulkDelete && activeState === undefined ? { selection } : {})}
    >
      <DataViewToolbar
        className={spacing.pSm}
        {...(enabledBulkDelete ? { ...bulkDeleteProps } : {})}
        clearAllFilters={clearAllFiltersAndResetPage}
        filters={searchFilter}
      >
        <ToolbarItem variant={ToolbarItemVariant.pagination} align={{ default: 'alignEnd' }}>
          {topPagination}
        </ToolbarItem>
      </DataViewToolbar>
      <DataViewTable
        aria-label='Packages table'
        ouiaId={ouiaId}
        variant='compact'
        columns={dataViewColumns}
        rows={dataViewRows}
        bodyStates={{ empty: emptyStateTable, loading: loadingStateTable }}
      />
      <DataViewToolbar pagination={bottomPagination} />
    </DataView>
  );
};

export default PackagesTableWithToolbars;
