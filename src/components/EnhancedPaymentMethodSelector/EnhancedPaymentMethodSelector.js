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
import CardPaymentSection from './CardPaymentSection';
import SavedCardsList from './SavedCardsList';
// PayPal and Venmo components removed - not compatible with Stripe-only setup

import css from './EnhancedPaymentMethodSelector.module.css';
import { loadStripe } from '@stripe/stripe-js';

// Payment method types (Stripe-compatible only)
export const PAYMENT_METHODS = {
  CARD: 'card',
  SAVED_CARD: 'saved_card',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay'
  // PayPal, Venmo, and Bank Transfer removed - not compatible with Stripe-only setup
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
    stripePublishableKey
    // paypalClientId removed - not needed for Stripe-only setup
  } = props;

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [availableMethods, setAvailableMethods] = useState([]);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);

  useEffect(() => {
    // Check device capabilities for payment methods
    if (stripePublishableKey) {
      checkPaymentMethodAvailability();
    }
  }, [stripePublishableKey]);

  useEffect(() => {
    // Update available methods based on props and device capabilities
    updateAvailableMethods();
  }, [savedCards, isApplePayAvailable, isGooglePayAvailable, showSavedCards, showDigitalWallets]);

  const checkPaymentMethodAvailability = async () => {
    console.log('🔍 Checking payment method availability...');
    
    // Check Apple Pay availability
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
      console.log('✅ Apple Pay is available');
      setIsApplePayAvailable(true);
    } else {
      console.log('❌ Apple Pay not available');
    }

    // Check Google Pay availability using Stripe Payment Request API
    console.log('🔍 Checking Google Pay availability via Stripe...');
    
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
            console.log('✅ Google Pay is available via Stripe Payment Request');
            setIsGooglePayAvailable(true);
          } else {
            console.log('❌ Google Pay not available via Stripe Payment Request');
            setIsGooglePayAvailable(false);
          }
        }
      } catch (error) {
        console.log('❌ Error checking Google Pay availability:', error);
        setIsGooglePayAvailable(false);
      }
    } else {
      console.log('❌ No Stripe publishable key available');
      setIsGooglePayAvailable(false);
    }
  };

  const updateAvailableMethods = () => {
    const methods = [];
    
    console.log('🔄 Updating available methods...');
    console.log('Settings:', {
      showSavedCards,
      showDigitalWallets,
      isApplePayAvailable,
      isGooglePayAvailable,
      savedCardsCount: savedCards?.length || 0,
      isDevelopment: process.env.NODE_ENV === 'development'
    });

    // Add saved cards if available
    if (showSavedCards && savedCards && savedCards.length > 0) {
      methods.push({
        id: PAYMENT_METHODS.SAVED_CARD,
        name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.savedCard' }),
        icon: faCreditCard,
        description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.savedCardDescription' }),
        category: 'saved'
      });
      console.log('✅ Added saved cards option');
    }

    // Add new card option
    methods.push({
      id: PAYMENT_METHODS.CARD,
      name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.card' }),
      icon: faCreditCard,
      description: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.cardDescription' }),
      category: 'card'
    });
    console.log('✅ Added card option');

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
        console.log('✅ Added Apple Pay');
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
        console.log('✅ Added Google Pay');
      }
    }

    console.log('📋 Final available methods:', methods.map(m => m.name));
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
      { id: 'card', name: intl.formatMessage({ id: 'EnhancedPaymentMethodSelector.cards' }) }
      // Alternative methods category removed - focusing on Stripe-compatible methods only
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

      // PayPal, Venmo, and Bank Transfer cases removed - not compatible with Stripe-only setup

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
  onPaymentMethodSelect: null,
  onPaymentSubmit: null,
  totalAmount: null,
  currency: 'USD',
  clientSecret: null,
  stripePublishableKey: null,
  // paypalClientId removed - not needed for Stripe-only setup
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
  stripePublishableKey: string,
  // paypalClientId removed - not needed for Stripe-only setup
};

export default injectIntl(EnhancedPaymentMethodSelector); 