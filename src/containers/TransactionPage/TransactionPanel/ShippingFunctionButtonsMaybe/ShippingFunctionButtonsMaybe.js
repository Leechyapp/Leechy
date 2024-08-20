import { useDispatch } from 'react-redux';
import { manageDisableScrolling } from '../../../../ducks/ui.duck';
import css from './ShippingFunctionButtonsMaybe.module.scss';
import { Modal, PrimaryButton } from '../../../../components';
import { FormattedMessage } from 'react-intl';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ShippingStatusEnum } from '../../../../enums/shipping-status-enum';

const ShippingFunctionButtonsMaybe = props => {
  const { transactionId, isProvider, shippingStatus: currentShippingStatus } = props;

  if (currentShippingStatus === ShippingStatusEnum.TransactionCompleted) {
    return null;
  }

  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [shippingFunctionModalOpen, setShippingFunctionModalOpen] = useState(false);
  const [shippingFunctionInProgress, setShippingFunctionInProgres] = useState(false);

  const onShippingFunctionTransition = () => {
    let nextTransition;
    switch (currentShippingStatus) {
      case ShippingStatusEnum.ItemShippingNotStarted:
      case undefined:
      case null:
        nextTransition = ShippingStatusEnum.ItemReturnReceived;
        break;
      case ShippingStatusEnum.ItemReturnShipped:
        nextTransition = ShippingStatusEnum.ItemReceived;
        break;
      case ShippingStatusEnum.ItemReceived:
        nextTransition = ShippingStatusEnum.ItemReturnShipped;
        break;
      case ShippingStatusEnum.ItemReturnShipped:
        nextTransition = ShippingStatusEnum.ItemReturnReceived;
        break;
      case ShippingStatusEnum.ItemReturnReceived:
        nextTransition = ShippingStatusEnum.TransactionCompleted;
        break;
    }

    if (nextTransition) {
      setShippingFunctionInProgres(true);
    }
  };

  return (
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
            <FormattedMessage id="ShippingFunctionButtonsMaybe.shippingFunctionModalButton.markItemShipped" />
          </PrimaryButton>
          <p className={css.shippingFunctionNote}>
            <FontAwesomeIcon icon="fa-regular fa-bell" />
            <span>
              <FormattedMessage id="ShippingFunctionButtonsMaybe.shippingFunctionNote.markItemShipped" />
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
        <h4>
          <FormattedMessage id="ShippingFunctionButtonsMaybe.confirmMessage" />
        </h4>
        <PrimaryButton
          className={css.shippingFunctionButton}
          inProgress={shippingFunctionInProgress}
          onClick={() => onShippingFunctionTransition()}
          type="button"
        >
          <FormattedMessage id="ShippingFunctionButtonsMaybe.confirmShippingFunctionButton" />
        </PrimaryButton>
      </Modal>
    </div>
  );
};
export default ShippingFunctionButtonsMaybe;
