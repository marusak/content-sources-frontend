import { Card, CardBody, Content, Flex, FlexItem, Title, Tooltip } from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

export type MatchSummaryItem = {
  count: number;
  label: string;
  tooltip: string;
};

type MatchSummaryStatsProps = {
  items: MatchSummaryItem[];
};

const MatchSummaryStats = ({ items }: MatchSummaryStatsProps) => (
  <Card>
    <CardBody>
      <Flex gap={{ default: 'gapLg' }} justifyContent={{ default: 'justifyContentSpaceAround' }}>
        {items.map(({ count, label, tooltip }) => (
          <FlexItem key={label}>
            <Flex
              direction={{ default: 'column' }}
              alignItems={{ default: 'alignItemsCenter' }}
              gap={{ default: 'gapXs' }}
            >
              <FlexItem>
                <Title headingLevel='h4' size='3xl'>
                  {count}
                </Title>
              </FlexItem>
              <FlexItem>
                <Content component='p' className={text.fontSizeMd}>
                  {label}{' '}
                  <Tooltip content={tooltip} position='bottom'>
                    <OutlinedQuestionCircleIcon className={text.textColorSubtle} />
                  </Tooltip>
                </Content>
              </FlexItem>
            </Flex>
          </FlexItem>
        ))}
      </Flex>
    </CardBody>
  </Card>
);

export default MatchSummaryStats;
