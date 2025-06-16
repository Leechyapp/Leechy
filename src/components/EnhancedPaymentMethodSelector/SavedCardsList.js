import React, { useState } from 'react';
import { bool, func, array } from 'prop-types';
import { injectIntl, intlShape, FormattedMessage } from '../../util/reactIntl';
import { PrimaryButton } from '../../components';
import classNames from 'classnames';

import css from './SavedCardsList.module.css';

const SavedCardsList = ({ 
  cards, 
  onCardSelect, 
  inProgress, 
  intl 
}) => {
  const [selectedCard, setSelectedCard] = useState(cards[0] || null);

  const handleCardSelection = (card) => {
    setSelectedCard(card);
  };

  const handleSubmit = () => {
    if (selectedCard && onCardSelect) {
      onCardSelect({
        type: 'saved_card',
        paymentMethodId: selectedCard.id,
        card: selectedCard
      });
    }
  };

  const formatCardNumber = (last4) => {
    return `•••• •••• •••• ${last4}`;
  };

  const formatExpiryDate = (month, year) => {
    const monthStr = month.toString().padStart(2, '0');
    const yearStr = year.toString().slice(-2);
    return `${monthStr}/${yearStr}`;
  };

  const getCardBrandIcon = (brand) => {
    const brandLower = brand.toLowerCase();
    
    switch (brandLower) {
      case 'visa':
        return (
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
            <rect width="32" height="20" rx="4" fill="#1A1F71"/>
            <path d="M11.2 6.4h2.4l-1.5 7.2h-2.4l1.5-7.2zm6.3 4.6c0-.8-.5-1.3-1.6-1.8-.7-.3-1.1-.5-1.1-.8 0-.3.3-.6 1-.6.5 0 .9.1 1.3.2l.2-.9c-.3-.1-.8-.2-1.4-.2-1.5 0-2.6.8-2.6 1.9 0 .8.8 1.3 1.4 1.6.6.3 .8.5.8.8 0 .5-.6.7-1.1.7-.7 0-1.1-.1-1.7-.3l-.2 1c.4.2 1.1.3 1.8.3 1.6 0 2.7-.8 2.7-2 0-.9-.5-1.6-1.5-2.1v.2zm4.8-4.6l-1.9 7.2h2.3l.3-1.4h2.9l.5 1.4h2.5l-2.2-7.2h-2.4zm.4 2.4l.7 2.9h-1.8l1.1-2.9z" fill="white"/>
          </svg>
        );
      case 'mastercard':
        return (
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
            <rect width="32" height="20" rx="4" fill="#EB001B"/>
            <circle cx="12" cy="10" r="6" fill="#FF5F00"/>
            <circle cx="20" cy="10" r="6" fill="#F79E1B"/>
          </svg>
        );
      case 'amex':
        return (
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
            <rect width="32" height="20" rx="4" fill="#006FCF"/>
            <path d="M8.5 6.5h3l.5 1.5.5-1.5h3l-1 2 1 2h-3l-.5-1.5-.5 1.5h-3l1-2-1-2z" fill="white"/>
          </svg>
        );
      default:
        return (
          <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
            <rect width="32" height="20" rx="4" fill="#6B7280"/>
            <rect x="4" y="6" width="24" height="2" fill="white"/>
            <rect x="4" y="10" width="8" height="1" fill="white"/>
          </svg>
        );
    }
  };

  if (!cards || cards.length === 0) {
    return (
      <div className={css.empty}>
        <p>
          <FormattedMessage id="SavedCardsList.noCards" />
        </p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <div className={css.cardsList}>
        {cards.map((card) => {
          const isSelected = selectedCard?.id === card.id;
          const cardClasses = classNames(css.cardItem, {
            [css.selected]: isSelected
          });

          return (
            <div
              key={card.id}
              className={cardClasses}
              onClick={() => handleCardSelection(card)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardSelection(card);
                }
              }}
            >
              <div className={css.cardIcon}>
                {getCardBrandIcon(card.card.brand)}
              </div>
              
              <div className={css.cardInfo}>
                <div className={css.cardNumber}>
                  {formatCardNumber(card.card.last4)}
                </div>
                <div className={css.cardExpiry}>
                  {formatExpiryDate(card.card.exp_month, card.card.exp_year)}
                </div>
              </div>

              <div className={css.cardSelector}>
                <div className={classNames(css.radioButton, { [css.checked]: isSelected })} />
              </div>
            </div>
          );
        })}
      </div>

      <div className={css.submitContainer}>
        <PrimaryButton
          onClick={handleSubmit}
          disabled={!selectedCard || inProgress}
          inProgress={inProgress}
          className={css.submitButton}
        >
          <FormattedMessage id="SavedCardsList.useThisCard" />
        </PrimaryButton>
      </div>
    </div>
  );
};

SavedCardsList.defaultProps = {
  cards: [],
  inProgress: false,
};

SavedCardsList.propTypes = {
  cards: array,
  onCardSelect: func.isRequired,
  inProgress: bool,
  intl: intlShape.isRequired,
};

export default injectIntl(SavedCardsList); 