import { PopoverProps, Popover, Button } from '@patternfly/react-core';
import { ExternalLinkSquareAltIcon, HelpIcon } from '@patternfly/react-icons';

export type HelpPopoverProps = {
  linkText: string;
  linkUrl: string;
} & Required<Pick<PopoverProps, 'headerContent' | 'bodyContent'>> &
  Omit<PopoverProps, 'headerContent' | 'bodyContent' | 'footerContent'>;

const HelpPopover = ({
  linkText,
  linkUrl,
  headerContent,
  bodyContent,
  position = 'top-start',
  children = <Button variant='plain' icon={<HelpIcon />} />,
  ...props
}: HelpPopoverProps) => (
  <Popover
    headerContent={headerContent}
    position={position}
    bodyContent={bodyContent}
    footerContent={
      <Button
        variant='link'
        component='a'
        icon={<ExternalLinkSquareAltIcon />}
        iconPosition='end'
        href={linkUrl}
        target='_blank'
        // Use 'noopener noreferrer' alongside target='_blank' to prevent tabnabbing and protect user privacy
        rel='noopener noreferrer'
      >
        {linkText}
      </Button>
    }
    {...props}
  >
    {children}
  </Popover>
);

export default HelpPopover;
