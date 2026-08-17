import { useState } from 'react';
import {
  Button,
  Content,
  FileUpload as PFFileUpload,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  TextInput,
} from '@patternfly/react-core';

import type { Vulnerability } from '../../mockVulnerabilities';
import { convertToVulnerabilities, parseVulnCsv, type ParsedVulnRow } from '../utils/vulnCsvParser';

type VulnFileUploadProps = {
  onBatchCreated: (name: string, vulnerabilities: Vulnerability[]) => void;
};

export function VulnFileUpload({ onBatchCreated }: VulnFileUploadProps) {
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedVulnRow[] | null>(null);
  const [batchName, setBatchName] = useState('');

  const handleFileInputChange = (_event: unknown, file: File) => {
    setFilename(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseVulnCsv(content);
      setParsedRows(rows);
      setIsLoading(false);
      setBatchName(file.name.replace(/\.[^.]+$/, ''));
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setFilename('');
    setParsedRows(null);
    setBatchName('');
  };

  const handleCreateBatch = () => {
    if (!parsedRows || !batchName) return;
    const batchId = `batch-${Date.now()}`;
    const vulns = convertToVulnerabilities(parsedRows, batchId);
    onBatchCreated(batchName, vulns);
    handleClear();
  };

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
      <FlexItem>
        <PFFileUpload
          id='vuln-file-upload'
          type='text'
          filename={filename}
          filenamePlaceholder='Upload a vulnerability CSV file'
          onFileInputChange={handleFileInputChange}
          onClearClick={handleClear}
          isLoading={isLoading}
          browseButtonText='Choose CSV'
          hideDefaultPreview
        />
      </FlexItem>
      {parsedRows && (
        <FlexItem>
          <Label color='green' isCompact>
            &#10003; Parsed {parsedRows.length} vulnerabilities
          </Label>
        </FlexItem>
      )}
      {parsedRows && parsedRows.length > 0 && (
        <FlexItem>
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsFlexEnd' }}>
            <FlexItem>
              <FormGroup label='Batch name' fieldId='batch-name'>
                <TextInput
                  id='batch-name'
                  value={batchName}
                  onChange={(_e, val) => setBatchName(val)}
                  placeholder='e.g., Customer Q3 Submission'
                />
              </FormGroup>
            </FlexItem>
            <FlexItem>
              <Button variant='primary' onClick={handleCreateBatch} isDisabled={!batchName}>
                Create Batch
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
      )}
      <FlexItem>
        <Content component='small' className='lightwell-file-formats'>
          Expected format: vulnerability_id, purl, component_name, component_version, title, CWE,
          description, severity, cvss
        </Content>
      </FlexItem>
    </Flex>
  );
}
