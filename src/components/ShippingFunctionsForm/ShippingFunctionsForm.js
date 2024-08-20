import { useState } from 'react';
import FileDropzone from '../FileDropzone/FileDropzone';
import css from './ShippingFunctionsForm.module.scss';
import FileAttachmentsWrapper from '../FileAttachmentsWrapper/FileAttachmentsWrapper';

const ShippingFunctionsForm = props => {
  const [fileAttachments, setFileAttachments] = useState(new Array());

  const [showUploadFilesModal, setShowUploadFilesModal] = useState(false);

  const onShowUploadFilesModal = show => {
    setShowUploadFilesModal(show);
  };

  const onDeleteFile = index => {
    const { fileAttachments } = props;
    const fileAttachmentsUpdated =
      fileAttachments && fileAttachments.length > 0 ? [...fileAttachments] : new Array();
    fileAttachmentsUpdated.splice(index, 1);
    props.setFileAttachments(fileAttachmentsUpdated);
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
