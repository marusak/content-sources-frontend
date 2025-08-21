import { useEffect, useMemo, useState } from 'react';
import {
  Label,
  LabelGroup,
  Button,
  Flex,
  FlexItem,
  InputGroup,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
  Dropdown,
  MenuToggle,
  DropdownItem,
  DropdownList,
} from '@patternfly/react-core';

import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import Hide from 'components/Hide/Hide';
import {
  FilterData,
  ContentOrigin,
  RepositoryParamsResponse,
  ContentItem,
} from 'services/Content/ContentApi';
import { useQueryClient } from 'react-query';
import { REPOSITORY_PARAMS_KEY } from 'services/Content/ContentQueries';
import useDebounce from 'Hooks/useDebounce';
import { createUseStyles } from 'react-jss';
import { isEmpty } from 'lodash';
import { useAppContext } from 'middleware/AppContext';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useNavigate } from 'react-router-dom';
import DeleteKebab from 'components/DeleteKebab/DeleteKebab';
import { ADD_ROUTE } from 'Routes/constants';

interface Props {
  isLoading?: boolean;
  setFilterData: (filterData: FilterData) => void;
  filterData: FilterData;
  atLeastOneRepoChecked: boolean;
  numberOfReposChecked: number;
  setContentOrigin: React.Dispatch<React.SetStateAction<ContentOrigin[]>>;
  contentOrigin: ContentOrigin[];
  checkedRepositories: Map<string, ContentItem>;
}

const useStyles = createUseStyles({
  chipsContainer: {
    paddingTop: '16px',
  },
  clearFilters: {
    marginLeft: '16px',
  },
  // Needed to fix styling when "Add repositories" button is disabled
  repositoryActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: '6px',
  },
  fullWidth: {
    width: 'auto',
    maxWidth: 'unset',
  },
});

// Mapping from display names to backend API values
const statusDisplayMap = {
  Invalid: 'Invalid',
  'In progress': 'Pending',
  Unavailable: 'Unavailable',
  Valid: 'Valid',
};

const statusDisplayValues = Object.keys(statusDisplayMap);
export type Filters = 'Name/URL' | 'OS version' | 'Architecture' | 'Status';

const ContentListFilters = ({
  isLoading,
  setFilterData,
  filterData,
  atLeastOneRepoChecked,
  numberOfReposChecked,
  setContentOrigin,
  contentOrigin,
  checkedRepositories,
}: Props) => {
  const classes = useStyles();
  const { rbac, features } = useAppContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isActionOpen, setActionOpen] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const filters = ['Name/URL', 'OS version', 'Architecture', 'Status'];
  const [filterType, setFilterType] = useState<Filters>('Name/URL');
  const [versionNamesLabels, setVersionNamesLabels] = useState({});
  const [archNamesLabels, setArchNamesLabels] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [selectedArches, setSelectedArches] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const isRedHatRepository =
    contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.REDHAT;
  const isCommunityRepository =
    contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.COMMUNITY;
  const isRedHatOrCommunity =
    contentOrigin.length === 2 &&
    contentOrigin.includes(ContentOrigin.COMMUNITY) &&
    contentOrigin.includes(ContentOrigin.REDHAT);

  const { distribution_arches = [], distribution_versions = [] } =
    queryClient.getQueryData<RepositoryParamsResponse>(REPOSITORY_PARAMS_KEY) || {};

  const clearFilters = () => {
    setFilterType('Name/URL');
    setSearchQuery('');
    setSelectedVersions([]);
    setSelectedArches([]);
    setSelectedStatuses([]);
    setFilterData({ searchQuery: '', versions: [], arches: [], statuses: [] });
  };

  useEffect(() => {
    // If the filters get cleared at the top level, sense that and clear them here.
    if (
      filterData.arches?.length === 0 &&
      filterData.versions?.length === 0 &&
      filterData.statuses?.length === 0 &&
      filterData.searchQuery === '' &&
      (searchQuery !== '' ||
        selectedArches.length !== 0 ||
        selectedVersions.length !== 0 ||
        selectedStatuses.length !== 0)
    ) {
      clearFilters();
    }
  }, [filterData]);

  const {
    searchQuery: debouncedSearchQuery,
    selectedVersions: debouncedSelectedVersions,
    selectedArches: debouncedSelectedArches,
    selectedStatuses: debouncedSelectedStatuses,
  } = useDebounce({
    searchQuery,
    selectedVersions,
    selectedArches,
    selectedStatuses,
  });

  const getLabels = (type: string, names: Array<string>) => {
    const namesLabels = type === 'arch' ? distribution_arches : distribution_versions;

    const labels: Array<string> = [];
    names.forEach((name) => {
      const found = namesLabels.find((v) => v.name === name);
      if (found) {
        labels.push(found.label);
      }
    });
    return labels;
  };

  useEffect(() => {
    // Convert display status values to backend API values
    const backendStatuses = debouncedSelectedStatuses.map(
      (displayStatus) => statusDisplayMap[displayStatus] || displayStatus,
    );

    setFilterData({
      searchQuery: debouncedSearchQuery,
      versions: getLabels('version', debouncedSelectedVersions),
      arches: getLabels('arch', debouncedSelectedArches),
      statuses: backendStatuses,
    });
  }, [
    debouncedSearchQuery,
    debouncedSelectedVersions,
    debouncedSelectedArches,
    debouncedSelectedStatuses,
  ]);

  const deleteItem = (id: string, chips, setChips) => {
    const copyOfChips = [...chips];
    const filteredCopy = copyOfChips.filter((chip) => chip !== id);
    setChips(filteredCopy);
  };

  useEffect(() => {
    if (
      isEmpty(versionNamesLabels) &&
      isEmpty(archNamesLabels) &&
      distribution_arches.length !== 0 &&
      distribution_versions.length !== 0
    ) {
      const arches = {};
      const versions = {};
      distribution_arches.forEach((arch) => (arches[arch.name] = arch.label));
      distribution_versions.forEach((version) => (versions[version.name] = version.label));
      setVersionNamesLabels(versions);
      setArchNamesLabels(arches);
    }
  }, [distribution_arches, distribution_versions]);

  const allSelectedReposDeletable = [...checkedRepositories.values()].every(
    (repo) => repo.origin !== ContentOrigin.REDHAT && repo.origin !== ContentOrigin.COMMUNITY,
  );

  const Filter = useMemo(() => {
    switch (filterType) {
      case 'Name/URL':
        return (
          <TextInput
            isDisabled={isLoading}
            id='search'
            type='search'
            className={classes.fullWidth}
            customIcon={<SearchIcon />}
            ouiaId='filter_search'
            placeholder='Filter by name/url'
            value={searchQuery}
            onChange={(_event, value) => setSearchQuery(value)}
          />
        );
      case 'OS version':
        return (
          <Dropdown
            onSelect={(_, val) => {
              setSelectedVersions((prev) =>
                selectedVersions.includes(val as string)
                  ? prev.filter((item) => item !== (val as string))
                  : [...prev, val as string],
              );
            }}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                aria-label='filter OS version'
                id='versionSelect'
                ouiaId='filter_version'
                className={classes.fullWidth}
                onClick={() => setActionOpen((prev) => !prev)}
                isDisabled={isLoading}
                isExpanded={isActionOpen}
              >
                Filter by OS version
              </MenuToggle>
            )}
            onOpenChange={(isOpen) => setActionOpen(isOpen)}
            isOpen={isActionOpen}
          >
            <DropdownList>
              {Object.keys(versionNamesLabels).map((version) => (
                <DropdownItem
                  key={version}
                  hasCheckbox
                  value={version}
                  isSelected={selectedVersions.includes(version)}
                  component='button'
                  data-ouia-component-id={`filter_${version}`}
                >
                  {version}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        );
      case 'Architecture':
        return (
          <Dropdown
            onSelect={(_, val) => {
              setSelectedArches((prev) =>
                selectedArches.includes(val as string)
                  ? prev.filter((item) => item !== (val as string))
                  : [...prev, val as string],
              );
            }}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                aria-label='filter architecture'
                id='archSelect'
                ouiaId='filter_arch'
                className={classes.fullWidth}
                onClick={() => setActionOpen((prev) => !prev)}
                isDisabled={isLoading}
                isExpanded={isActionOpen}
              >
                Filter by architecture
              </MenuToggle>
            )}
            onOpenChange={(isOpen) => setActionOpen(isOpen)}
            isOpen={isActionOpen}
          >
            <DropdownList>
              {Object.keys(archNamesLabels).map((architecture) => (
                <DropdownItem
                  key={`arch_${architecture}`}
                  value={architecture}
                  isSelected={selectedArches.includes(architecture)}
                  component='button'
                  data-ouia-component-id={`filter_${architecture}`}
                >
                  {architecture}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        );
      case 'Status':
        return (
          <Dropdown
            onSelect={(_, val) => {
              setSelectedStatuses((prev) =>
                selectedStatuses.includes(val as string)
                  ? prev.filter((item) => item !== (val as string))
                  : [...prev, val as string],
              );
            }}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                aria-label='filter status'
                id='statusSelect'
                ouiaId='filter_status'
                className={classes.fullWidth}
                onClick={() => setActionOpen((prev) => !prev)}
                isDisabled={isLoading}
                isExpanded={isActionOpen}
              >
                Filter by status
              </MenuToggle>
            )}
            onOpenChange={(isOpen) => setActionOpen(isOpen)}
            isOpen={isActionOpen}
          >
            <DropdownList>
              {statusDisplayValues.map((status) => (
                <DropdownItem
                  key={status}
                  value={status}
                  isSelected={selectedStatuses.includes(status)}
                  component='button'
                  data-ouia-component-id={`filter_${status}`}
                >
                  {status}
                </DropdownItem>
              ))}
            </DropdownList>
          </Dropdown>
        );
      default:
        return <></>;
    }
  }, [
    filterType,
    isLoading,
    searchQuery,
    versionNamesLabels,
    selectedVersions,
    archNamesLabels,
    selectedArches,
    selectedStatuses,
    isActionOpen,
  ]);

  return (
    <Flex direction={{ default: 'column' }}>
      <Flex>
        <FlexItem>
          <InputGroup>
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
                  className={classes.fullWidth}
                  aria-label='filterSelectionDropdown'
                  id='typeSelect'
                  ouiaId='filter_type'
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
          </InputGroup>
        </FlexItem>
        <Hide hide={!features?.snapshots?.accessible}>
          <FlexItem>
            <ToggleGroup aria-label='Default with single selectable'>
              <ToggleGroupItem
                text='Custom'
                buttonId='custom-repositories-toggle-button'
                data-ouia-component-id='custom-repositories-toggle'
                isSelected={
                  contentOrigin.includes(ContentOrigin.EXTERNAL) &&
                  contentOrigin.includes(ContentOrigin.UPLOAD)
                }
                onChange={() => {
                  setContentOrigin((prev) => {
                    const custom =
                      contentOrigin.includes(ContentOrigin.EXTERNAL) &&
                      contentOrigin.includes(ContentOrigin.UPLOAD);
                    return custom
                      ? prev.filter(
                          (origin) =>
                            origin !== ContentOrigin.EXTERNAL && origin !== ContentOrigin.UPLOAD,
                        )
                      : [...new Set([...prev, ContentOrigin.EXTERNAL, ContentOrigin.UPLOAD])];
                  });
                }}
              />
              {features?.communityrepos?.enabled ? (
                <ToggleGroupItem
                  text='EPEL'
                  buttonId='epel-repositories-toggle-button'
                  data-ouia-component-id='epel-repositories-toggle'
                  isSelected={contentOrigin.includes(ContentOrigin.COMMUNITY)}
                  onChange={() => {
                    setContentOrigin((prev) =>
                      prev.includes(ContentOrigin.COMMUNITY)
                        ? prev.filter((origin) => origin !== ContentOrigin.COMMUNITY)
                        : [...prev, ContentOrigin.COMMUNITY],
                    );
                  }}
                />
              ) : null}
              <ToggleGroupItem
                text='Red Hat'
                buttonId='redhat-repositories-toggle-button'
                data-ouia-component-id='redhat-repositories-toggle'
                isSelected={contentOrigin.includes(ContentOrigin.REDHAT)}
                onChange={() => {
                  setContentOrigin((prev) =>
                    prev.includes(ContentOrigin.REDHAT)
                      ? prev.filter((origin) => origin !== ContentOrigin.REDHAT)
                      : [...prev, ContentOrigin.REDHAT],
                  );
                }}
              />
            </ToggleGroup>
          </FlexItem>
        </Hide>
        <FlexItem className={classes.repositoryActions}>
          <ConditionalTooltip
            content='You do not have the required permissions to perform this action.'
            show={!rbac?.repoWrite && !isRedHatRepository}
            setDisabled
          >
            <Button
              id='createContentSourceButton'
              ouiaId='create_content_source'
              variant='primary'
              isDisabled={
                isLoading || isRedHatRepository || isCommunityRepository || isRedHatOrCommunity
              }
              onClick={() => navigate(ADD_ROUTE)}
            >
              Add repositories
            </Button>
          </ConditionalTooltip>
          <ConditionalTooltip
            content={
              !rbac?.repoWrite
                ? 'You do not have the required permissions to perform this action.'
                : 'Some selected repositories (Red Hat or EPEL) cannot be deleted.'
            }
            show={!rbac?.repoWrite || !allSelectedReposDeletable}
            setDisabled
          >
            <DeleteKebab
              isDisabled={!rbac?.repoWrite || !allSelectedReposDeletable}
              atLeastOneRepoChecked={atLeastOneRepoChecked}
              numberOfReposChecked={numberOfReposChecked}
              toggleOuiaId='custom_repositories_kebab_toggle'
            />
          </ConditionalTooltip>
        </FlexItem>
      </Flex>
      <Hide
        hide={
          !(
            selectedVersions.length ||
            selectedArches.length ||
            selectedStatuses.length ||
            searchQuery != ''
          )
        }
      >
        <FlexItem className={classes.chipsContainer}>
          <LabelGroup categoryName='OS version'>
            {selectedVersions.map((version) => (
              <Label
                variant='outline'
                key={version}
                onClose={() => deleteItem(version, selectedVersions, setSelectedVersions)}
              >
                {version}
              </Label>
            ))}
          </LabelGroup>
          <LabelGroup categoryName='Architecture'>
            {selectedArches.map((arch) => (
              <Label
                variant='outline'
                key={arch}
                onClose={() => deleteItem(arch, selectedArches, setSelectedArches)}
              >
                {arch}
              </Label>
            ))}
          </LabelGroup>
          <LabelGroup categoryName='Status'>
            {selectedStatuses.map((status) => (
              <Label
                variant='outline'
                key={status}
                onClose={() => deleteItem(status, selectedStatuses, setSelectedStatuses)}
              >
                {status}
              </Label>
            ))}
          </LabelGroup>
          {searchQuery !== '' && (
            <LabelGroup categoryName='Name/URL'>
              <Label variant='outline' key='search_chip' onClose={() => setSearchQuery('')}>
                {searchQuery}
              </Label>
            </LabelGroup>
          )}
          {((debouncedSearchQuery !== '' && searchQuery !== '') ||
            !!selectedVersions?.length ||
            !!selectedArches?.length ||
            !!selectedStatuses?.length) && (
            <Button className={classes.clearFilters} onClick={clearFilters} variant='link' isInline>
              Clear filters
            </Button>
          )}
        </FlexItem>
      </Hide>
    </Flex>
  );
};

export default ContentListFilters;
