import { useQueryClient } from 'react-query';
import { useSystemsListQuery } from '../services/Systems/SystemsQueries';
import { TemplateItem } from '../services/Templates/TemplateApi';
import { FETCH_TEMPLATE_KEY } from '../services/Templates/TemplateQueries';

/**
 * Checks if there are registered systems compatible with a given template. It retrieves the template's
 * arch and os/version from the React Query cache, then queries for systems that match those specifications.
 */
const useHasRegisteredSystems = (uuid: string) => {
  const queryClient = useQueryClient();

  // Access the cached data from the parent component (TemplateDetails) to get arch and version
  const template = queryClient.getQueryData<TemplateItem>([FETCH_TEMPLATE_KEY, uuid]);
  const { arch, version } = template || {};

  const {
    isFetching,
    isError,
    data = { data: [], meta: { total_items: 0, limit: 20, offset: 0 } },
    // Filter by the version and arch of the given template
    // Use default values for other parameters as they're not relevant for this hook
  } = useSystemsListQuery(1, 20, '', { os: version, arch: arch });

  return {
    hasRegisteredSystems: data.meta.total_items > 0, // If the data fetching fails, `total_items` will be 0, returning false by default
    isFetchingRegSystems: isFetching,
    isErrorFetchingRegSystems: isError,
  };
};

export default useHasRegisteredSystems;
