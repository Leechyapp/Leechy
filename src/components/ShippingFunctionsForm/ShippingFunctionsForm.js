import React from 'react';
import FileDropzone from '../FileDropzone/FileDropzone';
import css from './ShippingFunctionsForm.module.scss';
import FileAttachmentsWrapper from '../FileAttachmentsWrapper/FileAttachmentsWrapper';

const ShippingFunctionsForm = props => {
  const { fileAttachments, setFileAttachments } = props;

  const onShowUploadFilesModal = show => {};

  const onDeleteFile = index => {
    const fileAttachmentsUpdated =
      fileAttachments && fileAttachments.length > 0 ? [...fileAttachments] : new Array();
    fileAttachmentsUpdated.splice(index, 1);
    setFileAttachments(fileAttachmentsUpdated);
  };

  const onDownloadPreviewFile = (dataurl, filename) => {
    const link = document.createElement('a');
    link.href = dataurl;
    link.download = filename;
    link.click();
  };

  return (
    <div className={css.row}>
      <div className={css.col12}>
        <FileDropzone
          fileAttachments={fileAttachments}
          setFileAttachments={setFileAttachments}
          onShowUploadFilesModal={onShowUploadFilesModal}
        />
      </div>
      <div className={css.col12}>
        <FileAttachmentsWrapper fileAttachments={fileAttachments} onDeleteFile={onDeleteFile} />
      </div>
      <div className={css.col12}></div>
    </div>
  );
};

export default ShippingFunctionsForm;
