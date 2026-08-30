import {
  Button,
  Card,
  CardBody,
  Content,
  FileUpload,
  FileUploadHelperText,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ErrorState } from '@patternfly/react-component-groups';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import type { MouseEventHandler } from 'react';
import type { FileUploadStatus } from '../hooks/useCoverageAnalysis';
import ManifestFormatPopover from './ManifestFormatPopover';

export type ManifestUploadCardProps = {
  isLoading: boolean;
  file?: File;
  fileError?: string;
  processError?: string;
  validated: FileUploadStatus;
  onDropAccepted: (files: File[]) => void;
  onClearClick: MouseEventHandler<HTMLButtonElement>;
  onRetry: () => void;
};

const ManifestUploadCard = ({
  isLoading,
  file,
  fileError,
  processError,
  validated,
  onDropAccepted,
  onClearClick,
  onRetry,
}: ManifestUploadCardProps) => (
  <Card isGlass>
    {processError ? (
      <CardBody className={spacing.p_2xl}>
        <ErrorState
          titleText={processError}
          bodyText='Please try again'
          customFooter={
            <Button variant='primary' onClick={onRetry}>
              Reupload file
            </Button>
          }
        />
      </CardBody>
    ) : isLoading ? (
      <CardBody className={spacing.p_2xl}>
        <Flex
          direction={{ default: 'column' }}
          gap={{ default: 'gapMd' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Flex
              direction={{ default: 'column' }}
              gap={{ default: 'gapSm' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              <FlexItem>
                <Spinner size='lg' aria-label='Analyzing your manifest' />
              </FlexItem>
              <FlexItem>
                <Title headingLevel='h3' size='md'>
                  Analyzing your manifest...
                </Title>
              </FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Content component='p'>
              Matching packages against the Lightwell Network catalog.
            </Content>
          </FlexItem>
        </Flex>
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

export default ManifestUploadCard;
