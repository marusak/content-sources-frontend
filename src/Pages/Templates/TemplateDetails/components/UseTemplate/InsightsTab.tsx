import {
  ClipboardCopy,
  ClipboardCopyVariant,
  TabContent,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import React from 'react';
import { ADD_ROUTE, SYSTEMS_ROUTE, TEMPLATES_ROUTE } from '../../../../../Routes/constants';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { createUseStyles } from 'react-jss';
import { useParams } from 'react-router-dom';
import useRootPath from '../../../../../Hooks/useRootPath';

export const INSIGHTS_TAB = 'insights';

const useStyles = createUseStyles({
  textGroup: {
    paddingTop: '8px',
  },
});

type Props = {
  tabContentRef: React.RefObject<HTMLElement>;
};

const InsightsTab = ({ tabContentRef }: Props) => {
  const classes = useStyles();
  const rootPath = useRootPath();
  const { templateUUID } = useParams();
  const addSystemsRoute = `${rootPath}/${TEMPLATES_ROUTE}/${templateUUID}/${SYSTEMS_ROUTE}/${ADD_ROUTE}`;

  return (
    <TabContent eventKey={INSIGHTS_TAB} id={INSIGHTS_TAB} ref={tabContentRef}>
      <Content className={classes.textGroup}>
        <Content component={ContentVariants.h2}>Register for subscriptions</Content>
        <Content component='ul' isPlainList>
          <Content component='li'>
            <Content component='h6'>Register with rhc</Content>
            <ClipboardCopy
              isReadOnly
              hoverTip='Copy'
              clickTip='Copied'
              variant={ClipboardCopyVariant.expansion}
            >
              rhc connect
            </ClipboardCopy>
          </Content>
        </Content>
        <Content component={ContentVariants.h2}>Assign the template to a system</Content>
        <Content component='ul' isPlainList>
          <Content component='li'>
            <Content component='h6'> Add the template via the UI </Content>
            <Content component='p'>
              Add the template in{' '}
              <a href={addSystemsRoute} rel='noreferrer' target='_blank'>
                Systems <ExternalLinkAltIcon />
              </a>
            </Content>
          </Content>
          <Content component='li'>
            <Content component='h6'> Or add the template via the API </Content>
            <ClipboardCopy
              isReadOnly
              hoverTip='Copy'
              clickTip='Copied'
              variant={ClipboardCopyVariant.expansion}
            >
              {'curl --cert /etc/pki/consumer/cert.pem  --key /etc/pki/consumer/key.pem -X PATCH https://cert.console.redhat.com/api/patch/v3/templates/' +
                templateUUID +
                '/subscribed-systems'}
            </ClipboardCopy>
          </Content>
        </Content>
        <Content component={ContentVariants.h2}>Refresh Subscription Manager</Content>
        <Content component='ul' isPlainList>
          <Content component='li'>
            <ClipboardCopy
              isReadOnly
              hoverTip='Copy'
              clickTip='Copied'
              variant={ClipboardCopyVariant.expansion}
            >
              subscription-manager refresh
            </ClipboardCopy>
          </Content>
        </Content>
      </Content>
    </TabContent>
  );
};

export default InsightsTab;
