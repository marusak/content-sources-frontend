import {
  Alert,
  ClipboardCopy,
  ClipboardCopyVariant,
  TabContent,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import React from 'react';
import { createUseStyles } from 'react-jss';
import { useParams } from 'react-router-dom';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useAppContext } from '../../../../../middleware/AppContext';

export const CURL_TAB = 'curl';

const useStyles = createUseStyles({
  textGroup: {
    paddingTop: '8px',
  },
});

type Props = {
  tabContentRef: React.RefObject<HTMLElement>;
};

const CurlTab = ({ tabContentRef }: Props) => {
  const classes = useStyles();
  const { templateUUID } = useParams();
  const { isLightspeedEnabled } = useAppContext();

  return (
    <TabContent eventKey={CURL_TAB} id={CURL_TAB} ref={tabContentRef} hidden>
      <div className={classes.textGroup}>
        <Alert
          variant='warning'
          title={`Consuming a template in this way will result in the system not reporting applicable errata properly within ${isLightspeedEnabled ? 'Red Hat Lightspeed' : 'Insights'}.`}
          isInline
        >
          System advisory information will not be available via{' '}
          <a href='insights/patch/systems/' rel='noreferrer' target='_blank'>
            Systems <ExternalLinkAltIcon />
          </a>
        </Alert>
      </div>
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
          <Content component='li'>
            <Content component='h6'>Or register with subscription manager</Content>
            <ClipboardCopy
              isReadOnly
              hoverTip='Copy'
              clickTip='Copied'
              variant={ClipboardCopyVariant.expansion}
            >
              subscription-manager register
            </ClipboardCopy>
          </Content>
        </Content>
        <Content component='ul' isPlainList>
          <Content component='li'>
            <Content component={ContentVariants.h2}>Download the repo file</Content>
            <ClipboardCopy
              isReadOnly
              hoverTip='Copy'
              clickTip='Copied'
              variant={ClipboardCopyVariant.expansion}
            >
              {'curl --cert /etc/pki/consumer/cert.pem  --key /etc/pki/consumer/key.pem -o /etc/yum.repos.d/template.repo  https://cert.console.redhat.com/api/content-sources/v1/templates/' +
                templateUUID +
                '/config.repo'}
            </ClipboardCopy>
          </Content>
        </Content>
      </Content>
      <div className={classes.textGroup}>
        <Alert
          variant='info'
          title='Adding or removing a repository from the template will not be reflected on the
                            client until the repo file is re-downloaded.'
          isInline
        />
      </div>
    </TabContent>
  );
};

export default CurlTab;
