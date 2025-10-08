import {
  Alert,
  Content,
  ContentVariants,
  DatePicker,
  ExpandableSection,
  Flex,
  FlexItem,
  Form,
  FormAlert,
  FormGroup,
  Grid,
  Radio,
  Title,
} from '@patternfly/react-core';
import { useAddTemplateContext } from '../AddTemplateContext';
import { useContentListQuery, useGetSnapshotsByDates } from 'services/Content/ContentQueries';
import { useEffect, useMemo } from 'react';
import Hide from 'components/Hide/Hide';
import { ContentOrigin } from 'services/Content/ContentApi';
import { formatDateForPicker, formatTemplateDate, isDateValid } from 'helpers';
import { createUseStyles } from 'react-jss';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';

const useStyles = createUseStyles({
  snapshotInfoText: {
    marginRight: '16px',
  },
  whatDoesItMean: {
    paddingTop: '16px',
  },
});

export default function SetUpDateStep() {
  const classes = useStyles();

  const { templateRequest, setTemplateRequest, selectedRedhatRepos, selectedCustomRepos } =
    useAddTemplateContext();

  const { data, mutateAsync } = useGetSnapshotsByDates(
    [...selectedRedhatRepos, ...selectedCustomRepos],
    formatTemplateDate(templateRequest?.date || ''),
  );

  useEffect(() => {
    setTemplateRequest({
      ...templateRequest,
      date: templateRequest.date ? formatDateForPicker(templateRequest.date) : '',
    });
  }, []);

  const dateValidators = [
    (date: Date) => {
      if (date.getTime() > Date.now()) {
        return 'Cannot set a date in the future';
      }
      return '';
    },
  ];

  const dateIsValid = useMemo(
    () => isDateValid(templateRequest?.date || ''),
    [templateRequest?.date],
  );

  useEffect(() => {
    if (
      templateRequest?.date &&
      dateIsValid &&
      [...selectedRedhatRepos, ...selectedCustomRepos].length
    ) {
      mutateAsync();
    }
  }, [selectedRedhatRepos.size, selectedCustomRepos.size, templateRequest?.date]);

  const itemsAfterDate = useMemo(
    () => data?.data?.filter(({ is_after }) => is_after) || [],
    [data?.data],
  );

  const hasIsAfter = itemsAfterDate.length > 0;

  const { isLoading, data: contentData = { data: [], meta: { count: 0, limit: 20, offset: 0 } } } =
    useContentListQuery(
      1,
      100,
      {
        uuids: itemsAfterDate.map(({ repository_uuid }) => repository_uuid),
      },
      '',
      [ContentOrigin.ALL],
    );

  return (
    <Grid hasGutter>
      <Title ouiaId='set_up_date' headingLevel='h1'>
        Set up date
      </Title>
      <Content component={ContentVariants.p}>
        This will include snapshots up to a specific date. Content of the snapshots created after
        the selected date will be displayed as applicable, not installable.
      </Content>
      <Title headingLevel='h3'>Select date for snapshotted repositories</Title>
      <Form>
        <FormGroup>
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapLg' }}>
            <FlexItem>
              <Radio
                id='use latest snapshot radio'
                ouiaId='use-latest-snapshot-radio'
                name='use-latest-snapshot'
                label='Use the latest content'
                description='Always use the latest content from repositories. Snapshots might be updated daily.'
                isChecked={templateRequest.use_latest}
                onChange={() => {
                  if (!templateRequest.use_latest) {
                    setTemplateRequest((prev) => ({ ...prev, use_latest: true, date: '' }));
                  }
                }}
              />
            </FlexItem>
            <FlexItem>
              <Radio
                id='use snapshot date radio'
                ouiaId='use-snapshot-date-radio'
                name='use-snapshot-date'
                label='Use up to a specific date'
                description='Includes repository changes up to this date.'
                isChecked={!templateRequest.use_latest}
                onChange={() => {
                  if (templateRequest.use_latest) {
                    setTemplateRequest((prev) => ({ ...prev, use_latest: false, date: '' }));
                  }
                }}
                className={spacing.mbSm}
              />
              <Hide hide={templateRequest.use_latest ?? false}>
                <DatePicker
                  id='use-snapshot-date-picker'
                  value={templateRequest.date ?? ''}
                  required={!templateRequest.use_latest}
                  requiredDateOptions={{ isRequired: !templateRequest.use_latest }}
                  style={{ paddingLeft: '20px' }}
                  validators={dateValidators}
                  popoverProps={{
                    position: 'right',
                    enableFlip: true,
                    flipBehavior: ['right', 'right-start', 'right-end', 'top-start', 'top'],
                  }}
                  onChange={(_, val) => {
                    setTemplateRequest((prev) => ({ ...prev, date: val }));
                  }}
                />
              </Hide>
            </FlexItem>
          </Flex>
        </FormGroup>
      </Form>
      <Hide hide={templateRequest.use_latest || !hasIsAfter || !dateIsValid}>
        <FormAlert>
          <Alert
            variant='warning'
            title='Selected date does not include the only snapshot of some selected repositories.'
            isInline
          >
            <Hide hide={isLoading}>
              {contentData.data?.reduce((acc, current, index, array) => {
                const { name } = current;
                if (index != 0 && index + 1 === array.length) {
                  acc += `and "${name}" `;
                } else if (array.length === 1 || index === array.length - 2) {
                  acc += `"${name}" `;
                } else {
                  acc += `"${name}", `;
                }

                if (index + 1 == array.length) {
                  acc += array.length === 1 ? 'repository ' : 'repositories ';
                  acc += 'will be included anyway.';
                }
                return acc;
              }, 'The snapshots of the ')}
            </Hide>
            <ExpandableSection
              toggleText='What does this mean?'
              aria-label='quickStart-expansion'
              data-ouia-component-id='quickstart_expand'
              className={classes.whatDoesItMean}
            >
              <Content>
                <Content component='ul'>
                  <Content component='li'>
                    No snapshots exist for these repositories on the specified date or before it.
                  </Content>
                  <Content component='li'>
                    The closest snapshots after that date will be used.
                  </Content>
                  <Content component='li'>
                    Depending on the repository and time difference, this could cause a dependency
                    issue.
                  </Content>
                </Content>
              </Content>
            </ExpandableSection>
          </Alert>
        </FormAlert>
      </Hide>
    </Grid>
  );
}
