import { Flex, FlexItem, ClipboardCopy, ClipboardCopyVariant } from '@patternfly/react-core';
import React from 'react';
import textStyles from '@patternfly/react-styles/css/utilities/Text/text';

type Props = { label: string; text: string };

const LabeledClipboardCopy = ({ label, text }: Props) => (
  <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
    <FlexItem>
      <p className={textStyles.fontWeightBold}>{label}</p>
    </FlexItem>
    <FlexItem>
      <ClipboardCopy
        isReadOnly
        hoverTip='Copy'
        clickTip='Copied'
        variant={ClipboardCopyVariant.expansion}
      >
        {text}
      </ClipboardCopy>
    </FlexItem>
  </Flex>
);

export default LabeledClipboardCopy;
