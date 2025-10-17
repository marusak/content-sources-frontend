import { Grid } from '@patternfly/react-core';
import { SecurityIcon } from '@patternfly/react-icons';
import {
  c_alert_m_warning__icon_Color,
  c_alert_m_danger__icon_Color,
  t_color_orange_50,
  t_color_gray_50,
} from '@patternfly/react-tokens';

import { createUseStyles } from 'react-jss';

const useStyles = (color: string) => {
  let finalColor = 'initial';
  switch (color) {
    case 'critical':
      finalColor = c_alert_m_danger__icon_Color.value;
      break;
    case 'important':
      finalColor = t_color_orange_50.value;
      break;
    case 'moderate':
      finalColor = c_alert_m_warning__icon_Color.value;
      break;
    case 'low':
      finalColor = t_color_gray_50.value;
      break;
    default:
      break;
  }

  return createUseStyles({
    iconColor: {
      fill: finalColor,
      marginRight: '4px',
    },
    wrapper: {
      display: 'inline-flex',
      alignItems: 'center',
    },
  });
};

interface Props {
  severity: string;
}

const severityTypes = new Set(['critical', 'important', 'moderate', 'low']);

export default function SeverityWithIcon({ severity }: Props) {
  const loweredSeverity = severity?.toLowerCase();
  const classes = useStyles(loweredSeverity)();

  const isOther = !severityTypes.has(loweredSeverity);

  return (
    <Grid className={classes.wrapper}>
      {isOther ? null : <SecurityIcon className={classes.iconColor} />} {severity}
    </Grid>
  );
}
