import {
  Button,
  Switch,
  FileUpload,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Popover,
  Radio,
  Stack,
  StackItem,
  TextInput,
  Tooltip,
  Flex,
  FormAlert,
  Alert,
  ButtonVariant,
  ChipGroup,
  Chip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { global_Color_200 } from '@patternfly/react-tokens';
import { useEffect, useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import Hide from 'components/Hide/Hide';
import {
  isValidURL,
  mapFormikToAPIValues,
  validationSchema,
  maxUploadSize,
  failedFileUpload,
  getDefaultValues,
  mapValidationData,
  mapContentItemToDefaultFormikValues,
  type FileRejection,
} from './helpers';
import useNotification from 'Hooks/useNotification';
import {
  REPOSITORY_PARAMS_KEY,
  useAddContentQuery,
  useEditContentQuery,
  useFetchContent,
  useFetchGpgKey,
  useValidateContentList,
} from 'services/Content/ContentQueries';
import { ContentOrigin, RepositoryParamsResponse } from 'services/Content/ContentApi';
import { useQueryClient } from 'react-query';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { isEmpty, isEqual } from 'lodash';
import useDeepCompareEffect from 'Hooks/useDeepCompareEffect';
import useDebounce from 'Hooks/useDebounce';
import { useNavigate, useParams } from 'react-router-dom';
import { useContentListOutletContext } from '../../ContentListTable';
import useRootPath from 'Hooks/useRootPath';
import CustomHelperText from 'components/CustomHelperText/CustomHelperText';
import { ADD_ROUTE, REPOSITORIES_ROUTE, UPLOAD_ROUTE } from 'Routes/constants';
import { useFormik, type FormikValues } from 'formik';
import useChrome from '@redhat-cloud-services/frontend-components/useChrome';
import Loader from 'components/Loader';
import DropdownSelect from 'components/DropdownSelect/DropdownSelect';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px', // 4px on the title bottom padding makes this the "standard" 16 total padding
    color: global_Color_200.value,
  },
  saveButton: {
    minWidth: '80px',
  },
  saveShifted: {
    // This fixes a css issue with the button loading icon
    extend: 'saveButton',
    paddingLeft: '40px!important',
  },
  cancelButton: {
    marginLeft: '18px',
  },
  gpgKeyInput: {
    '& .pf-v5-svg': {
      marginRight: '10px',
    },
  },
  gpgKeyFormGroup: {
    paddingBottom: '20px',
    '& .pf-v5-c-radio': {
      width: 'auto',
    },
  },
});

const defaultTouchedState = { name: false, url: false };

interface Props {
  isEdit?: boolean;
}

const AddContent = ({ isEdit = false }: Props) => {
  const classes = useStyles();
  const queryClient = useQueryClient();
  const { repoUUID: uuid } = useParams();
  const navigate = useNavigate();
  const rootPath = useRootPath();
  const { isProd, isBeta } = useChrome();
  const isInProd = useMemo(() => isProd(), []);
  const isInBeta = useMemo(() => isBeta(), []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, isLoading: isLoadingInitialContent, isSuccess } = useFetchContent(uuid!, isEdit);

  const [values, setValues] = useState(getDefaultValues(isInProd ? { snapshot: false } : {}));
  const [changeVerified, setChangeVerified] = useState(false);

  useEffect(() => {
    if (isEdit && !isLoadingInitialContent && isSuccess) {
      setValues(mapContentItemToDefaultFormikValues(data));
    }
  }, [isLoadingInitialContent, isSuccess]);

  const { mutateAsync: editContent, isLoading: isEditing } = useEditContentQuery(
    mapFormikToAPIValues(values),
  );

  const [editNotChanged, contentOrigin] = useMemo(
    () => [
      isEdit && data && isEqual(mapContentItemToDefaultFormikValues(data), values),
      data?.origin || ContentOrigin.EXTERNAL,
    ],
    [data, values],
  );

  const editHasNotChanged = useDebounce(editNotChanged);

  const hasErrors = useMemo(() => !isEmpty(errors), [errors]);

  const isUploadRepo = values.origin === ContentOrigin.UPLOAD;
  const formSchema = useMemo(() => validationSchema(isUploadRepo), [isUploadRepo]);

  const formik = useFormik({
    initialValues: values,
    validationSchema: formSchema,
    initialTouched: defaultTouchedState,
    onSubmit: () => undefined,
  });

  const { clearCheckedRepositories } = useContentListOutletContext();

  const { fetchGpgKey, isLoading: isFetchingGpgKey } = useFetchGpgKey();

  const { distribution_arches: distArches = [], distribution_versions: distVersions = [] } =
    queryClient.getQueryData<RepositoryParamsResponse>(REPOSITORY_PARAMS_KEY) || {};

  const { distributionArches, distributionVersions } = useMemo(() => {
    const distributionArches = {};
    const distributionVersions = {};
    distArches.forEach(({ name, label }) => (distributionArches[name] = label));
    distVersions.forEach(({ name, label }) => (distributionVersions[name] = label));
    return { distributionArches, distributionVersions };
  }, [distArches, distVersions]);

  const onClose = () => navigate(`${rootPath}/${REPOSITORIES_ROUTE}`);

  const { mutateAsync: addContent, isLoading: isAdding } = useAddContentQuery([
    mapFormikToAPIValues(values),
  ]);

  const updateVariable = (newValue) => {
    // ensures no unnecessary validation occurs
    if (
      newValue['name'] ||
      newValue['url'] ||
      newValue['gpgKey'] ||
      newValue['metadataVerification']
    ) {
      setChangeVerified(false);
    }

    const updatedData = { ...values, ...newValue };

    setValues(updatedData);
  };

  const getFieldValidation = (field: keyof FormikValues): 'default' | 'success' | 'error' => {
    const value = !!values?.[field];
    const err = !!errors?.[field];
    const touched = formik.touched?.[field];
    switch (true) {
      case err && touched:
        return 'error';
      case field === 'gpgKey':
        return 'default';
      case value && touched:
        return 'success';
      default:
        return 'default';
    }
  };

  const debouncedValues = useDebounce(values) || {};

  const {
    mutateAsync: validateContent,
    data: validationList,
    isLoading: isValidating,
  } = useValidateContentList();

  useEffect(() => {
    (async () => {
      if (isValidURL(debouncedValues.gpgKey)) {
        const result = await fetchGpgKey(debouncedValues.gpgKey);
        // If successful
        if (result !== debouncedValues.gpgKey) {
          updateVariable({
            gpgKey: result,
            ...(values.gpgKey === '' && !!result
              ? {
                  metadataVerification: !!validationList?.url?.metadata_signature_present,
                }
              : {}),
          });
          return;
        }
      }
    })();
  }, [debouncedValues.gpgKey]);

  useDeepCompareEffect(() => {
    if (isFetchingGpgKey || isLoadingInitialContent || isEmpty(debouncedValues)) return;
    (async () => {
      // We wait for the gpg_key to finish returning before validating
      const { uuid, name, url, gpgKey, metadataVerification } = debouncedValues;

      formik.setValues(values);

      let newTouchedValues = { ...formik.touched };
      if (!newTouchedValues?.name && name) {
        newTouchedValues = { ...newTouchedValues, name: true };
      }
      if (!newTouchedValues?.url && url) {
        newTouchedValues = { ...newTouchedValues, url: true };
      }
      if (!newTouchedValues?.gpgKey && gpgKey) {
        newTouchedValues = { ...newTouchedValues, gpgKey: true };
      }

      const validationData = await validateContent({
        uuid,
        name: name || undefined,
        url: url || undefined,
        gpg_key: gpgKey || undefined,
        metadata_verification: metadataVerification,
      });

      const formikErrors = await formik.validateForm(debouncedValues);
      const mappedErrorData = mapValidationData(validationData, formikErrors, isUploadRepo);
      formik.setTouched(newTouchedValues);
      setErrors(mappedErrorData);
      setChangeVerified(true);
    })();
  }, [debouncedValues]);

  const updateGpgKey = async (value: string) => {
    // It's not a valid url, so we allow the user to continue
    updateVariable({
      gpgKey: value,
      ...(values.gpgKey === '' && !!value
        ? {
            metadataVerification: !!validationList?.url?.metadata_signature_present,
          }
        : {}),
    });
  };

  const updateArchAndVersion = () => {
    const { url, arch, versions } = values;
    if (isValidURL(url) && (arch === 'any' || versions[0] === 'any')) {
      const updatedArch =
        arch !== 'any'
          ? arch
          : distArches.find(({ name, label }) => url.includes(name) || url.includes(label))
              ?.label || 'any';

      let updatedVersions: Array<string> = [];
      if (versions.length && versions[0] !== 'any') {
        updatedVersions = versions;
      } else {
        const newVersion = distVersions.find(
          ({ name, label }) => url.includes(name) || url.includes('/' + label),
        )?.label;
        if (newVersion) updatedVersions = [newVersion];
        if (isEmpty(updatedVersions)) updatedVersions = ['any'];
      }

      setValues({ ...values, arch: updatedArch, versions: updatedVersions });
    }
  };

  const setVersionSelected = (value: string[]) => {
    let valueToUpdate = value;
    if (value.length === 0 || valueToUpdate[value.length - 1] === 'any') {
      valueToUpdate = ['any'];
    }
    if (valueToUpdate.length > 1 && valueToUpdate.includes('any')) {
      valueToUpdate = valueToUpdate.filter((val) => val !== 'any');
    }

    updateVariable({
      versions: valueToUpdate,
    });
  };

  const { notify } = useNotification();

  const actionTakingPlace =
    isFetchingGpgKey || isAdding || isValidating || !changeVerified || isEditing;

  const {
    name,
    url,
    arch,
    gpgKey,
    versions,
    gpgLoading,
    metadataVerification,
    modularityFilteringEnabled,
    origin,
  } = values;

  return (
    <Modal
      position='top'
      variant={ModalVariant.medium}
      title={isEdit ? 'Edit custom repository' : 'Add custom repositories'}
      ouiaId='add_edit_custom_repository'
      help={
        <Popover
          headerContent={<div>{isEdit ? 'Edit a' : 'Add a'} custom repository</div>}
          bodyContent={
            <div>Use this form to {isEdit ? 'edit' : 'enter'} the values for a new repository.</div>
          }
        >
          <Button variant='plain' aria-label='Help'>
            <OutlinedQuestionCircleIcon />
          </Button>
        </Popover>
      }
      description={
        <p className={classes.description}>
          {isEdit ? 'Edit' : 'Add'} by completing the form. Default values may be provided
          automatically.
        </p>
      }
      isOpen
      onClose={onClose}
      footer={
        <Stack>
          <StackItem>
            {isEdit ? (
              <Button
                key='confirm'
                ouiaId='modal_save'
                className={classes.saveButton}
                variant='primary'
                isLoading={actionTakingPlace}
                isDisabled={!changeVerified || actionTakingPlace || hasErrors || editHasNotChanged}
                onClick={() => editContent().then(onClose)}
              >
                {editHasNotChanged ? 'No changes' : 'Save changes'}
              </Button>
            ) : (
              <DropdownSelect
                isDisabled={!changeVerified || actionTakingPlace || hasErrors || editHasNotChanged}
                dropDownItems={[
                  {
                    isDisabled: isAdding,
                    children:
                      origin === ContentOrigin.UPLOAD ? 'Save and close' : 'Save and add another',
                    type: 'submit',
                  },
                ]}
                ouiaId='wizard-create-btn'
                onSelect={() =>
                  addContent().then(() => {
                    clearCheckedRepositories();
                    if (origin === ContentOrigin.UPLOAD) {
                      return onClose();
                    }
                    setTimeout(() => navigate(`${rootPath}/${REPOSITORIES_ROUTE}/${ADD_ROUTE}`), 0);
                    onClose();
                  })
                }
                menuValue=''
                menuToggleProps={{
                  'aria-label': 'Save other options',
                  isFullWidth: false,
                  variant: 'primary',
                  splitButtonOptions: {
                    variant: 'action',
                    items: [
                      <Button
                        key='confirm'
                        ouiaId='modal_save'
                        className={actionTakingPlace ? classes.saveShifted : classes.saveButton}
                        variant={ButtonVariant.primary}
                        isLoading={actionTakingPlace}
                        isDisabled={
                          !changeVerified || actionTakingPlace || hasErrors || editHasNotChanged
                        }
                        onClick={() =>
                          addContent().then((resp) => {
                            clearCheckedRepositories();
                            if (origin === ContentOrigin.UPLOAD) {
                              navigate(
                                `${rootPath}/${REPOSITORIES_ROUTE}/${resp[0]?.uuid}/${UPLOAD_ROUTE}`,
                              );
                            } else {
                              navigate(`${rootPath}/${REPOSITORIES_ROUTE}`);
                            }
                          })
                        }
                      >
                        {origin === ContentOrigin.UPLOAD ? 'Save and upload content' : 'Save'}
                      </Button>,
                    ],
                  },
                }}
              />
            )}
            <Button
              className={classes.cancelButton}
              key='cancel'
              variant='link'
              onClick={onClose}
              ouiaId='modal_cancel'
            >
              Cancel
            </Button>
          </StackItem>
        </Stack>
      }
    >
      {isEdit && isLoadingInitialContent ? (
        <Loader />
      ) : (
        <Form>
          <FormGroup label='Name' isRequired fieldId='namegroup'>
            <TextInput
              isRequired
              id='name'
              name='name'
              label='Name'
              ouiaId='input_name'
              type='text'
              validated={getFieldValidation('name')}
              onChange={(_event, value) => {
                updateVariable({ name: value });
              }}
              value={name || ''}
              placeholder='Enter name'
            />
            <CustomHelperText
              hide={getFieldValidation('name') === 'default'}
              textValue={errors?.name}
            />
          </FormGroup>
          <FormGroup label='Repository type' fieldId='repositoryType' hasNoPaddingTop>
            <Flex direction={{ default: 'column' }} gap={{ default: 'gap' }}>
              <Hide hide={isEdit && contentOrigin === ContentOrigin.UPLOAD}>
                <Radio
                  isChecked={values.snapshot && values.origin === ContentOrigin.EXTERNAL}
                  id='snapshot_radio'
                  label='Snapshotting'
                  description={
                    values.snapshot && values.origin === ContentOrigin.EXTERNAL
                      ? 'Enable snapshotting for an external repository, allowing you to build images with historical snapshots.'
                      : ''
                  }
                  name='snapshot-radio'
                  onClick={() =>
                    setValues({ ...values, snapshot: true, origin: ContentOrigin.EXTERNAL })
                  }
                />
                <Radio
                  isChecked={!values.snapshot && values.origin === ContentOrigin.EXTERNAL}
                  id='introspect_radio'
                  label='Introspect only'
                  description={
                    !values.snapshot && values.origin === ContentOrigin.EXTERNAL
                      ? 'Enable only introspection for an external repository, snapshots will not be taken.'
                      : ''
                  }
                  name='introspect-radio'
                  onClick={() =>
                    setValues({ ...values, snapshot: false, origin: ContentOrigin.EXTERNAL })
                  }
                />
              </Hide>
              <Hide
                hide={
                  (isInProd && !isInBeta) || (isEdit && contentOrigin === ContentOrigin.EXTERNAL)
                }
              >
                <ConditionalTooltip
                  show={isEdit && contentOrigin === ContentOrigin.UPLOAD}
                  setDisabled={isEdit && contentOrigin === ContentOrigin.UPLOAD}
                  position='top-start'
                  enableFlip
                  flipBehavior={['top-start', 'bottom-start']}
                  content="Repository type cannot be changed for 'Upload' repositories"
                >
                  <Radio
                    isChecked={isUploadRepo}
                    id='upload_radio'
                    label='Upload'
                    description={
                      isUploadRepo
                        ? 'Create a repository to upload custom content to. Snapshots will be taken after every new upload, allowing you to build images with uploaded content.'
                        : ''
                    }
                    name='upload-radio'
                    onClick={() =>
                      setValues({
                        ...values,
                        url: '',
                        snapshot: true,
                        origin: ContentOrigin.UPLOAD,
                      })
                    }
                  />
                </ConditionalTooltip>
              </Hide>
            </Flex>

            <Hide hide={values.snapshot}>
              <FormAlert style={{ paddingTop: '20px' }}>
                <Alert
                  variant='warning'
                  title='Enable snapshotting for this repository if you want to build images with historical snapshots.'
                  isInline
                />
              </FormAlert>
            </Hide>
          </FormGroup>

          <Hide hide={isUploadRepo}>
            <FormGroup label='URL' isRequired fieldId='url'>
              <TextInput
                isRequired
                type='url'
                validated={getFieldValidation('url')}
                onBlur={() => updateArchAndVersion()}
                onChange={(_event, value) => {
                  if (url !== value) {
                    updateVariable({ url: value });
                  }
                }}
                value={url || ''}
                placeholder='https://'
                id='url'
                name='url'
                label='Url'
                ouiaId='input_url'
              />
              <CustomHelperText
                hide={getFieldValidation('url') === 'default'}
                textValue={errors?.url}
              />
            </FormGroup>
          </Hide>
          <FormGroup
            label='Restrict architecture'
            aria-label='restrict_to_architecture'
            labelIcon={
              <Tooltip content='Optional: Select value to restrict package architecture'>
                <OutlinedQuestionCircleIcon className='pf-u-ml-xs' color={global_Color_200.value} />
              </Tooltip>
            }
            fieldId='arch'
          >
            <DropdownSelect
              onSelect={(_, val) =>
                updateVariable({
                  arch: val,
                })
              }
              selected={arch}
              menuToggleProps={{
                'aria-label': 'filter architecture',
                id: 'archSelection',
              }}
              dropDownItems={Object.keys(distributionArches).map((option) => ({
                value: distributionArches[option],
                isSelected: arch === distributionArches[option],
                children: option,
                'data-ouia-component-id': `filter_${option}`,
              }))}
              menuValue={
                Object.keys(distributionArches).find(
                  (key: string) => arch === distributionArches[key],
                )!
              }
              ouiaId='restrict_to_architecture'
            />
          </FormGroup>
          <FormGroup
            label='Restrict OS version'
            aria-label='restrict_to_os_version'
            labelIcon={
              <Tooltip content='Optional: Select value to restrict package OS version'>
                <OutlinedQuestionCircleIcon className='pf-u-ml-xs' color={global_Color_200.value} />
              </Tooltip>
            }
            fieldId='version'
          >
            <DropdownSelect
              onSelect={(_, val) => {
                setVersionSelected(
                  versions.includes(val as string)
                    ? versions.filter((item) => item !== (val as string))
                    : [...versions, val as string],
                );
              }}
              selected={versions}
              menuToggleProps={{
                'aria-label': 'filter version',
                id: 'versionSelection',
              }}
              multiSelect
              dropDownItems={Object.keys(distributionVersions).map((option) => ({
                hasCheckbox: true,
                value: distributionVersions[option],
                isSelected: versions.includes(distributionVersions[option]),
                children: option,
                'data-ouia-component-id': `filter_${option}`,
              }))}
              menuValue={
                versions?.length ? (
                  <ChipGroup aria-label='Current selections'>
                    {(
                      Object.keys(distributionVersions).filter((key) =>
                        versions.includes(distributionVersions[key as string]),
                      ) as string[]
                    ).map((val) => (
                      <Chip
                        key={val}
                        onClick={(ev) => {
                          ev.preventDefault();
                          setVersionSelected(
                            versions.filter((item) => item !== distributionVersions[val]),
                          );
                        }}
                      >
                        {val}
                      </Chip>
                    ))}
                  </ChipGroup>
                ) : (
                  'Any version'
                )
              }
              ouiaId='restrict_to_os_version'
            />
          </FormGroup>
          <FormGroup fieldId='enable_module_hotfixes'>
            <Switch
              label='Modularity filtering enabled'
              labelOff='Modularity filtering disabled'
              ouiaId={`module_hotfixes_switch_${modularityFilteringEnabled ? 'on' : 'off'}`}
              aria-label='enable_module_hotfixes'
              hasCheckIcon
              id='module-hotfixes-switch'
              name='module-hotfixes-switch'
              isChecked={modularityFilteringEnabled}
              onChange={() => {
                updateVariable({
                  modularityFilteringEnabled: !modularityFilteringEnabled,
                });
              }}
            />
            <Tooltip content='When enabled, modularity filtering prevents updates to packages contained within an enabled module'>
              <OutlinedQuestionCircleIcon className='pf-u-ml-xs' color={global_Color_200.value} />
            </Tooltip>
          </FormGroup>
          <FormGroup
            label='GPG key'
            labelIcon={
              <Tooltip content='Optional: Add GPG Key file or URL'>
                <OutlinedQuestionCircleIcon className='pf-u-ml-xs' color={global_Color_200.value} />
              </Tooltip>
            }
            fieldId='gpgKey'
          >
            <FileUpload
              className={classes.gpgKeyInput}
              validated={getFieldValidation('gpgKey')}
              id='gpgKey-uploader'
              aria-label='gpgkey_file_to_upload'
              type='text'
              filenamePlaceholder='Drag a file here or upload one'
              textAreaPlaceholder='Paste GPG key or URL here'
              value={gpgKey}
              isLoading={gpgLoading}
              spellCheck={false}
              onDataChange={(_event, value) => updateGpgKey(value)}
              onTextChange={(_event, value) => updateGpgKey(value)}
              onClearClick={() => updateVariable({ gpgKey: '' })}
              dropzoneProps={{
                maxSize: maxUploadSize,
                onDropRejected: (files) => failedFileUpload(files as FileRejection[], notify),
              }}
              allowEditingUploadedText
              browseButtonText='Upload'
            />
            <CustomHelperText
              hide={getFieldValidation('gpgKey') === 'default'}
              textValue={errors?.gpgKey}
            />
          </FormGroup>
          <Hide hide={!gpgKey}>
            <FormGroup
              fieldId='metadataVerification'
              label='Use GPG key for'
              isInline
              className={classes.gpgKeyFormGroup}
            >
              <Radio
                id='package-verification-only'
                name='package-verification-only'
                label='Package verification only'
                isChecked={!metadataVerification}
                onChange={() => updateVariable({ metadataVerification: false })}
              />
              <ConditionalTooltip
                show={validationList?.url?.metadata_signature_present === false}
                content="This repository's metadata is not signed, metadata verification is not possible."
              >
                <Radio
                  id='package-and-repository-verification'
                  name='package-and-repository-verification'
                  label='Package and metadata verification'
                  isChecked={metadataVerification}
                  onChange={() => updateVariable({ metadataVerification: true })}
                />
              </ConditionalTooltip>
            </FormGroup>
          </Hide>
        </Form>
      )}
    </Modal>
  );
};

export default AddContent;
