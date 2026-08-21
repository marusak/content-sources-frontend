import { useState } from 'react';
import {
  Button,
  Checkbox,
  Content,
  Flex,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { ExternalLinkSquareAltIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import { REPOSITORIES_DOCS_URL } from 'constants/docs';
import { useNavigateTo } from 'Hooks/navigation/useNavigateTo';
import { useContentListOutletContext } from '../../ContentListTable';

export default function MarkAsPartnerModal() {
  const { repoUUID } = useParams();
  const onClose = useNavigateTo('repositories');
  const [understood, setUnderstood] = useState(false);
  const { markAsPartner, isMarkingPartner } = useContentListOutletContext();

  const onConfirm = () => {
    if (!repoUUID) return;
    // Only marking repository as partner is allowed, not unmarking
    markAsPartner({ uuid: repoUUID, partner: true });
    onClose();
  };

  return (
    <Modal
      position='top'
      variant={ModalVariant.small}
      ouiaId='mark_as_partner_modal'
      isOpen
      onClose={onClose}
      aria-labelledby='mark-as-partner-modal-title'
    >
      <ModalHeader title='Mark as partner repository' labelId='mark-as-partner-modal-title' />
      <ModalBody>
        <Content component='p'>
          To make snapshots of this repository public for other users, mark it as a partner
          repository first. Then you must manually select the snapshot you want to make public.
          Snapshots are not published automatically.
        </Content>
        <Button
          variant='link'
          component='a'
          href={REPOSITORIES_DOCS_URL}
          target='_blank'
          rel='noopener noreferrer'
          icon={<ExternalLinkSquareAltIcon />}
          iconPosition='end'
          ouiaId='mark-as-partner-learn-more'
          isInline
        >
          Learn more about partner content
        </Button>
        <Checkbox
          id='mark-as-partner-understand'
          ouiaId='mark-as-partner-understand'
          className='pf-v6-u-mt-md'
          isChecked={understood}
          onChange={(_event, checked) => setUnderstood(checked)}
          label='I understand that snapshots must be published manually.'
        />
      </ModalBody>
      <ModalFooter>
        <Flex columnGap={{ default: 'columnGapLg' }}>
          <Button
            key='confirm'
            ouiaId='mark_as_partner_confirm'
            variant='primary'
            isLoading={isMarkingPartner}
            isDisabled={!understood || isMarkingPartner || !repoUUID}
            onClick={onConfirm}
          >
            Mark as partner repository
          </Button>
          <Button key='cancel' variant='link' onClick={onClose} ouiaId='mark_as_partner_cancel'>
            Cancel
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
