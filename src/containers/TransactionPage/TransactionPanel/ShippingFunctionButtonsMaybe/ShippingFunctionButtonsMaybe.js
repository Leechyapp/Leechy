import { useDispatch } from 'react-redux';
import { manageDisableScrolling } from '../../../../ducks/ui.duck';
import css from './ShippingFunctionButtonsMaybe.module.scss';
import { Modal, PrimaryButton } from '../../../../components';
import { FormattedMessage } from 'react-intl';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ShippingStatusEnum } from '../../../../enums/shipping-status-enum';
import { loadFilesAndMessages, onRefreshTransactionEntity } from '../../TransactionPage.duck';
import { saveMessageFiles, updateShippingStatus } from '../../../../util/api';
import { TransactionRoleEnum } from '../../../../enums/transaction-role.enum';
import ShippingFunctionsForm from '../../../../components/ShippingFunctionsForm/ShippingFunctionsForm';

const ShippingFunctionButtonsMaybe = props => {
  const { transactionId, isProvider, isCustomer, shippingStatus: currentShippingStatus } = props;

  console.log(`currentShippingStatus`, currentShippingStatus);
  if (currentShippingStatus === ShippingStatusEnum.TransactionCompleted) {
    return null;
  }

  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };
  const [shippingFunctionModalOpen, setShippingFunctionModalOpen] = useState(false);
  const [shippingFunctionInProgress, setShippingFunctionInProgress] = useState(false);
  const [shippingFunctionRole, setShippingFunctionRole] = useState();
  const [nextTransition, setNextTransition] = useState();
  const [nextTransitionButton, setNextTransitionButton] = useState();

  const [fileAttachments, setFileAttachments] = useState(new Array());

  useEffect(() => {
    let role;
    let transition;
    let transitionButton;
    switch (currentShippingStatus) {
      case ShippingStatusEnum.ItemShippingNotStarted:
      case undefined:
      case null:
        role = TransactionRoleEnum.Provider;
        transition = ShippingStatusEnum.ItemShipped;
        transitionButton = 'markItemShipped';
        break;
      case ShippingStatusEnum.ItemShipped:
        role = TransactionRoleEnum.Customer;
        transition = ShippingStatusEnum.ItemReceived;
        transitionButton = 'markItemReceived';
        break;
      case ShippingStatusEnum.ItemReceived:
        role = TransactionRoleEnum.Customer;
        transition = ShippingStatusEnum.ItemReturnShipped;
        transitionButton = 'markItemReturnShipped';
        break;
      case ShippingStatusEnum.ItemReturnShipped:
        role = TransactionRoleEnum.Provider;
        transition = ShippingStatusEnum.ItemReturnReceived;
        transitionButton = 'markItemReceivedShipped';
        break;
      case ShippingStatusEnum.ItemReturnReceived:
        transition = ShippingStatusEnum.TransactionCompleted;
        break;
    }
    // role = TransactionRoleEnum.Provider;
    // transition = ShippingStatusEnum.ItemReturnReceived;
    // transitionButton = 'markItemReceivedShipped';
    setShippingFunctionRole(role);
    setNextTransition(transition);
    setNextTransitionButton(transitionButton);
  }, [currentShippingStatus]);

  const onShippingFunctionTransition = () => {
    if (nextTransition) {
      setShippingFunctionInProgress(true);
      updateShippingStatus({ transactionId, nextTransition })
        .then(res => {
          const messageId = res.messageId;
          // dispatch(onRefreshTransactionEntity(transactionId));
          // console.log(`updateShippingStatus`, res);
          const transactionIdUUID = transactionId.uuid;

          const formData = new FormData();
          for (let i = 0; i < fileAttachments.length; i++) {
            formData.append('uploads[]', fileAttachments[i]);
          }
          formData.append('transactionId', transactionIdUUID);
          formData.append('messageId', messageId);

          saveMessageFiles(formData)
            .then(uploadedFile => {
              dispatch(loadFilesAndMessages({ id: transactionIdUUID, uploadedFile })).then(
                files => {
                  // setFileAttachments(files);
                  // setShippingFunctionModalOpen(false);
                  // setShippingFunctionInProgress(false);
                  location.reload();
                }
              );
            })
            .catch(error => {
              console.error(error);
              setShippingFunctionInProgress(false);
            });
        })
        .catch(err => {
          setShippingFunctionInProgress(false);
          console.error(`updateShippingStatus`, err);
        });
    }
  };

  if (isProvider && shippingFunctionRole !== TransactionRoleEnum.Provider) {
    return null;
  }

  if (isCustomer && shippingFunctionRole !== TransactionRoleEnum.Customer) {
    return null;
  }

  return (
    shippingFunctionRole &&
    nextTransition &&
    nextTransitionButton && (
      <div className={css.shippingFunctionContainer}>
        <div className={css.rowUnsetMarginLR}>
          <div className={css.col12}>
            <PrimaryButton
              onClick={() => {
                setShippingFunctionModalOpen(true);
              }}
              className={css.shippingFunctionButton}
              type="button"
            >
              <FormattedMessage
                id={`ShippingFunctionButtonsMaybe.shippingFunctionModalButton.${nextTransitionButton}`}
              />
            </PrimaryButton>
            <p className={css.shippingFunctionNote}>
              <FontAwesomeIcon icon="fa-regular fa-bell" />
              <span>
                <FormattedMessage
                  id={`ShippingFunctionButtonsMaybe.shippingFunctionNote.${nextTransitionButton}`}
                />
              </span>
            </p>
          </div>
        </div>
        <Modal
          id="ShippingFunctionButtonsMaybe.shippingFunctionModal"
          isOpen={shippingFunctionModalOpen}
          onClose={() => setShippingFunctionModalOpen(false)}
          usePortal={true}
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <div className={css.rowUnsetMarginLR}>
            <div className={css.col12}>
              <h4>
                <FormattedMessage
                  id={`ShippingFunctionButtonsMaybe.shippingFunctionModal.title.${nextTransitionButton}`}
                />
              </h4>
            </div>
            <div className={css.col12}>
              <p className={css.shippingFunctionsMessage}>
                <FormattedMessage
                  id={`ShippingFunctionButtonsMaybe.shippingFunctionModal.message.${nextTransitionButton}`}
                />
              </p>
            </div>
            <div className={css.col12}>
              <div className={css.shippingFunctionsForm}>
                <ShippingFunctionsForm
                  fileAttachments={fileAttachments}
                  setFileAttachments={setFileAttachments}
                />
              </div>
            </div>
            <br />
            <PrimaryButton
              className={css.shippingFunctionModalButton}
              inProgress={shippingFunctionInProgress}
              onClick={() => onShippingFunctionTransition()}
              type="button"
            >
              <FormattedMessage id="ShippingFunctionButtonsMaybe.shippingFunctionModal.submit" />
            </PrimaryButton>
          </div>
        </Modal>
      </div>
    )
  );
};
export default ShippingFunctionButtonsMaybe;
