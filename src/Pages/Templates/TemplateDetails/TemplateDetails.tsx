import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  Grid,
  Label,
  LabelGroup,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { createUseStyles } from 'react-jss';
import { TEMPLATES_ROUTE } from 'Routes/constants';
import useRootPath from 'Hooks/useRootPath';
import { useFetchTemplate } from 'services/Templates/TemplateQueries';
import useArchVersion from 'Hooks/useArchVersion';
import DetailItem from './components/DetaiItem';
import Hide from 'components/Hide/Hide';
import { formatDateDDMMMYYYY } from 'helpers';
import Loader from 'components/Loader';
import TemplateActionDropdown from './components/TemplateActionDropdown';
import TemplateDetailsTabs from './components/TemplateDetailsTabs';

const useStyles = createUseStyles({
  fullHeight: {
    height: 'calc(100vh - 250px)',
  },
  topContainer: {
    padding: '16px 24px',
  },
  titleWrapper: {
    display: 'flex',
    flexDirection: 'row',
    padding: '24px 0',
    justifyContent: 'space-between',
  },
  labelGroup: {
    marginLeft: '8px',
  },
  descriptionMaxWidth: {
    maxWidth: '1600px',
  },
  childContainer: {
    margin: '24px',
  },
  detailItems: {
    '@media (min-width: 1400px)': {
      maxHeight: '165px',
    },
  },
  alertMargin: {
    marginTop: '20px',
  },
});

export default function TemplateDetails() {
  const classes = useStyles();
  const { templateUUID } = useParams();

  const rootPath = useRootPath();
  const navigate = useNavigate();

  const { data, isError, error, isLoading } = useFetchTemplate(templateUUID as string);

  const {
    isError: repositoryParamsIsError,
    isLoading: archVersionLoading,
    error: repositoryParamsError,
    archesDisplay,
    versionDisplay,
  } = useArchVersion();

  // Error is caught in the wrapper component
  if (isError) throw error;
  if (repositoryParamsIsError) throw repositoryParamsError;

  const navigateToTemplateList = () => navigate(rootPath + `/${TEMPLATES_ROUTE}`);

  if (isLoading || archVersionLoading) {
    return <Loader />;
  }

  return (
    <>
      <Grid className={classes.topContainer}>
        <Stack>
          <StackItem>
            <Breadcrumb ouiaId='template_details_breadcrumb'>
              <BreadcrumbItem component='button' onClick={navigateToTemplateList}>
                Templates
              </BreadcrumbItem>
              <BreadcrumbItem disabled>{data?.name}</BreadcrumbItem>
            </Breadcrumb>
          </StackItem>
          <StackItem className={classes.titleWrapper}>
            <Flex
              direction={{ default: 'row' }}
              justifyContent={{ default: 'justifyContentCenter' }}
            >
              <Title headingLevel='h1'>{data?.name}</Title>
              <LabelGroup className={classes.labelGroup}>
                <Label isCompact color='blue'>
                  {data?.version ? versionDisplay([data?.version]) : ''}
                </Label>
                <Label isCompact color='blue'>
                  {archesDisplay(data?.arch)}
                </Label>
              </LabelGroup>
            </Flex>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <TemplateActionDropdown />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </StackItem>
          <StackItem className={classes.descriptionMaxWidth}>
            <Flex
              direction={{ default: 'column' }}
              flexWrap={{ default: 'wrap' }}
              className={classes.detailItems}
            >
              <DetailItem title='Description:' value={data?.description} />
              <DetailItem
                title='Snapshot date'
                value={
                  data?.use_latest
                    ? 'Using latest content from repositories'
                    : data?.date
                      ? formatDateDDMMMYYYY(data.date)
                      : ''
                }
              />
              <DetailItem title='Created by:' value={data?.created_by} />
              <DetailItem
                title='Created:'
                value={data?.created_at ? formatDateDDMMMYYYY(data.created_at) : ''}
              />
              <DetailItem title='Last edited by:' value={data?.last_updated_by} />
              <DetailItem
                title='Last edited:'
                value={data?.updated_at ? formatDateDDMMMYYYY(data.updated_at) : ''}
              />
            </Flex>
          </StackItem>
          <Hide hide={!(data?.to_be_deleted_snapshots && data.to_be_deleted_snapshots.length > 0)}>
            <StackItem className={classes.alertMargin}>
              <Alert
                variant='warning'
                isInline
                title='Template contains soon to be deleted snapshots.'
              >
                This template contains snapshots that are going to be deleted in the next 14 days.
                At that time the template will be updated automatically to use the next available
                snapshot. Editing the template and selecting a more recent snapshot date will ensure
                the template does not change unexpectedly.
              </Alert>
            </StackItem>
          </Hide>
        </Stack>
      </Grid>
      <Grid className={classes.childContainer}>
        <TemplateDetailsTabs />
        <Outlet />
      </Grid>
    </>
  );
}
