import { Label, Tooltip } from '@patternfly/react-core';
import { UploadIcon } from '@patternfly/react-icons';
import { createUseStyles } from 'react-jss';

const useStyles = createUseStyles({
  uploadIcon: {
    marginLeft: '8px',
  },
});

const UploadRepositoryLabel = () => {
  const classes = useStyles();
  return (
    <Tooltip content='Upload repository: Snapshots will only be taken when new content is uploaded.'>
      <Label variant='outline' isCompact icon={<UploadIcon />} className={classes.uploadIcon}>
        Upload
      </Label>
    </Tooltip>
  );
};

export default UploadRepositoryLabel;
