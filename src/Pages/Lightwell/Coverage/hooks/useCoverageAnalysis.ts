import { useState, useEffect } from 'react';
import {
  useCreateCoverageReportMutation,
  useCoverageReportQuery,
} from 'services/Lightwell/CoverageReportsQueries';
import { validateManifestFile } from '../utils/validateManifestFile';
import type { CompletedCoverageReport } from 'services/Lightwell/CoverageReportsApi';
import { LIGHTWELL_LENS_USE_MOCK } from 'Pages/Lightwell/constants';
import { MOCK_ANALYSIS } from '../../mockCoverageAnalysis';

export type ProcessStep = 'select' | 'uploading' | 'analyzing' | 'complete' | 'error';
export type FileUploadStatus = 'success' | 'error' | 'default';

const POLLING_RETRY_LIMIT = 40;
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const useCoverageAnalysis = () => {
  if (LIGHTWELL_LENS_USE_MOCK) return MOCK_ANALYSIS;

  const [step, setStep] = useState<ProcessStep>('select');
  const [file, setFile] = useState<File | undefined>();
  const [reportUUID, setReportUUID] = useState('');
  const [fileError, setFileError] = useState<string | undefined>();
  const [processError, setProcessError] = useState<string | undefined>();
  const [pollCount, setPollCount] = useState(0);

  const isPolling = step === 'analyzing' && pollCount <= POLLING_RETRY_LIMIT;
  const createReport = useCreateCoverageReportMutation();
  const { data: report, isError: isPollingError } = useCoverageReportQuery(reportUUID, isPolling);

  useEffect(() => {
    if (step !== 'analyzing') return;
    setPollCount((count) => count + 1);

    if (!report) return;
    if (report.status === 'completed') {
      setStep('complete');
    } else if (report.status === 'failed') {
      setProcessError('Analysis could not be completed');
      setStep('error');
    }
  }, [report, step]);

  useEffect(() => {
    if (pollCount > POLLING_RETRY_LIMIT) {
      setProcessError('Analysis is taking longer than expected');
      setStep('error');
      return;
    }
    if (isPollingError) {
      setProcessError('Could not retrieve analysis results');
      setStep('error');
    }
  }, [pollCount, isPollingError]);

  // Uses dropzoneProps.onDropAccepted instead of onFileInputChange to avoid a PF bug
  // where onFileInputChange fires twice when selecting a file via the browser dialog
  const handleFileAccepted = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File exceeds the ${MAX_FILE_SIZE_MB}MB size limit. Please try a smaller file.`);
      setFile(selectedFile);
      return;
    }
    if (!validateManifestFile(selectedFile)) {
      setFileError('Could not detect format. Please check your file.');
      setFile(selectedFile);
      return;
    }
    setFileError(undefined);
    setFile(selectedFile);
    setStep('uploading');
    createReport.mutate(selectedFile, {
      onSuccess: (data) => {
        if (data.status === 'failed') {
          setProcessError('Could not start analysis');
          setStep('error');
          return;
        }
        setReportUUID(data.uuid);
        setStep('analyzing');
      },
      onError: () => {
        setProcessError('Could not upload your file');
        setStep('error');
      },
    });
  };

  const handleClearFile = () => {
    setStep('select');
    setFile(undefined);
    setFileError(undefined);
  };

  const startOver = () => {
    setStep('select');
    setFile(undefined);
    setReportUUID('');
    setFileError(undefined);
    setProcessError(undefined);
    setPollCount(0);
  };

  const validated: FileUploadStatus = fileError
    ? 'error'
    : file && step !== 'select' && step !== 'error'
      ? 'success'
      : 'default';

  const completedReport: CompletedCoverageReport | undefined =
    report?.status === 'completed' ? report : undefined;

  return {
    filename: file?.name,
    report: completedReport,
    uploadProps: {
      file,
      fileError,
      processError,
      validated,
      isLoading: step === 'uploading' || step === 'analyzing',
      onDropAccepted: handleFileAccepted,
      onClearClick: handleClearFile,
      onRetry: startOver,
    },
    startOver,
  };
};
