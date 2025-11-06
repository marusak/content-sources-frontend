import { Button, Content, Flex } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import {
  OpenSourceBadge,
  PageHeader as _PageHeader,
  PageHeaderTitle,
} from '@redhat-cloud-services/frontend-components';
import { PageHeaderProps as _PageHeaderProps } from '@redhat-cloud-services/frontend-components/PageHeader/PageHeader';

import { FunctionComponent, ReactElement } from 'react';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import HelpPopover, { HelpPopoverProps } from '../HelpPopover';

interface PageHeaderProps extends _PageHeaderProps {
  children?: ReactElement | Array<ReactElement>;
}

const PageHeader = _PageHeader as FunctionComponent<PageHeaderProps>;

interface HeaderProps {
  title: string;
  ouiaId: string;
  paragraph: string;
  aboutData?: Omit<HelpPopoverProps, 'children'>;
}

export default function Header({ title, ouiaId, paragraph, aboutData }: HeaderProps) {
  return (
    <PageHeader>
      <Flex className={`${spacing.mXs} ${spacing.pbSm}`} direction={{ default: 'column' }}>
        <PageHeaderTitle
          title={
            <>
              {title}
              {aboutData ? (
                <HelpPopover {...aboutData}>
                  <Button
                    icon={<HelpIcon />}
                    variant='plain'
                    aria-label={String(aboutData.headerContent)}
                    className={spacing.mlSm}
                    style={{ verticalAlign: '2px' }}
                  />
                </HelpPopover>
              ) : null}
              <span style={{ verticalAlign: '2px' }}>
                <OpenSourceBadge repositoriesURL='https://github.com/content-services/content-sources-frontend' />
              </span>
            </>
          }
        />
        <Content component='p' ouiaId={ouiaId}>
          {paragraph}
        </Content>
      </Flex>
    </PageHeader>
  );
}
