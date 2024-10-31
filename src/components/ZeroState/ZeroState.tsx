import { Suspense } from 'react';
import {
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  Flex,
  FlexItem,
  Grid,
  PageSection,
  Spinner,
  Text,
  TextContent,
  Title,
} from '@patternfly/react-core';
import AsyncComponent from '@redhat-cloud-services/frontend-components/AsyncComponent';
import ErrorState from '@redhat-cloud-services/frontend-components/ErrorState';
import { createUseStyles } from 'react-jss';

import { useAppContext } from 'middleware/AppContext';
import { useHref, useNavigate } from 'react-router-dom';
import { POPULAR_REPOSITORIES_ROUTE, REPOSITORIES_ROUTE } from 'Routes/constants';

const useStyles = createUseStyles({
  contentZerostate: {
    minHeight: '100%',
    '& .bannerBefore': { maxHeight: '320px!important' },
    '& .bannerRight': { justifyContent: 'space-evenly!important' },
  },
  textContent: {
    minHeight: '40px',
  },
  removeBottomPadding: {
    paddingBottom: '0',
  },
});

export const ZeroState = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { setZeroState } = useAppContext();
  const path = useHref('content');
  const pathname = path.split('content')[0] + 'content';

  const handleMainButtonClick = () => {
    setZeroState(false);
  };

  const repoList = [
    {
      title: 'Red Hat repositories',
      description: 'Browse available Red Hat repositories to create RHEL images.',
      onClick: () => {
        setZeroState(false);
        navigate(`${pathname}/${REPOSITORIES_ROUTE}?origin=red_hat`);
      },
    },
    {
      title: 'Popular repositories',
      description: 'Add popular repositories with a single click.',
      onClick: () => {
        setZeroState(false);
        navigate(`${pathname}/${REPOSITORIES_ROUTE}/${POPULAR_REPOSITORIES_ROUTE}`);
      },
    },
  ];

  return (
    <>
      <Suspense
        fallback={
          <Bullseye>
            <Spinner size='xl' />
          </Bullseye>
        }
      >
        <Grid className={classes.contentZerostate}>
          <AsyncComponent
            appId='content_zero_state'
            appName='dashboard'
            module='./AppZeroState'
            scope='dashboard'
            ErrorComponent={<ErrorState />}
            app='Content_management'
            ouiaId='get_started_from_zerostate_description'
            customText='Get started with Insights by adding repositories'
            customSection={
              <PageSection className={classes.removeBottomPadding}>
                <Flex direction={{ default: 'row' }} gap={{ default: 'gap' }}>
                  {repoList.map(({ title, description, onClick }) => (
                    <FlexItem flex={{ default: 'flex_1' }} key={title}>
                      <Card>
                        <CardTitle>
                          <Title headingLevel='h3'>{title}</Title>
                        </CardTitle>
                        <CardBody>
                          <TextContent className={classes.textContent}>
                            <Text>{description}</Text>
                          </TextContent>
                          <Button onClick={onClick} variant='secondary' size='lg'>
                            Browse {title}
                          </Button>
                        </CardBody>
                      </Card>
                    </FlexItem>
                  ))}
                </Flex>
              </PageSection>
            }
            customButton={
              <Button
                id='get-started-repositories-button'
                ouiaId='get_started_repositories_button'
                className='pf-v5-u-p-md pf-v5-u-font-size-md'
                onClick={() => handleMainButtonClick()}
              >
                Add repositories now
              </Button>
            }
          />
        </Grid>
      </Suspense>
    </>
  );
};
