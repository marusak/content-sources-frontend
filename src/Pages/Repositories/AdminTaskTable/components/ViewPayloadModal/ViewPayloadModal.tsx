import {
  Bullseye,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Spinner,
  Tab,
  TabContent,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { createUseStyles } from 'react-jss';
import { createRef, useEffect, useMemo, useState } from 'react';
import { AdminTask } from 'services/Admin/AdminTaskApi';
import AdminTaskInfo from './components/AdminTaskInfo';
import ReactJson from 'react18-json-view';
import Hide from 'components/Hide/Hide';
import { useFetchAdminTaskQuery } from 'services/Admin/AdminTaskQueries';
import { useNavigate, useParams } from 'react-router-dom';
import useRootPath from 'Hooks/useRootPath';
import { ADMIN_TASKS_ROUTE, REPOSITORIES_ROUTE } from 'Routes/constants';

const useStyles = createUseStyles({
  jsonView: {
    fontSize: '14px',
  },
});

export interface TabData {
  title: string;
  data: object;
  contentRef: React.RefObject<HTMLElement>;
}

const ViewPayloadModal = () => {
  const { taskUUID: uuid } = useParams();
  const classes = useStyles();
  const navigate = useNavigate();
  const rootPath = useRootPath();

  const onClose = () => navigate(`${rootPath}/${REPOSITORIES_ROUTE}/${ADMIN_TASKS_ROUTE}`);

  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const detailRef = createRef<HTMLElement>();

  const { isLoading, isFetching, data: adminTask, isError } = useFetchAdminTaskQuery(uuid);

  const handleTabClick = (_, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  useEffect(() => {
    if (isError) {
      onClose();
    }
  }, [isError]);

  const tabs = useMemo(() => {
    const tabs: TabData[] = [];

    if (!adminTask) {
      return tabs;
    }

    if (adminTask.payload) {
      tabs.push({
        title: 'Payload',
        data: adminTask.payload,
        contentRef: createRef<HTMLElement>(),
      });
    }

    switch (adminTask.typename) {
      case 'snapshot': {
        const pulp = adminTask.pulp;
        if (pulp) {
          if (pulp.sync) {
            tabs.push({
              title: 'Sync',
              data: pulp.sync,
              contentRef: createRef<HTMLElement>(),
            });
          }
          if (pulp.distribution) {
            tabs.push({
              title: 'Distribution',
              data: pulp.distribution,
              contentRef: createRef<HTMLElement>(),
            });
          }
          if (pulp.publication) {
            tabs.push({
              title: 'Publication',
              data: pulp.publication,
              contentRef: createRef<HTMLElement>(),
            });
          }
        }
        break;
      }
    }
    return tabs;
  }, [adminTask?.uuid, isFetching]);

  const showLoading = isLoading || !adminTask;
  return (
    <Modal
      position='top'
      variant={ModalVariant.medium}
      ouiaId='task_details'
      aria-label='Task details'
      isOpen
      onClose={onClose}
    >
      <ModalHeader>
        <Hide hide={isLoading}>
          <Tabs
            activeKey={activeTabKey}
            onSelect={handleTabClick}
            aria-label='Task tabs'
            ouiaId='task-tabs'
          >
            {[
              <Tab
                key='taskDetails'
                title={<TabTitleText>Task details</TabTitleText>}
                aria-label='Task details'
                ouiaId='task-details'
                eventKey={0}
                tabContentRef={detailRef}
              />,
              ...tabs.map(({ title, contentRef }, key) => (
                <Tab
                  key={title + key}
                  eventKey={title}
                  aria-label={title}
                  ouiaId={title}
                  tabContentRef={contentRef}
                  title={<TabTitleText>{title}</TabTitleText>}
                />
              )),
            ]}
          </Tabs>
        </Hide>
      </ModalHeader>
      <ModalBody>
        <Hide hide={!showLoading}>
          <Bullseye>
            <Spinner />
          </Bullseye>
        </Hide>
        <Hide hide={showLoading}>
          <TabContent aria-label='Task details' eventKey={0} id='task-details' ref={detailRef}>
            {/* Hide "isLoading" checks if adminTask is not null */}
            <AdminTaskInfo adminTask={adminTask as AdminTask} />
          </TabContent>
          {tabs.map(({ title, data, contentRef }, index) => (
            <TabContent
              key={index}
              eventKey={title}
              aria-label={title}
              id={title}
              className={classes.jsonView}
              ref={contentRef}
              hidden
            >
              <ReactJson src={data} enableClipboard theme='atom' />
            </TabContent>
          ))}
        </Hide>
      </ModalBody>
    </Modal>
  );
};

export default ViewPayloadModal;
