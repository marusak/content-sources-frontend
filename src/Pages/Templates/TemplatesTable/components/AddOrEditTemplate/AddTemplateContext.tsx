import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { TemplateRequest } from 'services/Templates/TemplateApi';
import { QueryClient, useQueryClient } from 'react-query';
import { useContentListQuery, useRepositoryParams } from 'services/Content/ContentQueries';
import { ContentOrigin, NameLabel } from 'services/Content/ContentApi';
import { hardcodeRedHatReposByArchAndVersion } from '../templateHelpers';
import { useNavigate } from 'react-router-dom';
import { useFetchTemplate } from 'services/Templates/TemplateQueries';
import useRootPath from 'Hooks/useRootPath';
import { isDateValid } from 'helpers';
import useSafeUUIDParam from 'Hooks/useSafeUUIDParam';

export interface AddTemplateContextInterface {
  queryClient: QueryClient;
  distribution_arches: NameLabel[];
  distribution_versions: NameLabel[];
  templateRequest: Partial<TemplateRequest>;
  setTemplateRequest: (value: React.SetStateAction<Partial<TemplateRequest>>) => void;
  selectedRedhatRepos: Set<string>;
  setSelectedRedhatRepos: (uuidSet: Set<string>) => void;
  selectedCustomRepos: Set<string>;
  setSelectedCustomRepos: (uuidSet: Set<string>) => void;
  hardcodedRedhatRepositoryUUIDS: Set<string>;
  checkIfCurrentStepValid: (index: number) => boolean;
  isEdit?: boolean;
  editUUID?: string;
}

export const AddTemplateContext = createContext({} as AddTemplateContextInterface);

export const AddTemplateContextProvider = ({ children }: { children: ReactNode }) => {
  const uuid = useSafeUUIDParam('templateUUID');
  const { data: editTemplateData, isError } = useFetchTemplate(uuid, !!uuid);

  const navigate = useNavigate();
  const rootPath = useRootPath();

  if (isError) navigate(rootPath);
  const [templateRequest, setTemplateRequest] = useState<Partial<TemplateRequest>>({});
  const [selectedRedhatRepos, setSelectedRedhatRepos] = useState<Set<string>>(new Set());
  const [selectedCustomRepos, setSelectedCustomRepos] = useState<Set<string>>(new Set());
  const [hardcodedRedhatRepositories, setHardcodeRepositories] = useState<string[]>([]);
  const [hardcodedRedhatRepositoryUUIDS, setHardcodeRepositoryUUIDS] = useState<Set<string>>(
    new Set(),
  );

  const stepsValidArray = useMemo(() => {
    const { arch, date, name, version, use_latest } = templateRequest;

    return [
      true,
      arch && version,
      !!selectedRedhatRepos.size,
      true,
      use_latest || isDateValid(date ?? ''),
      !!name && name.length < 256,
    ] as boolean[];
  }, [templateRequest, selectedRedhatRepos.size]);

  const checkIfCurrentStepValid = useCallback(
    (stepIndex: number) => {
      const stepsToCheck = stepsValidArray.slice(0, stepIndex + 1);
      return !stepsToCheck.every((step) => step);
    },
    [selectedRedhatRepos.size, stepsValidArray],
  );

  const queryClient = useQueryClient();

  const { data } = useContentListQuery(
    1,
    10,
    { urls: hardcodedRedhatRepositories },
    '',
    [ContentOrigin.REDHAT],
    !!hardcodedRedhatRepositories.length,
  );

  const { data: existingRepositoryInformation, isLoading } = useContentListQuery(
    1,
    10,
    { uuids: editTemplateData?.repository_uuids },
    '',
    [ContentOrigin.ALL],
    !!uuid && !!editTemplateData?.repository_uuids.length,
  );

  useEffect(() => {
    if (!!templateRequest.arch && !!templateRequest.version) {
      const result = hardcodeRedHatReposByArchAndVersion(
        templateRequest.arch,
        templateRequest.version,
      );
      if (result) {
        setHardcodeRepositories(result);
      }
      if (!uuid) setSelectedCustomRepos(new Set());
    }
  }, [templateRequest.version, templateRequest.arch, uuid]);

  useEffect(() => {
    if (data?.data?.length) {
      const hardcodedItems = data?.data.map((item) => item.uuid);

      setHardcodeRepositoryUUIDS(new Set(hardcodedItems));
      setSelectedRedhatRepos(
        new Set(
          selectedRedhatRepos.has(hardcodedItems[0])
            ? [...selectedRedhatRepos, ...hardcodedItems]
            : hardcodedItems,
        ),
      );
    }
  }, [data?.data]);

  // If editing, we want to load in the current data
  useEffect(() => {
    if (uuid && !!editTemplateData && !isLoading && !!existingRepositoryInformation) {
      const startingState = {
        ...editTemplateData,
      };

      setTemplateRequest(startingState);
      const redHatReposToAdd: string[] = [];
      const customReposToAdd: string[] = [];

      existingRepositoryInformation?.data.forEach((item) => {
        if (item.org_id === '-1') {
          redHatReposToAdd.push(item.uuid);
        } else {
          customReposToAdd.push(item.uuid);
        }
      });

      if (redHatReposToAdd.length) {
        setSelectedRedhatRepos(new Set([...selectedRedhatRepos, ...redHatReposToAdd]));
      }

      if (customReposToAdd.length) {
        setSelectedCustomRepos(new Set(customReposToAdd));
      }
    }
  }, [editTemplateData, isLoading, existingRepositoryInformation]);

  const templateRequestDependencies = useMemo(
    () => [...selectedCustomRepos, ...selectedRedhatRepos],
    [selectedCustomRepos, selectedRedhatRepos],
  );

  useEffect(() => {
    setTemplateRequest((prev) => ({
      ...prev,
      repository_uuids: [...selectedRedhatRepos, ...selectedCustomRepos],
    }));
  }, [templateRequestDependencies]);

  const {
    data: { distribution_versions, distribution_arches } = {
      distribution_versions: [],
      distribution_arches: [],
    },
  } = useRepositoryParams();

  return (
    <AddTemplateContext.Provider
      key={uuid}
      value={{
        queryClient,
        distribution_arches,
        distribution_versions,
        templateRequest,
        setTemplateRequest,
        selectedRedhatRepos,
        setSelectedRedhatRepos,
        selectedCustomRepos,
        setSelectedCustomRepos,
        hardcodedRedhatRepositoryUUIDS,
        checkIfCurrentStepValid,
        isEdit: !!uuid,
        editUUID: uuid,
      }}
    >
      {children}
    </AddTemplateContext.Provider>
  );
};

export const useAddTemplateContext = () => useContext(AddTemplateContext);
