import React, { useEffect, useState } from 'react';
import { bool } from 'prop-types';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_INSURANCE, propTypes } from '../../util/types';
import css from './OrderBreakdown.module.css';
import { isNumeric } from '../../util/isNumeric';
import { SecurityDepositEnum } from '../../enums/security-deposit-status.enum';

const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const LineItemSecurityDepositMaybe = props => {
  const { transaction, lineItems, isProvider, intl, listing } = props;
  console.log(`transaction`, transaction);
  console.log(`listing`, listing);

  if (!transaction) return null;

  const insuranceLineItem = lineItems.find(item => item.code === LINE_ITEM_INSURANCE);
  const hasInsurance = insuranceLineItem ? true : false;
  if (hasInsurance) {
    return null;
  }

  const securityDepositStatus = transaction?.attributes?.metadata?.securityDepositStatus;

  const [securityDepositPercentageValue, setSecurityDepositPercentageValue] = useState(null);

  useEffect(() => {
    if (transaction) {
      const trxSecurityDepositPercentageValue =
        transaction?.attributes?.protectedData?.securityDepositPercentageValue;
      if (trxSecurityDepositPercentageValue) {
        setSecurityDepositPercentageValue(trxSecurityDepositPercentageValue);
      } else {
        if (listing) {
          const security_deposit = listing?.attributes?.publicData?.security_deposit;
          const listingSecurityDepositPercentageValue = isNumeric(security_deposit)
            ? parseInt(security_deposit)
            : null;
          console.log(
            `listingSecurityDepositPercentageValue`,
            listingSecurityDepositPercentageValue
          );
          if (listingSecurityDepositPercentageValue) {
            setSecurityDepositPercentageValue(listingSecurityDepositPercentageValue);
          }
        }
      }
    }
  }, [transaction]);

  const totalSecurityDepositPrice = securityDepositPercentageValue
    ? new Money(
        transaction.attributes.payinTotal.amount * (securityDepositPercentageValue / 100),
        'USD'
      )
    : null;
  const formattedSecurityDepositTotalPrice = totalSecurityDepositPrice
    ? formatMoney(intl, totalSecurityDepositPrice)
    : null;

  console.log(`transaction.attributes.payinTotal.amount`, transaction.attributes.payinTotal.amount);
  console.log(`totalSecurityDepositPrice`, totalSecurityDepositPrice);

  const bookingTotalPlusSecurityDepositPrice =
    transaction.attributes.payinTotal.amount + totalSecurityDepositPrice?.amount;

  console.log(`bookingTotalPlusSecurityDepositPrice`, bookingTotalPlusSecurityDepositPrice);
  const formattedBookingTotalPlusSecurityDepositPrice = bookingTotalPlusSecurityDepositPrice
    ? formatMoney(intl, new Money(bookingTotalPlusSecurityDepositPrice, 'USD'))
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
