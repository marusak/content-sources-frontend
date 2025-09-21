import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import {
  Button,
  Flex,
  FlexItem,
  Popover,
  Spinner,
  Stack,
  StackItem,
  Tooltip,
} from '@patternfly/react-core';
import StatusText from 'components/StatusText/StatusText';
import {
  t_global_color_status_danger_100 as global_danger_color_100,
  t_global_color_status_success_100 as global_success_color_100,
  t_global_color_status_warning_100 as global_warning_color_100,
} from '@patternfly/react-tokens';
import { createUseStyles } from 'react-jss';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ContentItem } from 'services/Content/ContentApi';
import ConditionalTooltip from 'components/ConditionalTooltip/ConditionalTooltip';
import { useAppContext } from 'middleware/AppContext';

dayjs.extend(relativeTime);

const red = global_danger_color_100.value;
const green = global_success_color_100.value;
const gold = global_warning_color_100.value;

const useStyles = createUseStyles({
  spinner: {
    animationDuration: '6s !important',
    margin: '-3px 0',
  },
});

interface Props {
  rowData: Pick<
    ContentItem,
    | 'uuid'
    | 'status'
    | 'failed_introspections_count'
    | 'last_introspection_time'
    | 'last_introspection_error'
    | 'last_snapshot_task'
  >;
  retryHandler?: (string) => Promise<void>;
}

interface DescriptionProps {
  error?: string;
  count?: number;
  time?: string;
}

interface FooterProps {
  retryHandler?: (string) => Promise<void>;
  uuid: string;
}

const PopoverDescription = ({ error, count, time }: DescriptionProps) => {
  const timeText = time === '' || time === undefined ? 'Never' : dayjs(time).fromNow();
  return (
    <div>
      {error}
      <Flex>
        <Stack className='pf-u-mt-sm'>
          <StackItem className='pf-u-font-weight-bold'>Last introspection</StackItem>
          <StackItem> {timeText} </StackItem>
        </Stack>
        <Stack className='pf-u-mt-sm'>
          <StackItem className='pf-u-font-weight-bold'>Failed attempts</StackItem>
          <StackItem> {count} </StackItem>
        </Stack>
      </Flex>
    </div>
  );
};

const PopoverFooter = ({ retryHandler, uuid }: FooterProps) => {
  const { rbac } = useAppContext();
  return (
    <Flex>
      <ConditionalTooltip
        content='You do not have the required permissions to perform this action.'
        show={!rbac?.repoWrite}
        setDisabled
      >
        <Button variant='link' isInline onClick={() => (retryHandler ? retryHandler(uuid) : null)}>
          Retry
        </Button>
      </ConditionalTooltip>
    </Flex>
  );
};

const StatusIcon = ({
  rowData: {
    uuid,
    status,
    failed_introspections_count: failedIntrospectionsCount,
    last_introspection_time: lastIntrospectionTime,
    last_introspection_error: error,
    last_snapshot_task,
  },
  retryHandler,
}: Props) => {
  const classes = useStyles();

  const showError = (snapshotError: string | undefined, introspectError: string | undefined) => {
    if (!snapshotError && !introspectError) {
      return 'An unknown error occurred.';
    } else if (snapshotError) {
      return `A snapshot error occurred: ${snapshotError}`;
    } else if (introspectError) {
      return `An introspection error occurred: ${introspectError}`;
    }
  };

  switch (status) {
    case 'Valid':
      return (
        <Flex
          key={`${status}_${uuid}`}
          alignContent={{ default: 'alignContentCenter' }}
          direction={{ default: 'row' }}
        >
          <FlexItem spacer={{ default: 'spacerSm' }}>
            <CheckCircleIcon color={green} />
          </FlexItem>
          <FlexItem>
            <StatusText color='green'>Valid</StatusText>
          </FlexItem>
        </Flex>
      );
    case 'Invalid':
      return (
        <Flex
          key={`${status}_${uuid}`}
          alignContent={{ default: 'alignContentCenter' }}
          direction={{ default: 'row' }}
        >
          <FlexItem spacer={{ default: 'spacerSm' }}>
            <ExclamationCircleIcon color={red} />
          </FlexItem>
          <FlexItem>
            <Popover
              aria-label='invalid popover'
              alertSeverityVariant='danger'
              headerContent='Invalid'
              headerIcon={<ExclamationCircleIcon />}
              bodyContent={
                <PopoverDescription
                  error={showError(last_snapshot_task?.error, error)}
                  count={failedIntrospectionsCount}
                  time={lastIntrospectionTime}
                />
              }
              position='left'
              footerContent={<PopoverFooter retryHandler={retryHandler} uuid={uuid} />}
            >
              <Button variant='link' isInline>
                <StatusText color='red' isLink>
                  Invalid
                </StatusText>
              </Button>
            </Popover>
          </FlexItem>
        </Flex>
      );
    case 'Unavailable':
      return (
        <Flex
          key={`${status}_${uuid}`}
          alignContent={{ default: 'alignContentCenter' }}
          direction={{ default: 'row' }}
        >
          <FlexItem spacer={{ default: 'spacerSm' }}>
            <ExclamationTriangleIcon color={gold} />
          </FlexItem>
          <FlexItem>
            <Popover
              aria-label='unavailable popover'
              alertSeverityVariant='warning'
              headerContent='Unavailable'
              headerIcon={<ExclamationTriangleIcon />}
              bodyContent={
                <PopoverDescription
                  error={showError(last_snapshot_task?.error, error)}
                  count={failedIntrospectionsCount}
                  time={lastIntrospectionTime}
                />
              }
              position='left'
              footerContent={<PopoverFooter retryHandler={retryHandler} uuid={uuid} />}
            >
              <StatusText color='gold' isLink>
                Unavailable
              </StatusText>
            </Popover>
          </FlexItem>
        </Flex>
      );
    case 'Pending':
      return (
        <Tooltip
          position='top-start'
          content={
            last_snapshot_task?.status === 'running' || last_snapshot_task?.status === 'pending'
              ? 'Repository snapshot in progress'
              : 'Repository introspection in progress'
          }
        >
          <Flex
            key={`${status}_${uuid}`}
            alignContent={{ default: 'alignContentCenter' }}
            direction={{ default: 'row' }}
          >
            <FlexItem spacer={{ default: 'spacerSm' }}>
              <Spinner size='md' className={classes.spinner} />
            </FlexItem>
            <FlexItem>
              <StatusText color='blue'>In progress</StatusText>
            </FlexItem>
          </Flex>
        </Tooltip>
      );
    default:
      return <></>;
  }
};

export default StatusIcon;
