import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import css from './FileDropzone.module.scss';
import { FormattedMessage } from 'react-intl';
import { MIME_TYPE_JPG, MIME_TYPE_PNG } from '../../util/types';

const MAX_SIZE = 5242880;
const MAX_FILES = 5;

const FileDropzone = props => {
  const { fileAttachments, setFileAttachments, onShowUploadFilesModal } = props;

  const [maxFilesExceededError, setMaxFilesExceeded] = useState();

  const onReadFile = file => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener(
        'load',
        function() {
          resolve(reader.result);
        },
        false
      );
      reader.onerror = error => {
        console.log(error);
        return reject(this);
      };
      reader.readAsDataURL(file);
    });
  };

  const onImageUploadHandler = async file => {
    if (file) {
      file.dataUrl = await onReadFile(file);
      return file;
    }
  };

  const onDrop = useCallback(async acceptedFiles => {
    if (acceptedFiles.length > MAX_FILES) {
      setMaxFilesExceeded(`Maximum allowed files is ${MAX_FILES}.`);
      return;
    }
    const fileAttachmentsUpdated = Object.assign(new Array(), fileAttachments);
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = await onImageUploadHandler(acceptedFiles[i]);
      if (fileAttachmentsUpdated.length < MAX_FILES) {
        fileAttachmentsUpdated.push(file);
      }
    }
    setFileAttachments(fileAttachmentsUpdated);
    onShowUploadFilesModal(false);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      [MIME_TYPE_JPG]: ['.jpeg', '.png', '.jpg'],
      [MIME_TYPE_PNG]: ['.png'],
    },
    maxSize: MAX_SIZE,
  });

  return (
    <>
      <div className={css.dropZone} {...getRootProps()}>
        <input {...getInputProps()} />
        <span className={css.chooseFilesText}>
          <span className={css.chooseFile}>
            <FormattedMessage id="FileDropzone.dragAndDropFiles" />
          </span>
          <span className={css.fileTypes}>
            <FormattedMessage id="FileDropzone.fileTypes" />
          </span>
        </span>
      </div>
      {maxFilesExceededError && <p>{maxFilesExceededError}</p>}
    </>
  );
};

export default FileDropzone;
