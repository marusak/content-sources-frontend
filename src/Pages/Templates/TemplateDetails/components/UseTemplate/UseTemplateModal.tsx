import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import React from 'react';
import InsightsTab, { INSIGHTS_TAB } from './InsightsTab';
import CurlTab, { CURL_TAB } from './CurlTab';
import AnsibleTab, { ANSIBLE_TAB } from './AnsibleTab';

const UseTemplateModal = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(INSIGHTS_TAB);

  const handleModalToggle = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleTabClick = (
    _event: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  const contentRefInsights = React.createRef<HTMLElement>();
  const contentRefCurl = React.createRef<HTMLElement>();
  const contentRefAnsible = React.createRef<HTMLElement>();

  return (
    <div>
      <Button aria-label='use-template-button' variant='primary' onClick={handleModalToggle}>
        Use template
      </Button>

      <Modal
        tabIndex={0}
        variant={ModalVariant.large}
        isOpen={isModalOpen}
        onClose={handleModalToggle}
        aria-labelledby='use-template-modal-title'
      >
        <ModalHeader title='Use template' labelId='use-template-modal-title' />
        <ModalBody>
          <Tabs activeKey={activeTabKey} onSelect={handleTabClick} aria-label='Use template tabs'>
            <Tab
              eventKey={INSIGHTS_TAB}
              title={<TabTitleText>Insights (Preferred)</TabTitleText>}
              tabContentId={INSIGHTS_TAB}
              tabContentRef={contentRefInsights}
              aria-label='insights-tab'
            />
            <Tab
              eventKey={CURL_TAB}
              title={<TabTitleText>Curl</TabTitleText>}
              tabContentId={CURL_TAB}
              tabContentRef={contentRefCurl}
              aria-label='curl-tab'
            />
            <Tab
              eventKey={ANSIBLE_TAB}
              title={<TabTitleText>Ansible</TabTitleText>}
              tabContentId={ANSIBLE_TAB}
              tabContentRef={contentRefAnsible}
              aria-label='ansible-tab'
            />
          </Tabs>
          <div>
            <InsightsTab tabContentRef={contentRefInsights} />
            <CurlTab tabContentRef={contentRefCurl} />
            <AnsibleTab tabContentRef={contentRefAnsible} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button key='close' variant='secondary' onClick={handleModalToggle}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default UseTemplateModal;
