import React, { useState, useEffect } from 'react';
import { bool, func, object, shape, string, array } from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import { 
  Heading, 
  PrimaryButton, 
  IconSpinner,
  Menu,
  MenuLabel,
  MenuItem,
  MenuContent,
  InlineTextButton
} from '../../components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCreditCard, 
  faMobile, 
  faUniversity,
  faWallet
} from '@fortawesome/free-solid-svg-icons';
import { 
  faApple, 
  faGoogle, 
  faPaypal,
  faCcVisa,
  faCcMastercard,
  faCcAmex
} from '@fortawesome/free-brands-svg-icons';

import ApplePayButton from './ApplePayButton';
import GooglePayButton from './GooglePayButton';
import PayPalButton from './PayPalButton';
import CardPaymentSection from './CardPaymentSection';
import SavedCardsList from './SavedCardsList';

import css from './EnhancedPaymentMethodSelector.module.css';
import { loadStripe } from '@stripe/stripe-js';

// Payment method types
export const PAYMENT_METHODS = {
  CARD: 'card',
  SAVED_CARD: 'saved_card',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  PAYPAL: 'paypal'
};

// Utility function to calculate base product price before commission
const calculateBaseProductPrice = (lineItems) => {
  if (!lineItems || !Array.isArray(lineItems)) {
    return 0;
  }

  // Find the base product line item (line-item/item, line-item/day, line-item/night, line-item/hour)
  const baseLineItem = lineItems.find(item => {
    const isBaseItem = ['line-item/item', 'line-item/day', 'line-item/night', 'line-item/hour'].includes(item.code);
    const isNotReversal = !item.reversal;
    return isBaseItem && isNotReversal;
  });

  if (!baseLineItem || !baseLineItem.lineTotal) {
    return 0;
  }

  // Convert from subunits (cents) to main units (dollars)
  // lineTotal.amount is in cents, so divide by 100 for USD
  const basePrice = baseLineItem.lineTotal.amount / 100;

  return basePrice;
};

const EnhancedPaymentMethodSelector = props => {
  const {
    className,
    rootClassName,
    intl,
    onPaymentMethodSelect,
    onPaymentSubmit,
    savedCards,
    isLoading,
    totalAmount,
    currency,
    currentUser,
    config,
    clientSecret,
    inProgress,
    showSavedCards = true,
    showDigitalWallets = true,
    showAlternativePayments = true,
    stripePublishableKey,
    paypalClientId,
    transactionLineItems,
    providerId,
    customerId
  } = props;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);
  const [isPayPalAvailable, setIsPayPalAvailable] = useState(false);
  const [payPalDisabledDueToPrice, setPayPalDisabledDueToPrice] = useState(false);
  const [baseProductPrice, setBaseProductPrice] = useState(0);

  const [showCardForm, setShowCardForm] = useState(false);

  useEffect(() => {
    // Check device capabilities for payment methods
    checkPaymentMethodAvailability();
  }, [stripePublishableKey, paypalClientId]);

  useEffect(() => {
    // Update available methods based on props and device capabilities
    updateAvailableMethods();
  }, [savedCards, isApplePayAvailable, isGooglePayAvailable, isPayPalAvailable, showSavedCards, showDigitalWallets, showAlternativePayments, transactionLineItems]);

  const checkPaymentMethodAvailability = async () => {
    // Check Apple Pay availability
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      setIsApplePayAvailable(true);
    }

    // Check Google Pay availability using Stripe Payment Request API
    if (stripePublishableKey) {
      try {
        const stripeInstance = await loadStripe(stripePublishableKey);
        if (stripeInstance) {
          // Create a test payment request to check Google Pay availability
          const testPaymentRequest = stripeInstance.paymentRequest({
            country: 'US',
            currency: 'usd',
            total: {
              label: 'Test',
              amount: 100, // $1.00 test amount
            },
            requestPayerName: false,
            requestPayerEmail: false,
          });

          const result = await testPaymentRequest.canMakePayment();
          
          if (result && result.googlePay) {
            setIsGooglePayAvailable(true);
          } else {
            setIsGooglePayAvailable(false);
          }
        } else {
          setIsGooglePayAvailable(false);
        }
      } catch (error) {
        setIsGooglePayAvailable(false);
      }
    } else {
      setIsGooglePayAvailable(false);
    }

    // Check PayPal availability
    if (paypalClientId) {
      setIsPayPalAvailable(true);
    } else {
      setIsPayPalAvailable(false);
    }
  };

  const updateAvailableMethods = () => {
    const methods = [];

    // Calculate base product price to determine PayPal availability
    let baseProductPrice = 0;
    let isPayPalAllowedForPrice = true;
    
    if (transactionLineItems) {
      try {
        // Parse lineItems if it's a string
        const lineItems = typeof transactionLineItems === 'string' 
          ? JSON.parse(transactionLineItems) 
          : transactionLineItems;
        
        baseProductPrice = calculateBaseProductPrice(lineItems);
        isPayPalAllowedForPrice = baseProductPrice >= 4.99;
      } catch (error) {
        // Default to allowing PayPal if we can't parse the price
        isPayPalAllowedForPrice = true;
      }
    }

    // Store PayPal availability info for UI display
    setPayPalDisabledDueToPrice(!isPayPalAllowedForPrice && isPayPalAvailable);
    setBaseProductPrice(baseProductPrice);

    // Add saved cards if available
    if (showSavedCards && savedCards && savedCards.length > 0) {
      methods.push({
        id: PAYMENT_METHODS.SAVED_CARD,
        name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.savedCard' }),
        icon: faCreditCard,
        description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.savedCardDescription' }),
        category: 'saved'
      });
    }

    // Add new card option
    methods.push({
      id: PAYMENT_METHODS.CARD,
      name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.card' }),
      icon: faCreditCard,
      description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.cardDescription' }),
      category: 'card'
    });

    // Add digital wallets if available and enabled (Stripe-compatible only)
    if (showDigitalWallets) {
      // Apple Pay
      if (isApplePayAvailable) {
        methods.push({
          id: PAYMENT_METHODS.APPLE_PAY,
          name: 'Apple Pay',
          icon: faApple,
          description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.applePayDescription' }),
          category: 'wallet'
        });
      }

      // Google Pay  
      if (isGooglePayAvailable) {
        methods.push({
          id: PAYMENT_METHODS.GOOGLE_PAY,
          name: 'Google Pay',
          icon: faGoogle,
          description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.googlePayDescription' }),
          category: 'wallet'
        });
      }
    }

    // Add alternative payment methods if available and enabled
    if (showAlternativePayments) {
      // PayPal - only show if price is $4.99 or higher
      if (isPayPalAvailable && isPayPalAllowedForPrice) {
        methods.push({
          id: PAYMENT_METHODS.PAYPAL,
          name: 'PayPal & Venmo',
          icon: faPaypal,
          description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.paypalVenmoDescription' }),
          category: 'alternative'
        });
      }
    }

    setAvailableMethods(methods);
  };

  const handleMethodSelect = method => {
    setSelectedMethod(method);
    setShowCardForm(method.id === PAYMENT_METHODS.CARD);
    
    if (onPaymentMethodSelect) {
      onPaymentMethodSelect(method);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    if (onPaymentSubmit) {
      await onPaymentSubmit({
        method: selectedMethod,
        data: paymentData
      });
    }
  };

  const renderPaymentMethodOption = (method) => {
    const isSelected = selectedMethod?.id === method.id;
    const optionClasses = classNames(css.paymentMethodOption, {
      [css.selected]: isSelected
    });

    return (
      <div
        key={method.id}
        className={optionClasses}
        onClick={() => handleMethodSelect(method)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleMethodSelect(method);
          }
        }}
      >
        <div className={css.methodIcon}>
          <FontAwesomeIcon icon={method.icon} />
        </div>
        <div className={css.methodInfo}>
          <div className={css.methodName}>{method.name}</div>
          <div className={css.methodDescription}>{method.description}</div>
        </div>
        <div className={css.methodSelector}>
          <div className={classNames(css.radioButton, { [css.checked]: isSelected })} />
        </div>
      </div>
    );
  };

  const renderPaymentMethodsByCategory = () => {
    const categories = [
      { id: 'saved', name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.savedMethods' }) },
      { id: 'wallet', name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.digitalWallets' }) },
      { id: 'card', name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.cards' }) },
      { id: 'alternative', name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.alternativePayments' }) }
    ];

    return categories.map(category => {
      const methodsInCategory = availableMethods.filter(method => method.category === category.id);
      
      if (methodsInCategory.length === 0) return null;

      return (
        <div key={category.id} className={css.methodCategory}>
          <h4 className={css.categoryTitle}>{category.name}</h4>
          <div className={css.methodsList}>
            {methodsInCategory.map(renderPaymentMethodOption)}
          </div>
        </div>
      );
    });
  };

  const renderSelectedMethodContent = () => {
    if (!selectedMethod) return null;

    switch (selectedMethod.id) {
      case PAYMENT_METHODS.SAVED_CARD:
        return (
          <SavedCardsList
            cards={savedCards}
            onCardSelect={handlePaymentSubmit}
            inProgress={inProgress}
          />
        );

      case PAYMENT_METHODS.CARD:
        return (
          <CardPaymentSection
            clientSecret={clientSecret}
            stripePublishableKey={stripePublishableKey}
            onPaymentSubmit={handlePaymentSubmit}
            totalAmount={totalAmount}
            currency={currency}
            inProgress={inProgress}
          />
        );

      case PAYMENT_METHODS.APPLE_PAY:
        return (
          <ApplePayButton
            totalAmount={totalAmount}
            currency={currency}
            onPaymentSubmit={handlePaymentSubmit}
            inProgress={inProgress}
          />
        );

      case PAYMENT_METHODS.GOOGLE_PAY:
        return (
          <GooglePayButton
            totalAmount={totalAmount}
            currency={currency}
            onPaymentSubmit={handlePaymentSubmit}
            inProgress={inProgress}
          />
        );

      case PAYMENT_METHODS.PAYPAL:
        return (
          <PayPalButton
            totalAmount={totalAmount}
            currency={currency}
            onPaymentSubmit={handlePaymentSubmit}
            inProgress={inProgress}
            paypalClientId={paypalClientId}
            transactionLineItems={transactionLineItems}
            providerId={providerId}
            customerId={customerId}
          />
        );

      default:
        return null;
    }
  };

  const classes = classNames(rootClassName || css.root, className);

  if (isLoading) {
    return (
      <div className={classes}>
        <IconSpinner />
      </div>
    );
  }

  return (
    <div className={classes}>
      <Heading as="h3" className={css.title}>
        <FormattedMessage id="EnhancedPaymentMethodSelector.title" />
      </Heading>

      <div className={css.paymentMethodsContainer}>
        {renderPaymentMethodsByCategory()}
      </div>

      {selectedMethod && (
        <div className={css.selectedMethodContent}>
          <div className={css.selectedMethodHeader}>
            <h4>
              <FormattedMessage 
                id="EnhancedPaymentMethodSelector.payWith" 
                values={{ method: selectedMethod.name }}
              />
            </h4>
          </div>
          {renderSelectedMethodContent()}
        </div>
      )}
    </div>
  );
};

EnhancedPaymentMethodSelector.defaultProps = {
  className: null,
  rootClassName: null,
  savedCards: [],
  isLoading: false,
  inProgress: false,
  showSavedCards: true,
  showDigitalWallets: true,
  showAlternativePayments: true,
  onPaymentMethodSelect: null,
  onPaymentSubmit: null,
  totalAmount: null,
  currency: 'USD',
  clientSecret: null,
  stripePublishableKey: null,
  paypalClientId: null
};

EnhancedPaymentMethodSelector.propTypes = {
  className: string,
  rootClassName: string,
  intl: intlShape.isRequired,
  onPaymentMethodSelect: func,
  onPaymentSubmit: func,
  savedCards: array,
  isLoading: bool,
  totalAmount: string,
  currency: string,
  currentUser: object,
  config: object,
  clientSecret: string,
  inProgress: bool,
  showSavedCards: bool,
  showDigitalWallets: bool,
  showAlternativePayments: bool,
  stripePublishableKey: string,
  paypalClientId: string,
  transactionLineItems: string,
  providerId: string,
  customerId: string
};

export default injectIntl(EnhancedPaymentMethodSelector);