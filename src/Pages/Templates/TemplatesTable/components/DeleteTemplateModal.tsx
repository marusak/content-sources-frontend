import {
  Alert,
  Bullseye,
  Content,
  Flex,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';

import { createUseStyles } from 'react-jss';
import Hide from 'components/Hide/Hide';
import { useQueryClient } from 'react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useRootPath from 'Hooks/useRootPath';
import {
  GET_TEMPLATES_KEY,
  useDeleteTemplateItemMutate,
  useFetchTemplate,
} from 'services/Templates/TemplateQueries';
import { DETAILS_ROUTE, SYSTEMS_ROUTE, TEMPLATES_ROUTE } from 'Routes/constants';
import { useListSystemsByTemplateId } from 'services/Systems/SystemsQueries';
import { ActionButtons } from 'components/ActionButtons/ActionButtons';
import { checkValidUUID } from 'helpers';

const useStyles = createUseStyles({
  description: {
    paddingTop: '12px', // 4px on the title bottom padding makes this the "standard" 16 total padding
  },
  removeButton: {
    marginRight: '36px',
    transition: 'unset!important',
  },
  link: {
    padding: 4,
  },
});

export default function DeleteTemplateModal() {
  const classes = useStyles();
  const navigate = useNavigate();
  const rootPath = useRootPath();
  const queryClient = useQueryClient();

  // delete template modal can be placed over templates list page or the template details page
  const isOverTemplateDetail = useLocation().pathname.includes('details');

  const { templateUUID: uuid } = useParams();
  const isValidUUID = checkValidUUID(uuid!);

  if (!isValidUUID) throw new Error('UUID is invalid');

  const { data: templateData, isLoading: isTemplateLoading } = useFetchTemplate(uuid!);

  const { mutateAsync: deleteTemplate, isLoading: isDeleting } =
    useDeleteTemplateItemMutate(queryClient);

  const onClose = () => navigate(`${rootPath}/${TEMPLATES_ROUTE}`);

  const onCancel = isOverTemplateDetail
    ? () => navigate(`${rootPath}/${TEMPLATES_ROUTE}/${uuid}/${DETAILS_ROUTE}`)
    : onClose;

  const onSave = async () => {
    deleteTemplate(uuid as string).then(() => {
      queryClient.invalidateQueries(GET_TEMPLATES_KEY);
      onClose();
    });
  };

  const {
    isLoading: isLoading,
    data: systems = { data: [], meta: { count: 0, limit: 1, offset: 0 } },
  } = useListSystemsByTemplateId(uuid as string, 1, 1, '', '');

  const actionTakingPlace = isLoading || isDeleting;

  return (
    <Modal
      position='top'
      variant={ModalVariant.medium}
      ouiaId='delete_template'
      isOpen
      onClose={onCancel}
      aria-labelledby='delete-template-modal-title'
    >
      <ModalHeader
        title='Delete template?'
        labelId='delete-template-modal-title'
        titleIconVariant='warning'
      />
      <ModalBody>
        <Hide hide={!isLoading && !isTemplateLoading}>
          <Bullseye>
            <Spinner />
          </Bullseye>
        </Hide>
        <Hide hide={systems.data.length <= 0}>
          <Alert variant='warning' isInline title='This template is in use.'>
            <Flex direction={{ default: 'column' }}>
              <a
                href={`${rootPath}/${TEMPLATES_ROUTE}/${uuid}/${DETAILS_ROUTE}/${SYSTEMS_ROUTE}`}
                className={classes.link}
              >
                This template is assigned to {systems.data.length}{' '}
                {systems.data.length === 1 ? 'system' : 'systems'}.
              </a>
              <span>
                Deleting this template will cause all associated systems to stop receiving custom
                content and snapshotted Red Hat content; they will still receive the latest Red Hat
                content updates.
              </span>
            </Flex>
          </Alert>
        </Hide>
        <Hide hide={isLoading || isTemplateLoading}>
          <Content component='p' className={classes.description}>
            Template <b>{templateData?.name}</b> and all its data will be deleted. This action
            cannot be undone.
          </Content>
        </Hide>
      </ModalBody>
      <ModalFooter>
        <ActionButtons isAction={actionTakingPlace} onSave={onSave} onClose={onCancel} />
      </ModalFooter>
    </Modal>
  );
}
