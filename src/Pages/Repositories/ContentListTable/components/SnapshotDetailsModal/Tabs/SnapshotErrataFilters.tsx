import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  LabelGroup,
  Button,
  Flex,
  FlexItem,
  TextInput,
  DropdownList,
  DropdownItem,
  Dropdown,
  MenuToggle,
} from '@patternfly/react-core';

import { FilterIcon, SearchIcon } from '@patternfly/react-icons';

import { createUseStyles } from 'react-jss';
import useDebounce from 'Hooks/useDebounce';
import Hide from 'components/Hide/Hide';
import SeverityWithIcon from 'components/SeverityWithIcon/SeverityWithIcon';
import { isEmpty } from 'lodash';

const useStyles = createUseStyles({
  chipsContainer: {
    paddingTop: '16px',
  },
  clearFilters: {
    marginLeft: '16px',
  },
  ensureMinHeight: {
    flexFlow: 'column nowrap',
  },
  fullWidth: {
    width: 'auto',
    maxWidth: 'unset',
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
  const [isActionOpen, setActionOpen] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
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
          <TextInput
            isDisabled={isLoading}
            id='search'
            ouiaId='filter_search'
            className={classes.fullWidth}
            placeholder='Filter by name/synopsis'
            value={search}
            type='search'
            customIcon={<SearchIcon />}
            onChange={(_event, value) => setSearch(value)}
          />
        );
      case 'Type':
        return (
          <Dropdown
            onSelect={(_, val) => addOrRemoveTypes(val as string)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                aria-label='filter type'
                id='typeSelect'
                ouiaId='filter_by_type'
                className={classes.fullWidth}
                onClick={() => setActionOpen((prev) => !prev)}
                isDisabled={isLoading}
                isExpanded={isActionOpen}
              >
                Filter by type
              </MenuToggle>
            )}
            onOpenChange={(isOpen) => setActionOpen(isOpen)}
            isOpen={isActionOpen}
          >
            <DropdownList>
              {['Security', 'Bugfix', 'Enhancement', 'Other'].map((type) => (
                <DropdownItem
                  key={type}
                  hasCheckbox
                  value={type}
                  isSelected={types.includes(type)}
                  component='button'
                  data-ouia-component-id={`filter_${type}`}
                >
                  {type}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        );
      case 'Severity':
        return (
          <Dropdown
            onSelect={(_, val) => addOrRemoveSeverity(val as string)}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                aria-label='filter severity'
                id='severitySelect'
                ouiaId='filter_by_severity'
                className={classes.fullWidth}
                onClick={() => setActionOpen((prev) => !prev)}
                isDisabled={isLoading}
                isExpanded={isActionOpen}
              >
                Filter by severity
              </MenuToggle>
            )}
            onOpenChange={(isOpen) => setActionOpen(isOpen)}
            isOpen={isActionOpen}
          >
            <DropdownList>
              {['Critical', 'Important', 'Moderate', 'Low', 'None'].map((sev) => (
                <DropdownItem
                  key={sev}
                  hasCheckbox
                  value={sev}
                  isSelected={severities.includes(sev)}
                  component='button'
                  data-ouia-component-id={`filter_${sev}`}
                >
                  <SeverityWithIcon severity={sev} />
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        );

      default:
        return <></>;
    }
  }, [filterType, isLoading, search, types, severities, isActionOpen]);

  const hasFilters = search !== '' || !isEmpty(types) || !isEmpty(severities);

  return (
    <Flex className={classes.ensureMinHeight}>
      <Flex flexWrap={{ default: 'nowrap' }}>
        <Dropdown
          key='filtertype'
          onSelect={(_, val) => {
            setFilterType(val as Filters);
            setTypeFilterOpen(false);
          }}
          toggle={(toggleRef) => (
            <MenuToggle
              icon={<FilterIcon />}
              ref={toggleRef}
              aria-label='filterSelectionDropdown'
              id='filterSelectionDropdown'
              ouiaId='filter_type_toggle'
              className={classes.fullWidth}
              onClick={() => setTypeFilterOpen((prev) => !prev)}
              isDisabled={isLoading}
              isExpanded={typeFilterOpen}
            >
              {filterType}
            </MenuToggle>
          )}
          onOpenChange={(isOpen) => setTypeFilterOpen(isOpen)}
          isOpen={typeFilterOpen}
          ouiaId='filter_type'
        >
          <DropdownList>
            {filters.map((filter) => (
              <DropdownItem
                key={filter}
                value={filter}
                isSelected={filterType === filter}
                component='button'
                data-ouia-component-id={`filter_${filter}`}
              >
                {filter}
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
        {Filter}
      </Flex>
      <Hide hide={!hasFilters}>
        <FlexItem className={classes.chipsContainer}>
          {search !== '' && (
            <LabelGroup categoryName='Name/Synopsis'>
              <Label variant='outline' key='search_chip' onClose={() => setSearch('')}>
                {search}
              </Label>
            </LabelGroup>
          )}
          {!isEmpty(types) && (
            <LabelGroup categoryName='Type'>
              {types.map((type) => (
                <Label variant='outline' key='type_chip' onClose={() => addOrRemoveTypes(type)}>
                  {type}
                </Label>
              ))}
            </LabelGroup>
          )}
          {!isEmpty(severities) && (
            <LabelGroup categoryName='Severity'>
              {severities.map((severity) => (
                <Label
                  variant='outline'
                  key='severity_chip'
                  onClose={() => addOrRemoveSeverity(severity)}
                >
                  {severity}
                </Label>
              ))}
            </LabelGroup>
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
