import {
  Card,
  CardBody,
  Content,
  FileUpload,
  FileUploadHelperText,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Title,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import type { MouseEventHandler } from 'react';
import ManifestFormatPopover from './ManifestFormatPopover';

import type { ProcessStep, FileUploadStatus } from '../hooks/useCoverageAnalysis';
import type { ProcessError } from '../utils/errors';
import AnalysisProgress from './AnalysisProgress';

export type ManifestUploadCardProps = {
  step: ProcessStep;
  reportUUID: string;
  file?: File;
  fileError?: string;
  processError?: ProcessError;
  validated: FileUploadStatus;
  onDropAccepted: (files: File[]) => void;
  onClearClick: MouseEventHandler<HTMLButtonElement>;
  onRetry: () => void;
};

const ManifestUploadCard = ({
  step,
  reportUUID,
  file,
  fileError,
  processError,
  validated,
  onDropAccepted,
  onClearClick,
  onRetry,
}: ManifestUploadCardProps) => {
  const showProgress = step === 'uploading' || step === 'analyzing' || !!processError;

  return (
    <Card isGlass>
      {showProgress ? (
        <CardBody className={spacing.p_2xl}>
          <AnalysisProgress
            step={step}
            reportUUID={reportUUID}
            processError={processError}
            onRetry={onRetry}
          />
        </CardBody>
      ) : (
        <CardBody className={spacing.pXl}>
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
            <FlexItem>
              <Flex gap={{ default: 'gapNone' }} alignItems={{ default: 'alignItemsCenter' }}>
                <FlexItem>
                  <Title headingLevel='h3' size='md'>
                    Select your manifest file
                  </Title>
                </FlexItem>
                <FlexItem>
                  <ManifestFormatPopover />
                </FlexItem>
              </Flex>
            </FlexItem>
            <FlexItem>
              <FileUpload
                browseButtonText='Choose file'
                id='coverage-file-upload'
                filenamePlaceholder='Drag and drop a file or choose one'
                hideDefaultPreview
                value={file}
                filename={file?.name}
                validated={validated}
                dropzoneProps={{ onDropAccepted }}
                onClearClick={onClearClick}
              >
                {fileError ? (
                  <FileUploadHelperText>
                    <HelperText>
                      <HelperTextItem variant='error'>{fileError}</HelperTextItem>
                    </HelperText>
                  </FileUploadHelperText>
                ) : null}
              </FileUpload>
            </FlexItem>
            <FlexItem>
              <Content component='small'>
                Supported formats: CSV, CycloneDX, SPDX, pom.xml, requirements.txt
              </Content>
            </FlexItem>
          </Flex>
        </CardBody>
      )}
    </Card>
  );
};

export default ManifestUploadCard;
