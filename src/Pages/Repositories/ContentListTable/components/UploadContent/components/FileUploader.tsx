import { useEffect, useMemo, useState } from 'react';
import {
  MultipleFileUpload,
  MultipleFileUploadMain,
  MultipleFileUploadStatus,
  Progress,
  Tooltip,
  type DropEvent,
} from '@patternfly/react-core';
import UploadStatusItem from './UploadStatusItem';
import StatusIcon from 'Pages/Repositories/AdminTaskTable/components/StatusIcon';
import {
  BATCH_SIZE,
  getFileChecksumSHA256,
  MAX_CHUNK_SIZE,
  MAX_RETRY_COUNT,
  type Chunk,
  type FileInfo,
} from './helpers';
import { createUseStyles } from 'react-jss';
import { createUpload, uploadChunk } from 'services/Content/ContentApi';
import Loader from 'components/Loader';
import { DownloadIcon, FileIcon, UploadIcon } from '@patternfly/react-icons';
import useDebounce from 'Hooks/useDebounce';
import { useParams } from 'react-router-dom';
import { useFetchContent, useGetSnapshotList } from 'services/Content/ContentQueries';

const useStyles = createUseStyles({
  mainDropzone: {
    width: '625px',
    minHeight: '103px',
  },
  pointer: {
    '&:hover': { cursor: 'pointer' },
  },
  filUploadStatus: {
    '& button': {
      alignItems: 'center', // Fixes dropdown and text alignment
    },
  },
});

interface Props {
  setFileUUIDs: React.Dispatch<
    React.SetStateAction<{ sha256: string; uuid: string; href: string }[]>
  >;
  isLoading: boolean;
  setChildLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function FileUploader({ setFileUUIDs, isLoading, setChildLoading }: Props) {
  const classes = useStyles();
  const { repoUUID: uuid } = useParams();
  const [currentFiles, setCurrentFiles] = useState<Record<string, FileInfo>>({});
  const [isBatching, setIsBatching] = useState(false);
  const [isHashing, setisHashing] = useState(false);

  const {
    data: repositoryData,
    isLoading: isLoadingRepo,
    refetch: refetchRepo,
  } = useFetchContent(uuid!, !!uuid);

  const {
    data: snapshotData,
    isLoading: isLoadingSnapshots,
    refetch: refetchSnapshots,
  } = useGetSnapshotList(uuid!, 1, 1, '');

  // determine whether repository is ready for rpms (status is Valid OR has at least one snapshot)
  const isRepoReady = useMemo(() => {
    if (isLoadingRepo || isLoadingSnapshots) return false;
    const hasValidStatus = repositoryData?.status === 'Valid';
    const hasSnapshots = (snapshotData?.data?.length ?? 0) > 0;
    return hasValidStatus || hasSnapshots;
  }, [repositoryData?.status, snapshotData?.data?.length, isLoadingRepo, isLoadingSnapshots]);

  const isCheckingRepoStatus = isLoadingRepo || isLoadingSnapshots;

  // poll every 10 seconds for repository status and snapshots if not ready
  useEffect(() => {
    if (!uuid || isRepoReady || isCheckingRepoStatus) return;

    const intervalId = setInterval(() => {
      refetchRepo();
      refetchSnapshots();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [uuid, isRepoReady, isCheckingRepoStatus, refetchRepo, refetchSnapshots]);

  const [fileCountGreaterThanZero, fileCount, completedCount, failedCount, hasRetrying] = useMemo(
    () => [
      // showStatus
      !!Object.values(currentFiles).length,
      // fileCount
      Object.values(currentFiles).length,
      // completedCount
      Object.values(currentFiles).filter(({ completed }) => completed).length,
      // failedCount
      Object.values(currentFiles).filter(({ failed }) => failed).length,
      // hasAnyfilesBeingRetried
      Object.values(currentFiles).some(({ isRetrying }) => isRetrying),
    ],
    [currentFiles],
  );

  useEffect(() => {
    if (completedCount === fileCount) {
      // This means we are in a good state to allow the parent to continue
      const items = Object.values(currentFiles).map(({ uuid, checksum, artifact }) => ({
        sha256: checksum,
        uuid,
        href: artifact,
      }));

      setFileUUIDs(items);
    }
  }, [completedCount, fileCount]);

  const isLoadingForParent = useDebounce(isBatching || isHashing || hasRetrying, 200);

  useEffect(() => {
    setChildLoading(isLoadingForParent);
  }, [isLoadingForParent]);

  const updateItem = async (name: string) => {
    if (currentFiles[name]) {
      const targetIndexes = new Set(
        currentFiles[name].chunks
          .map(({ queued, completed }, index) => ({ index, queued, completed }))
          .filter(({ queued, completed }) => !completed && !queued)
          .map(({ index }) => index),
      );

      while (targetIndexes.size > 0 && !currentFiles[name]?.failed) {
        const itemsForBatch = [...targetIndexes].slice(0, BATCH_SIZE);
        const result = await Promise.all(
          itemsForBatch.map(async (targetIndex) => {
            if (!currentFiles[name]?.chunks[targetIndex]) return;
            const { start, end, chunkRange, sha256, slice } =
              currentFiles[name].chunks[targetIndex];
            currentFiles[name].chunks[targetIndex].queued = true;
            setCurrentFiles((prev) => ({ ...prev, [name]: currentFiles[name] }));

            try {
              const [promise, abort] = uploadChunk({
                chunkRange: chunkRange,
                created: currentFiles[name].created,
                sha256,
                file: slice,
                upload_uuid: currentFiles[name].uuid,
              });

              setCurrentFiles((prev) => {
                prev[name].chunks[targetIndex].cancel = abort;
                return { ...prev, [name]: prev[name] };
              });

              await promise;

              targetIndexes.delete(targetIndex);
              setCurrentFiles((prev) => {
                if (targetIndexes.size === 0) {
                  prev[name].completed = true;
                }
                prev[name].chunks[targetIndex].completed = true;
                return { ...prev, [name]: prev[name] };
              });
            } catch (_error) {
              setCurrentFiles((prev) => {
                prev[name].chunks[targetIndex].retryCount += 1;
                prev[name].chunks[targetIndex].queued = false;
                return { ...prev, [name]: prev[name] };
              });

              if (currentFiles[name].chunks[targetIndex].retryCount > MAX_RETRY_COUNT) {
                return `Failed to upload chunk: ${start} to ${end}`;
              }

              return (_error as Error).message;
            }
          }),
        );

        const failedMessage = result.find((val) => val);
        if (failedMessage) {
          currentFiles[name].error = failedMessage;
          currentFiles[name].failed = true;
          currentFiles[name].completed = false;
          setCurrentFiles((prev) => ({ ...prev, [name]: currentFiles[name] }));
          targetIndexes.clear();
        }
      }
    }
  };

  useEffect(() => {
    if (!isBatching && !isHashing) {
      setIsBatching(true);
      const allDownloads = Object.keys(currentFiles).filter(
        (name) =>
          !currentFiles[name].completed &&
          !currentFiles[name].failed &&
          currentFiles[name].chunks.some((chunk) => !chunk.queued),
      );
      const underBatchSize = allDownloads.filter(
        (name) => currentFiles[name].file.size < MAX_CHUNK_SIZE,
      );
      const overBatchSize = allDownloads.filter(
        (name) => currentFiles[name].file.size >= MAX_CHUNK_SIZE,
      );
      (async () => {
        while (underBatchSize.length) {
          const batch = underBatchSize.splice(0, BATCH_SIZE);
          await Promise.all(batch.map((name) => updateItem(name)));
        }

        for (let index = 0; index < overBatchSize.length; index++) {
          const name = overBatchSize[index];
          await updateItem(name);
        }
        setIsBatching(false);
      })();
    }
  }, [fileCount, completedCount, failedCount, isBatching, isHashing]);

  const storeFileInfoForUpdate = async (file: File) => {
    const totalCount =
      file.size % MAX_CHUNK_SIZE == 0
        ? file.size / MAX_CHUNK_SIZE
        : Math.floor(file.size / MAX_CHUNK_SIZE) + 1;

    let chunks: Chunk[] = [];

    for (let index = 0; index < totalCount; index++) {
      const start = index ? index * MAX_CHUNK_SIZE : 0;
      let end = (index + 1) * MAX_CHUNK_SIZE - 1;
      if (index === totalCount - 1) {
        end = file.size - 1;
      }

      const chunkRange = `bytes ${start}-${end}/${file.size}`;
      const slice = file.slice(start, end + 1);

      chunks.push({
        slice,
        start,
        end,
        queued: false,
        completed: false,
        retryCount: 0,
        sha256: await getFileChecksumSHA256(new File([slice], file.name + chunkRange)),
        chunkRange,
      });
    }

    let checksum: string = '';
    let error: string | undefined = undefined;

    try {
      checksum = await getFileChecksumSHA256(file);
    } catch (err) {
      error = 'Failed checksum validation: ' + (err as Error).message;
    }

    let uuid: string = '';
    let created: string = '';
    let artifact: string = '';
    let completedChunkChecksums = new Set<string>();
    if (!error) {
      try {
        const res = await createUpload(file.size, checksum);
        if (res.upload_uuid) uuid = res.upload_uuid;
        if (res.created) created = res.created;
        if (res.completed_checksums)
          completedChunkChecksums = new Set<string>(res.completed_checksums);
        if (res.artifact_href) artifact = res.artifact_href;
      } catch (err) {
        error = 'Failed to create upload file: ' + (err as Error).message;
      }
    }

    chunks = chunks.map((chunk) => ({
      ...chunk,
      completed: !!artifact || completedChunkChecksums.has(chunk.sha256),
    }));

    setCurrentFiles((prev) => {
      prev[file.name] = {
        uuid,
        artifact,
        created,
        chunks,
        file,
        checksum,
        error,
        failed: !!error,
        completed: !!artifact || chunks.every(({ completed }) => completed),
        isResumed: chunks.some(({ completed }) => completed),
      };

      return { ...prev };
    });
  };

  const handleFileDrop = async (_: DropEvent | undefined, droppedFiles: File[]) => {
    setisHashing(true);
    if (currentFiles.length) {
      const droppedFileNames = droppedFiles.map(({ name }) => name);

      droppedFileNames.forEach((name) => {
        removeItem(name);
      });
    }

    await Promise.all(droppedFiles.map((file) => storeFileInfoForUpdate(file)));
    setisHashing(false);
  };

  const retryItem = async (name: string) => {
    if (!currentFiles[name]) return;
    // If there is no uuid, we know that the checksum or upload failed
    if (!currentFiles[name].uuid) {
      return handleFileDrop(undefined, [currentFiles[name].file]);
    }
    setCurrentFiles((prev) => ({ ...prev, [name]: { ...prev[name], isRetrying: true } }));
    try {
      // First get the currently finished chunks/check if item is already done (artifact_href).
      const res = await createUpload(currentFiles[name].file.size, currentFiles[name].checksum);
      if (res.upload_uuid) currentFiles[name].uuid = res.upload_uuid;
      if (res.created) currentFiles[name].created = res.created;
      if (res.artifact_href) {
        currentFiles[name].artifact = res.artifact_href;
      }
      if (res.completed_checksums) {
        const completedChunkChecksums = new Set<string>(res.completed_checksums);
        currentFiles[name].chunks = currentFiles[name].chunks.map((chunk) => ({
          ...chunk,
          completed: !!currentFiles[name].artifact || completedChunkChecksums.has(chunk.sha256),
        }));
      }
    } catch (err) {
      return setCurrentFiles((prev) => {
        prev[name].error = 'Failed to create upload file: ' + (err as Error).message;
        prev[name].isRetrying = false;
        return { ...prev, [name]: prev[name] };
      });
    }

    currentFiles[name].error = ''; // Remove any previously existing error state
    currentFiles[name].failed = false; // Mark failed as false so it can be requed below.
    currentFiles[name].isRetrying = false;

    // If there is chunk failures (IE we stopped a previous upload)
    currentFiles[name].chunks = currentFiles[name].chunks.map((chunk) => ({
      ...chunk,
      retryCount: 0,
      // If Chunk is not completed, we know that it failed or was stopped, so we want to reset it to be requeued
      queued: chunk.completed,
    }));

    // If there is an artifact or if all chunks are completed, the file is completed
    currentFiles[name].completed =
      !!currentFiles[name].artifact || currentFiles[name].chunks.every((chunk) => chunk.completed);

    setCurrentFiles((prev) => ({ ...prev, [name]: currentFiles[name] }));
  };

  const removeItem = (name: string) => {
    if (!currentFiles[name]) return;
    if (currentFiles[name].error || currentFiles[name].completed) {
      setCurrentFiles((prev) => {
        delete prev[name];
        return { ...prev };
      });
    } else {
      setCurrentFiles((prev) => {
        prev[name].chunks = prev[name].chunks.map((chunk) => {
          if (!chunk.completed && chunk?.cancel) {
            chunk?.cancel();
            return { ...chunk, cancel: undefined, completed: false };
          }
          return chunk;
        });

        return { ...prev };
      });
    }
  };

  const uploadMainProps = useMemo(() => {
    switch (true) {
      case !isRepoReady:
        return {
          titleIcon: <StatusIcon status='running' removeText />,
          titleText: 'Checking repository status',
          infoText: 'Please wait until the repository is ready for uploads.',
          isUploadButtonHidden: true,
        };
      case isHashing:
        return {
          titleIcon: <StatusIcon status='running' removeText />,
          titleText: 'Calculating hash for each file',
          isUploadButtonHidden: true,
        };
      case completedCount + failedCount < fileCount:
        return {
          titleIcon: <StatusIcon status='running' removeText />,
          titleText: `Uploading files (${Math.round((completedCount / fileCount) * 100)}% completed)`,
          infoText: <Progress value={Math.round((completedCount / fileCount) * 100)} />,
          isUploadButtonHidden: true,
        };
      case fileCountGreaterThanZero && fileCount === completedCount:
        return {
          titleIcon: <StatusIcon status='completed' removeText />,
          titleText: 'All uploads completed!',
          infoText: 'Click "Confirm changes" below or continue to upload more files.',
        };
      case fileCountGreaterThanZero && completedCount + failedCount === fileCount:
        return {
          titleIcon: <StatusIcon status='failed' removeText />,
          titleText: `${failedCount} of ${fileCount} files failed to uploaded`,
          infoText: 'Retry, re-upload, or remove the failed items below before continuing.',
        };
      default:
        return {
          titleIcon: <UploadIcon />,
          titleText: 'Drag and drop files here or click "Upload" to get started',
          infoText: 'Accepted file types: .rpm',
        };
    }
  }, [
    isCheckingRepoStatus,
    isHashing,
    fileCountGreaterThanZero,
    fileCount,
    completedCount,
    failedCount,
    isRepoReady,
  ]);

  const actionOngoing = uploadMainProps.isUploadButtonHidden;
  const isUploadDisabled = actionOngoing || !isRepoReady || isCheckingRepoStatus;
  if (isLoading) return <Loader minHeight='20vh' />;

  return (
    <MultipleFileUpload
      onFileDrop={handleFileDrop}
      dropzoneProps={{
        disabled: isUploadDisabled,
        maxSize: 16242783756,
        accept: {
          'application/x-rpm': ['.rpm'],
        },
      }}
      isHorizontal
    >
      <MultipleFileUploadMain
        className={classes.mainDropzone}
        {...uploadMainProps}
        data-ouia-component-id='upload-button'
      />
      {fileCountGreaterThanZero && (
        <MultipleFileUploadStatus
          statusToggleText={`${completedCount} of ${fileCount} files are ready to be added to the repository${failedCount ? `, ${failedCount} failed` : ''}`}
          // statusToggleIcon={statusIcon}
          className={classes.filUploadStatus}
        >
          {Object.values(currentFiles)
            .reverse()
            .map(({ checksum, isRetrying, chunks, error, file, failed, artifact, isResumed }) => {
              const completedChunks = chunks.filter(({ completed }) => completed).length;
              const progressValue = Math.round((completedChunks / chunks.length) * 100);

              return (
                <UploadStatusItem
                  fileSize={file.size}
                  key={file.name}
                  fileName={file.name}
                  fileIcon={
                    !!artifact || isResumed ? (
                      <Tooltip
                        key={file.name}
                        content='An identical file was previously uploaded, data has been reused.'
                      >
                        <DownloadIcon tabIndex={-1} className={classes.pointer} />
                      </Tooltip>
                    ) : (
                      <Tooltip
                        key={file.name}
                        content="This file will be uploaded in chunks and added to your repository when you click 'Confirm changes' below."
                      >
                        <FileIcon tabIndex={-1} className={classes.pointer} />
                      </Tooltip>
                    )
                  }
                  progressVariant={(() => {
                    switch (true) {
                      case failed:
                        return 'danger';
                      case progressValue >= 100:
                        return 'success';
                      default:
                        break;
                    }
                  })()}
                  retry={checksum && !isRetrying ? () => retryItem(file.name) : undefined}
                  progressHelperText={error}
                  progressValue={progressValue}
                  hideClearButton={isHashing}
                  onClearClick={() => removeItem(file.name)}
                />
              );
            })}
        </MultipleFileUploadStatus>
      )}
    </MultipleFileUpload>
  );
}
