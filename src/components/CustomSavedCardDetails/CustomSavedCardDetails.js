import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { bool, func, shape, string, array, number } from 'prop-types';
import classNames from 'classnames';
import { injectIntl, intlShape } from '../../util/reactIntl';
import {
  IconClose,
  IconCheckmark,
  Button,
  InlineTextButton,
  Menu,
  MenuLabel,
  MenuItem,
  MenuContent,
  Modal,
} from '../../components';

import css from './CustomSavedCardDetails.module.scss';
import IconCard from '../SavedCardDetails/IconCard/IconCard';

const DEFAULT_CARD = 'defaultCard';
const REPLACE_CARD = 'replaceCard';

const CustomSavedCardDetails = forwardRef((props, ref) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(DEFAULT_CARD);

  useImperativeHandle(ref, () => ({
    setActiveToDefault() {
      setActive(DEFAULT_CARD);
    },
  }));

  const {
    rootClassName,
    className,
    intl,
    customDefaultPaymentMethod,
    customPaymentMethodList,
    onChange,
    onManageDisableScrolling,
    deletePaymentMethodInProgress,
  } = props;

  const { card } = customDefaultPaymentMethod || {};
  const { last4, exp_month, exp_year, brand } = card || {};

  const classes = classNames(rootClassName || css.root, className);

  const paymentMethodPlaceholderDesktop = intl.formatMessage(
    { id: 'SavedCardDetails.savedPaymentMethodPlaceholderDesktop' },
    { last4Digits: last4 }
  );

  const paymentMethodPlaceholderMobile = intl.formatMessage(
    { id: 'SavedCardDetails.savedPaymentMethodPlaceholderMobile' },
    { last4Digits: last4 }
  );

  const paymentMethodPlaceholder = (
    <>
      <span className={css.paymentMethodPlaceholderDesktop}>{paymentMethodPlaceholderDesktop}</span>
      <span className={css.paymentMethodPlaceholderMobile}>{paymentMethodPlaceholderMobile}</span>
    </>
  );

  const replaceCardText = intl.formatMessage({
    id: 'SavedCardDetails.replaceCardText',
  });
  const replaceCard = (
    <span>
      <IconCard brand="none" className={css.cardIcon} /> {replaceCardText}
    </span>
  );

  const expiredCardText = intl.formatMessage(
    { id: 'SavedCardDetails.expiredCardText' },
    { last4Digits: last4 }
  );
  const expiredText = <div className={css.cardExpiredText}>{expiredCardText}</div>;

  const isExpired = (exp_month, exp_year) => {
    const currentTime = new Date();
    const currentYear = currentTime.getFullYear();
    const currentMonth = currentTime.getMonth() + 1; //getMonth() method returns the month (from 0 to 11)

    if (exp_year < currentYear) {
      return true;
    } else if (exp_year === currentYear && exp_month < currentMonth) {
      return true;
    }

    return false;
  };

  const isCardExpired = exp_month && exp_year && isExpired(exp_month, exp_year);

  const defaultCard = (
    <div className={css.savedPaymentMethod}>
      <IconCard brand={brand} className={css.cardIcon} />
      {paymentMethodPlaceholder}
      <span className={isCardExpired ? css.expirationDateExpired : css.expirationDate}>
        {exp_month}/{exp_year.toString().substring(2)}
      </span>
    </div>
  );

  const handleChangePaymentMethod = paymentMethod => {
    setActive(DEFAULT_CARD);
    setMenuOpen(false);
    props.changeCustomPaymentMethod(paymentMethod);
  };

  const getPaymentMethodListPlaceholder = () => {
    const rows = [];
    for (let i = 0; i < customPaymentMethodList.length; i++) {
      const indexCard = customPaymentMethodList[i].card;
      const indexLast4 = indexCard?.last4;
      const desktopPlaceHolder = intl.formatMessage(
        { id: 'SavedCardDetails.savedPaymentMethodPlaceholderDesktop' },
        { last4Digits: indexLast4 }
      );
      const mobilePlaceHolder = intl.formatMessage(
        { id: 'SavedCardDetails.savedPaymentMethodPlaceholderMobile' },
        { last4Digits: indexLast4 }
      );
      rows.push(
        <MenuItem key="first item" className={css.menuItem}>
          <IconCheckmark
            className={
              customDefaultPaymentMethod.id === customPaymentMethodList[i].id &&
              active !== REPLACE_CARD
                ? css.iconCheckmark
                : css.iconCheckmarkHidden
            }
            size="small"
          />
          <InlineTextButton
            className={css.menuText}
            onClick={() => handleChangePaymentMethod(customPaymentMethodList[i])}
          >
            <div className={css.savedPaymentMethod}>
              <IconCard brand={indexCard.brand} className={css.cardIcon} />
              <span className={css.paymentMethodPlaceholderDesktop}>{desktopPlaceHolder}</span>
              <span className={css.paymentMethodPlaceholderMobile}>{mobilePlaceHolder}</span>
            </div>
          </InlineTextButton>
        </MenuItem>
      );
    }
    return rows;
  };

  const handleClick = item => e => {
    // Clicking buttons inside a form will call submit
    e.preventDefault();
    e.stopPropagation();

    setActive(item);
    setMenuOpen(false);
    if (onChange) {
      onChange(true);
    }
  };

  const onToggleActive = isOpen => {
    setMenuOpen(isOpen);
  };

  const handleDeletePaymentMethod = () => {
    setIsModalOpen(true);
  };

  const deleteCardPaymentMethod = () => {
    props.onDeleteCardPaymentMethod(customDefaultPaymentMethod.id);
    setIsModalOpen(false);
  };

  const replaceCardTitle = intl.formatMessage({
    id: 'SavedCardDetails.replaceCardTitle',
  });
  const removeCardModalTitle = intl.formatMessage({ id: 'SavedCardDetails.removeCardModalTitle' });
  const removeCardModalContent = intl.formatMessage(
    { id: 'SavedCardDetails.removeCardModalContent' },
    { last4Digits: last4 }
  );
  const cancel = intl.formatMessage({ id: 'SavedCardDetails.cancel' });
  const removeCard = intl.formatMessage({ id: 'SavedCardDetails.removeCard' });
  const deletePaymentMethod = intl.formatMessage({ id: 'SavedCardDetails.deletePaymentMethod' });

  const showExpired = false;
  return (
    <div className={classes}>
      <Menu className={css.menu} isOpen={menuOpen} onToggleActive={onToggleActive} useArrow={false}>
        <MenuLabel className={css.menuLabel}>
          <div className={showExpired ? css.menuLabelWrapperExpired : css.menuLabelWrapper}>
            {active === DEFAULT_CARD ? defaultCard : replaceCard}
          </div>
        </MenuLabel>

        <MenuContent rootClassName={css.menuContent}>
          {getPaymentMethodListPlaceholder()}
          <MenuItem key="divider" className={css.menuDivider}>
            {replaceCardTitle}
          </MenuItem>
          <MenuItem key="second item" className={css.menuItem}>
            <IconCheckmark
              className={active === REPLACE_CARD ? css.iconCheckmark : css.iconCheckmarkHidden}
              size="small"
            />
            <InlineTextButton
              className={css.menuTextReplaceCard}
              onClick={handleClick(REPLACE_CARD)}
            >
              {replaceCard}
            </InlineTextButton>
          </MenuItem>
        </MenuContent>
      </Menu>
      {showExpired && !menuOpen ? expiredText : null}

      {props.onDeleteCardPaymentMethod && active !== REPLACE_CARD ? (
        <InlineTextButton
          onClick={handleDeletePaymentMethod}
          className={css.savedPaymentMethodDelete}
        >
          <IconClose rootClassName={css.closeIcon} size="small" />
          {deletePaymentMethod}
        </InlineTextButton>
      ) : null}

      {onManageDisableScrolling ? (
        <Modal
          id="VerifyDeletingPaymentMethod"
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          usePortal
          contentClassName={css.modalContent}
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <div>
            <div className={css.modalTitle}>{removeCardModalTitle}</div>
            <p className={css.modalMessage}>{removeCardModalContent}</p>
            <div className={css.modalButtonsWrapper}>
              <div
                onClick={() => setIsModalOpen(false)}
                className={css.cancelCardDelete}
                tabIndex="0"
              >
                {cancel}
              </div>
              <Button onClick={deleteCardPaymentMethod} inProgress={deletePaymentMethodInProgress}>
                {removeCard}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
});

CustomSavedCardDetails.defaultProps = {
  rootClassName: null,
  className: null,
  customDefaultPaymentMethod: null,
  customPaymentMethodList: [],
  changeCustomPaymentMethod: null,
  onSubmitPayment: null,
  onChange: null,
  deletePaymentMethodInProgress: false,
  onManageDisableScrolling: null,
};

CustomSavedCardDetails.propTypes = {
  rootClassName: string,
  className: string,
  intl: intlShape.isRequired,
  customDefaultPaymentMethod: shape({
    brand: string.isRequired,
    exp_month: number.isRequired,
    exp_year: number.isRequired,
    last4: string.isRequired,
  }),
  customPaymentMethodList: array,
  changeCustomPaymentMethod: func,
  onSubmitPayment: func,
  onChange: func,
  onManageDisableScrolling: func,
  deletePaymentMethodInProgress: bool,
};

export default injectIntl(CustomSavedCardDetails, { forwardRef: true });
