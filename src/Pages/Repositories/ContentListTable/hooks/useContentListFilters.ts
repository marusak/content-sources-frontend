import { useMemo } from 'react';
import {
  FilterData,
  NameLabel,
  RepositoryParamsResponse,
} from '../../../../services/Content/ContentApi';
import type { DataViewFilterOption } from '@patternfly/react-data-view/dist/cjs/DataViewFilters';
import { REPOSITORY_PARAMS_KEY } from '../../../../services/Content/ContentQueries';
import { QueryClient } from 'react-query';
import useDebounce from '../../../../Hooks/useDebounce';
import { useDataViewFilters } from '@patternfly/react-data-view';

// Mapping from display names to backend API values
const StatusDisplayMap = {
  Invalid: 'Invalid',
  'In progress': 'Pending',
  Unavailable: 'Unavailable',
  Valid: 'Valid',
} as const;

export const FilterLabelsMap = {
  Search: 'Name/URL',
  Versions: 'OS version',
  Arches: 'Architecture',
  Statuses: 'Status',
} as const;

type RepositoryFilters = Required<Pick<FilterData, 'search' | 'arches' | 'versions' | 'statuses'>>;

export const initialFilters: RepositoryFilters = {
  search: '',
  arches: [],
  versions: [],
  statuses: [],
};

const statusFilterOptions: DataViewFilterOption[] = Object.keys(StatusDisplayMap).map(
  (statusDisplay) =>
    ({
      label: statusDisplay,
      value: StatusDisplayMap[statusDisplay],
      ['data-ouia-component-id']: `filter_${statusDisplay}`,
    }) as unknown as DataViewFilterOption,
);

export const useContentListFilters = (queryClient: QueryClient) => {
  const { filters, onSetFilters, clearAllFilters } = useDataViewFilters<RepositoryFilters>({
    initialFilters,
  });

  const { distribution_arches = [], distribution_versions = [] } =
    queryClient.getQueryData<RepositoryParamsResponse>(REPOSITORY_PARAMS_KEY) || {};

  // Create filter options for the UI
  const osFilterOptions: DataViewFilterOption[] = useMemo(
    () =>
      distribution_versions.map(
        (nameLabel: NameLabel) =>
          ({
            label: nameLabel.name,
            value: nameLabel.label,
            ['data-ouia-component-id']: `filter_${nameLabel.name}`,
          }) as unknown as DataViewFilterOption,
      ),
    [distribution_versions],
  );
  const archFilterOptions: DataViewFilterOption[] = useMemo(
    () =>
      distribution_arches.map(
        (nameLabel: NameLabel) =>
          ({
            label: nameLabel.name,
            value: nameLabel.label,
            ['data-ouia-component-id']: `filter_${nameLabel.name}`,
          }) as unknown as DataViewFilterOption,
      ),
    [distribution_arches],
  );

  const debouncedFilters = useDebounce<RepositoryFilters>(
    {
      search: filters.search,
      arches: filters.arches,
      versions: filters.versions,
      statuses: filters.statuses,
    },
    200,
  );

  const isFiltered =
    debouncedFilters.search !== '' ||
    debouncedFilters.arches.length > 0 ||
    debouncedFilters.versions.length > 0 ||
    debouncedFilters.statuses.length > 0;

  return {
    filters: debouncedFilters,
    onSetFilters,
    clearAllFilters,
    isFiltered,
    osFilterOptions,
    archFilterOptions,
    statusFilterOptions,
  };
};
