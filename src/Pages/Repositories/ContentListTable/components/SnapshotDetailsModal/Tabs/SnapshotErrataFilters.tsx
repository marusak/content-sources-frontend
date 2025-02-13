import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  ChipGroup,
  Flex,
  FlexItem,
  InputGroup,
  TextInput,
  InputGroupItem,
  InputGroupText,
  SelectOptionProps,
} from '@patternfly/react-core';

import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { global_BackgroundColor_100 } from '@patternfly/react-tokens';

import { createUseStyles } from 'react-jss';
import useDebounce from 'Hooks/useDebounce';
import Hide from 'components/Hide/Hide';
import SeverityWithIcon from 'components/SeverityWithIcon/SeverityWithIcon';
import DropdownSelect from 'components/DropdownSelect/DropdownSelect';
import { isEmpty } from 'lodash';

const useStyles = createUseStyles({
  chipsContainer: {
    backgroundColor: global_BackgroundColor_100.value,
    paddingTop: '16px',
  },
  clearFilters: {
    marginLeft: '16px',
  },
  ensureMinHeight: {
    minHeight: '126px',
  },
});

interface Props {
  isLoading?: boolean;
  setFilterData: (filterData: { search: string; type: string[]; severity: string[] }) => void;
  filterData: { search: string; type: string[]; severity: string[] };
}

export type Filters = 'Name/Synopsis' | 'Type' | 'Severity';

export default function SnapshotErrataFilters({ isLoading, setFilterData, filterData }: Props) {
  const classes = useStyles();
  const filters = ['Name/Synopsis', 'Type', 'Severity'];
  const [filterType, setFilterType] = useState<Filters>('Name/Synopsis');
  const [search, setSearch] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);

  const clearFilters = () => {
    setSearch('');
    setTypes([]);
    setSeverities([]);
  };

  useEffect(() => {
    // If the filters get cleared at the top level, sense that and clear them here.
    if (!filterData.search && !filterData.type.length && !filterData.severity.length) {
      clearFilters();
    }
  }, [filterData.search, filterData.type.length, filterData.severity.length]);

  const {
    search: debouncedSearch,
    types: debouncedTypes,
    severities: debouncedSeverities,
  } = useDebounce(
    {
      search,
      types,
      severities,
    },
    !search && isEmpty(types) && isEmpty(severities) ? 0 : 500,
  );

  const addOrRemoveSeverity = (sev: string) =>
    setSeverities((prev) =>
      prev.includes(sev) ? prev.filter((item) => item !== sev) : [...prev, sev],
    );

  const addOrRemoveTypes = (type: string) =>
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );

  useEffect(() => {
    setFilterData({
      search: debouncedSearch,
      type: debouncedTypes,
      severity: debouncedSeverities,
    });
  }, [debouncedSearch, debouncedTypes, debouncedSeverities]);

  const Filter = useMemo(() => {
    switch (filterType) {
      case 'Name/Synopsis':
        return (
          <InputGroupItem isFill>
            <TextInput
              isDisabled={isLoading}
              id='search'
              ouiaId='filter_search'
              placeholder='Filter by name/synopsis'
              value={search}
              onChange={(_event, value) => setSearch(value)}
            />
            <InputGroupText isDisabled={isLoading} id='search-icon'>
              <SearchIcon />
            </InputGroupText>
          </InputGroupItem>
        );
      case 'Type':
        return (
          <DropdownSelect
            onSelect={(_, val) => addOrRemoveTypes(val as string)}
            multiSelect
            menuToggleProps={{
              'aria-label': 'Filter by type',
            }}
            dropDownItems={
              ['Security', 'Bugfix', 'Enhancement', 'Other'].map((type) => ({
                hasCheckbox: true,
                value: type,
                isSelected: types.includes(type),
                children: type,
                'data-ouia-component-id': `filter_${type}`,
              })) as SelectOptionProps[]
            }
            menuValue='Filter by type'
            ouiaId='filter_by_type'
          />
        );
      case 'Severity':
        return (
          <DropdownSelect
            onSelect={(_, val) => addOrRemoveSeverity(val as string)}
            multiSelect
            dropDownItems={
              ['Critical', 'Important', 'Moderate', 'Low', 'Unknown'].map((sev) => ({
                value: sev,
                hasCheckbox: true,
                isSelected: severities.includes(sev),
                children: <SeverityWithIcon severity={sev} />,
                'data-ouia-component-id': `filter_${sev}`,
              })) as SelectOptionProps[]
            }
            menuValue='Filter by severity'
            ouiaId='filter_by_severity'
          />
        );

      default:
        return <></>;
    }
  }, [filterType, isLoading, search, types, severities]);

  const hasFilters = search !== '' || !isEmpty(types) || !isEmpty(severities);

  return (
    <Flex direction={{ default: 'column' }}>
      <FlexItem>
        <InputGroup>
          <InputGroupItem>
            <FlexItem>
              <DropdownSelect
                key='filtertype'
                ouiaId='filter_errata'
                menuToggleProps={{
                  isDisabled: isLoading,
                  icon: <FilterIcon />,
                }}
                dropDownItems={filters.map((optionName) => ({
                  value: optionName,
                  children: optionName,
                  'data-ouia-component-id': `filter_${optionName}`,
                }))}
                selected={filterType}
                onSelect={(_, val) => {
                  setFilterType(val as Filters);
                }}
                menuValue={filterType}
              />
            </FlexItem>
          </InputGroupItem>
          <InputGroupItem>
            <FlexItem>{Filter}</FlexItem>
          </InputGroupItem>
        </InputGroup>
      </FlexItem>
      <Hide hide={!hasFilters}>
        <FlexItem className={classes.chipsContainer}>
          {search !== '' && (
            <ChipGroup categoryName='Name/Synopsis'>
              <Chip key='search_chip' onClick={() => setSearch('')}>
                {search}
              </Chip>
            </ChipGroup>
          )}
          {!isEmpty(types) && (
            <ChipGroup categoryName='Type'>
              {types.map((type) => (
                <Chip key='type_chip' onClick={() => addOrRemoveTypes(type)}>
                  {type}
                </Chip>
              ))}
            </ChipGroup>
          )}
          {!isEmpty(severities) && (
            <ChipGroup categoryName='Severity'>
              {severities.map((severity) => (
                <Chip key='severity_chip' onClick={() => addOrRemoveSeverity(severity)}>
                  {severity}
                </Chip>
              ))}
            </ChipGroup>
          )}
          {(debouncedSearch !== '' && search !== '') || !isEmpty(types) || !isEmpty(severities) ? (
            <Button className={classes.clearFilters} onClick={clearFilters} variant='link' isInline>
              Clear filters
            </Button>
          ) : (
            ''
          )}
        </FlexItem>
      </Hide>
    </Flex>
  );
}
