import { ClipboardCopy, ClipboardCopyVariant, Flex, FlexItem } from '@patternfly/react-core';
import React from 'react';
import type { TemplateItem } from '../../../../../services/Templates/TemplateApi';
import text from '@patternfly/react-styles/css/utilities/Text/text';

type Props = {
  variant: 'registered' | 'unregistered';
  template: Pick<TemplateItem, 'uuid' | 'name'>;
};

const ApiView = ({ template: { uuid, name }, variant }: Props) => {
  const rhcCommand = `rhc connect --content-template=${name}`;
  const curlCommand = `curl --cert /etc/pki/consumer/cert.pem --key /etc/pki/consumer/key.pem -X PATCH https://cert.console.redhat.com/api/patch/v3/templates/${uuid}/subscribed-systems`;

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
      <FlexItem>
        <p className={text.fontWeightBold}>
          {variant === 'registered' ? 'Registered systems' : 'Non-registered systems'}
        </p>
        <p>Copy commands and execute on the system itself to assign it this template.</p>
      </FlexItem>

      <FlexItem>
        <ClipboardCopy
          isReadOnly
          hoverTip='Copy'
          clickTip='Copied'
          variant={ClipboardCopyVariant.expansion}
        >
          {variant === 'registered' ? curlCommand : rhcCommand}
        </ClipboardCopy>
      </FlexItem>

      <FlexItem>
        <ClipboardCopy
          isReadOnly
          hoverTip='Copy'
          clickTip='Copied'
          variant={ClipboardCopyVariant.expansion}
        >
          subscription-manager refresh
        </ClipboardCopy>
      </FlexItem>
    </Flex>
  );
};

export default ApiView;
