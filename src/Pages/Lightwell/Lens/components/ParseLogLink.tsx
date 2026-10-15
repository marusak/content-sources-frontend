import { useState } from 'react';
import { Button } from '@patternfly/react-core';
import { downloadCoverageParseLog } from 'services/Lightwell/CoverageReportsApi';

const ParseLogLink = ({ uuid }: { uuid: string }) => {
  const [failed, setFailed] = useState(false);

  return (
    <span>
      <Button
        variant='link'
        isInline
        onClick={() => {
          setFailed(false);
          downloadCoverageParseLog(uuid).catch(() => setFailed(true));
        }}
      >
        Download parser log
      </Button>
      {failed ? ' The parser log could not be downloaded.' : null}
    </span>
  );
};

export default ParseLogLink;
