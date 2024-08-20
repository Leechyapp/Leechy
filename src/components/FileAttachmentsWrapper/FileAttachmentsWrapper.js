import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './FileAttachmentsWrapper.module.scss';

const FileAttachmentsWrapper = props => {
  const { fileAttachments, handleCarouselOpen, onDeleteFile } = props;
  return (
    <div className={css.rowUnsetMarginLR}>
      {fileAttachments.map((file, index) => {
        return (
          <div className={css.col12}>
            <div className={css.imageWrapper}>
              <a onClick={() => handleCarouselOpen(file)}>
                <img className={css.image} src={file.dataUrl} />
              </a>
              <span onClick={() => onDeleteFile(index)} className={css.deleteIcon}>
                <FontAwesomeIcon icon={'fa-solid fa-circle-xmark'} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileAttachmentsWrapper;
