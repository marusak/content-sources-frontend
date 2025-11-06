import React from 'react';
import { Flex, FlexItem, Alert } from '@patternfly/react-core';
import { useAppContext } from '../../../../../middleware/AppContext';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import LabeledClipboardCopy from './components/LabeledClipboardCopy';
import type { TemplateItem } from '../../../../../services/Templates/TemplateApi';

type Props = {
  template: Pick<TemplateItem, 'uuid'>;
};

const ManualConfigView = ({ template: { uuid } }: Props) => {
  const { isLightspeedEnabled } = useAppContext();

  const curlCommand = `curl --cert /etc/pki/consumer/cert.pem --key /etc/pki/consumer/key.pem -o /etc/yum.repos.d/template.repo https://cert.console.redhat.com/api/content-sources/v1/templates/${uuid}/config.repo`;

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
      <FlexItem>
        <p className={text.fontWeightBold}>Manual configuration (cURL)</p>
        <p>Copy commands and execute on the system itself to assign it this template.</p>
      </FlexItem>

      <FlexItem>
        <Alert
          variant='warning'
          title={`Consuming a template in this way will result in the system not reporting applicable errata properly within ${isLightspeedEnabled ? 'Red Hat Lightspeed' : 'Insights'}.`}
          isInline
        >
          <p>
            System advisory information will not be available via&nbsp;
            <a href='insights/patch/systems/' rel='noreferrer' target='_blank'>
              Systems.
            </a>
          </p>
        </Alert>
      </FlexItem>

      <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
        <FlexItem>
          <LabeledClipboardCopy
            label='Register for subscription'
            text='subscription-manager register'
          />
        </FlexItem>
        <FlexItem>
          <LabeledClipboardCopy label='Download the repository file systems' text={curlCommand} />
        </FlexItem>
      </Flex>

      <FlexItem>
        <Alert
          variant='info'
          title='Adding or removing a repository from the template will not be reflected on the client until the repo file is re-downloaded.'
          isInline
          isPlain
        />
      </FlexItem>
    </Flex>
  );
};

export default ManualConfigView;
