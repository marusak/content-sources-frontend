import {
  Button,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { InnerScrollContainer } from '@patternfly/react-table';
import { ContentOrigin } from 'services/Content/ContentApi';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import useRootPath from 'Hooks/useRootPath';
import { useAppContext } from 'middleware/AppContext';
import { useEffect, useState } from 'react';
import { SnapshotPackagesTab } from './Tabs/SnapshotPackagesTab';
import { createUseStyles } from 'react-jss';
import { SnapshotSelector } from './SnapshotSelector';
import { REPOSITORIES_ROUTE } from 'Routes/constants';
import { SnapshotErrataTab } from './Tabs/SnapshotErrataTab';

const useStyles = createUseStyles({
  modalBody: {
    padding: '24px 24px 0 24px',
  },
  topContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
    '& button': { maxHeight: '37px', marginTop: 'auto' },
  },
});

export enum SnapshotDetailTab {
  PACKAGES = 'packages',
  ERRATA = 'errata',
}

export default function SnapshotDetailsModal() {
  const { contentOrigin } = useAppContext();
  const classes = useStyles();
  const { repoUUID, snapshotUUID } = useParams();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const rootPath = useRootPath();
  const navigate = useNavigate();
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);

  useEffect(() => {
    if (urlSearchParams.get('tab') === SnapshotDetailTab.ERRATA) {
      setActiveTabKey(1);
    }
  }, []);

  const handleTabClick = (
    _: React.MouseEvent<HTMLElement, MouseEvent>,
    tabIndex: string | number,
  ) => {
    setUrlSearchParams(tabIndex ? { tab: SnapshotDetailTab.ERRATA } : {});
    setActiveTabKey(tabIndex);
  };

  const onClose = () =>
    navigate(
      `${rootPath}/${REPOSITORIES_ROUTE}` +
        (contentOrigin.length === 1 && contentOrigin[0] === ContentOrigin.REDHAT
          ? `?origin=${contentOrigin}`
          : ''),
    );

  const onBackClick = () => navigate(rootPath + `/${REPOSITORIES_ROUTE}/${repoUUID}/snapshots`);

  return (
    <Modal
      key={snapshotUUID}
      position='top'
      ouiaId='snapshot_details_modal'
      variant={ModalVariant.large}
      isOpen
      onClose={onClose}
      aria-labelledby='snapshot-details-modal-title'
    >
      <ModalHeader title='Snapshot detail' labelId='snapshot-details-modal-title' />
      <InnerScrollContainer>
        <Stack className={classes.modalBody}>
          <StackItem className={classes.topContainer}>
            <SnapshotSelector />
            <Button variant='secondary' onClick={onBackClick}>
              View all snapshots
            </Button>
          </StackItem>
          <StackItem>
            <Tabs
              activeKey={activeTabKey}
              onSelect={handleTabClick}
              aria-label='Snapshot detail tabs'
            >
              <Tab
                eventKey={0}
                ouiaId='packages_tab'
                title={<TabTitleText>Packages</TabTitleText>}
                aria-label='Snapshot package detail tab'
              >
                <SnapshotPackagesTab />
              </Tab>
              <Tab
                eventKey={1}
                ouiaId='advisories_tab'
                title={<TabTitleText>Advisories</TabTitleText>}
                aria-label='Snapshot errata detail tab'
              >
                <SnapshotErrataTab />
              </Tab>
            </Tabs>
          </StackItem>
        </Stack>
      </InnerScrollContainer>
      <ModalFooter>
        <Button key='close' variant='secondary' onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}
