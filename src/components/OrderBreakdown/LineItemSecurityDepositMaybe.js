import React from 'react';
import { bool } from 'prop-types';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_INSURANCE, propTypes } from '../../util/types';
import css from './OrderBreakdown.module.css';
import { SecurityDepositEnum } from '../../enums/security-deposit-status.enum';

const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const LineItemSecurityDepositMaybe = props => {
  const { transaction, lineItems, isProvider, intl } = props;
  // Removed transaction logging for security

  if (!transaction) return null;

  const trxProtectedData = transaction?.attributes?.protectedData;

  const {
    securityDepositPercentageValue,
    securityDepositAmount,
    totalPlusSecurityDepositPrice,
  } = trxProtectedData;

  const insuranceLineItem = lineItems.find(item => item.code === LINE_ITEM_INSURANCE);
  const hasInsurance = insuranceLineItem ? true : false;
  if (hasInsurance) {
    return null;
  }

  const trxPayinTotalAmount = transaction?.attributes?.payinTotal?.amount;
  const trxPayinTotalCurrency = transaction?.attributes?.payinTotal?.currency;
  if (!trxPayinTotalAmount) {
    return null;
  }
  const securityDepositStatus = transaction?.attributes?.metadata?.securityDepositStatus;

  const formattedSecurityDepositTotalPrice = securityDepositAmount
    ? formatMoney(intl, new Money(securityDepositAmount, trxPayinTotalCurrency))
    : null;

  const formattedBookingTotalPlusSecurityDepositPrice = totalPlusSecurityDepositPrice
    ? formatMoney(intl, new Money(totalPlusSecurityDepositPrice, trxPayinTotalCurrency))
    : null;

  const classes = isProvider ? [css.totalDivider, css.marginTop].join(' ') : css.totalDivider;

  return (
    formattedSecurityDepositTotalPrice && (
      <>
        <hr className={classes} />
        <div className={css.lineItem}>
          <div className={css.itemLabel}>
            <FormattedMessage
              id="LineItemSecurityDepositMaybe.securityDepositLineItem"
              values={{ securityDepositPercentageValue }}
            />
          </div>
          <div className={css.itemValue}>{formattedSecurityDepositTotalPrice}</div>
        </div>
        {!isProvider && formattedBookingTotalPlusSecurityDepositPrice && (
          <>
            <hr className={css.totalDivider} />
            <div className={css.lineItemTotal}>
              <div className={css.totalLabel}>
                <FormattedMessage
                  id="LineItemSecurityDepositMaybe.bookingTotalPlusSecurityDepositLineItem"
                  values={{ securityDepositPercentageValue }}
                />
              </div>
              <div className={css.totalPrice}>{formattedBookingTotalPlusSecurityDepositPrice}</div>
            </div>
          </>
        )}
        {securityDepositStatus && (
          <>
            <hr className={css.totalDivider} />
            <div className={css.lineItemTotal}>
              <div className={css.totalLabel}>
                <FormattedMessage id="LineItemSecurityDepositMaybe.securityDepositStatusLineItem" />
              </div>
              <div className={css.totalPrice}>
                <span className={css.securityDepositStatusBadge}>{securityDepositStatus}</span>
              </div>
            </div>
          </>
        )}
        {securityDepositStatus !== SecurityDepositEnum.Refunded ? (
          <span className={css.feeInfo}>
            <FormattedMessage id="OrderBreakdown.securityDepositNote" />
          </span>
        ) : null}
      </>
    )
  );
};

LineItemSecurityDepositMaybe.propTypes = {
  transaction: propTypes.transaction.isRequired,
  isProvider: bool.isRequired,
  intl: intlShape.isRequired,
  listing: propTypes.listing,
};

export default LineItemSecurityDepositMaybe;
