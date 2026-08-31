import { useState, useEffect } from 'react';
import {
  useCreateCoverageReportMutation,
  useCoverageReportQuery,
} from 'services/Lightwell/CoverageReportsQueries';
import { validateManifestFile, getMaxFileSizeMB, toBytes } from '../utils/validateManifestFile';
import type { CompletedCoverageReport } from 'services/Lightwell/CoverageReportsApi';
import { LIGHTWELL_LENS_USE_MOCK } from 'Pages/Lightwell/constants';
import { MOCK_ANALYSIS } from '../../mockCoverageAnalysis';
import type { ManifestUploadCardProps } from '../components/ManifestUploadCard';
import { apiError, taskError, timeoutError, type ProcessError } from '../utils/errors';

export type ProcessStep = 'select' | 'uploading' | 'analyzing' | 'complete' | 'error';

const POLLING_RETRY_LIMIT = 40;

export const useCoverageAnalysis = () => {
  if (LIGHTWELL_LENS_USE_MOCK) return MOCK_ANALYSIS;

  const [step, setStep] = useState<ProcessStep>('select');
  const [file, setFile] = useState<File | undefined>();
  const [reportUUID, setReportUUID] = useState('');
  const [fileError, setFileError] = useState<string | undefined>();
  const [processError, setProcessError] = useState<ProcessError | undefined>();
  const [pollCount, setPollCount] = useState(0);

  const isPolling = step === 'analyzing' && pollCount <= POLLING_RETRY_LIMIT;
  const createReport = useCreateCoverageReportMutation();
  const { data: report, isError: isFetchError } = useCoverageReportQuery(reportUUID, isPolling);

  useEffect(() => {
    if (step !== 'analyzing') return;
    setPollCount((count) => count + 1);

    if (!report) return;
    if (report.status === 'completed') {
      setStep('complete');
    } else if (report.status === 'failed') {
      setProcessError(taskError(report.analysis_task_error));
      setStep('error');
    }
  }, [report, step]);

  useEffect(() => {
    if (pollCount > POLLING_RETRY_LIMIT) {
      setProcessError(timeoutError());
      setStep('error');
      return;
    }
    if (isFetchError) {
      setProcessError(apiError('fetch'));
      setStep('error');
    }
  }, [pollCount, isFetchError]);

  // Uses dropzoneProps.onDropAccepted instead of onFileInputChange to avoid a PF bug
  // where onFileInputChange fires twice when selecting a file via the browser dialog
  const handleFileAccepted = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    const limitMB = getMaxFileSizeMB(selectedFile.name);
    if (selectedFile.size > toBytes(limitMB)) {
      setFileError(`File exceeds the ${limitMB} MB size limit. Please try a smaller file.`);
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
        if (data.uuid) {
          setReportUUID(data.uuid);
        }
        setStep('analyzing');
      },
      onError: () => {
        setProcessError(apiError('upload'));
        setStep('error');
      },
    });
  };

  const startOver = () => {
    setStep('select');
    setFile(undefined);
    setReportUUID('');
    setFileError(undefined);
    setProcessError(undefined);
    setPollCount(0);
  };

  const completedReport: CompletedCoverageReport | undefined =
    report?.status === 'completed' ? report : undefined;

  const uploadProps: ManifestUploadCardProps = {
    file,
    fileError,
    processError,
    step,
    reportUUID,
    onDropAccepted: handleFileAccepted,
    onRetry: startOver,
  };

  return {
    filename: file?.name,
    report: completedReport,
    uploadProps,
    startOver,
  };
};
