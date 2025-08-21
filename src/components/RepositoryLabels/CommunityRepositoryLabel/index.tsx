import { Label, Tooltip } from '@patternfly/react-core';
import { RepositoryIcon } from '@patternfly/react-icons';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  uploadIcon: {
    marginLeft: '8px',
  },
});

const CommunityRepositoryLabel = () => {
  const classes = useStyles();
  return (
    <Tooltip content='Community repository: This EPEL repository is shared across organizations.'>
      <Label variant='outline' isCompact icon={<RepositoryIcon />} className={classes.uploadIcon}>
        Community
      </Label>
    </Tooltip>
  );
};

export default CommunityRepositoryLabel;
