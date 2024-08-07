import { FormattedMessage } from 'react-intl';
import css from './RefundSecurityDepositButtonMaybe.module.scss';
import React, { useState } from 'react';
import { Button, Modal, SecondaryButton } from '../../../components';
import { refundSecurityDeposit } from '../../../util/api';
import { SecurityDepositEnum } from '../../../enums/security-deposit-status.enum';
import { manageDisableScrolling } from '../../../ducks/ui.duck';
import { useDispatch } from 'react-redux';

const RefundSecurityDepositButtonMaybe = props => {
  const { transactionId, isProvider, securityDepositStatus } = props;

  if (securityDepositStatus !== SecurityDepositEnum.Paid) {
    return null;
  }

  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundInProgress, setRefundInProgress] = useState(false);

  const onRefundDeposit = () => {
    setRefundInProgress(true);
    if (isProvider && securityDepositStatus === SecurityDepositEnum.Paid) {
      refundSecurityDeposit({ transactionId })
        .then(res => {
          console.log(`refundSecurityDeposit res`, res);
          location.reload();
        })
        .catch(error => {
          console.error(error);
        });
    }
  };

  const onClaimDeposit = () => {
    window.location.href = `mailto:contact@leechy.app?subject=Security Deposit Claim (Transaction ID: ${transactionId.uuid})`;
  };

  return (
    <div className={css.refundSecurityContainer}>
      <div className={css.rowUnsetMarginLR}>
        <div className={css.col12}>
          <SecondaryButton
            onClick={() => {
              onClaimDeposit();
            }}
            className={css.refundSecurityDepositButton}
            type="button"
          >
            <FormattedMessage id="RefundSecurityDepositButtonMaybe.claimDepositButton" />
          </SecondaryButton>
        </div>
        <div className={css.col12}>
          <Button
            onClick={() => {
              setRefundModalOpen(true);
            }}
            className={css.refundSecurityDepositButton}
            type="button"
          >
            <FormattedMessage id="RefundSecurityDepositButtonMaybe.title" />
          </Button>
        </div>
      </div>
      <Modal
        id="RefundSecurityDepositButtonMaybe.refundModal"
        isOpen={refundModalOpen}
        onClose={() => setRefundModalOpen(false)}
        usePortal={true}
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <h4>
          <FormattedMessage id="RefundSecurityDepositButtonMaybe.confirmMessage" />
        </h4>
        <Button
          className={css.refundSecurityDepositButton}
          inProgress={refundInProgress}
          onClick={() => onRefundDeposit()}
          type="button"
        >
          <FormattedMessage id="RefundSecurityDepositButtonMaybe.confirmRefundDepositButton" />
        </Button>
      </Modal>
    </div>
  );
};

export default RefundSecurityDepositButtonMaybe;
