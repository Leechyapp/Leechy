import React, { useEffect, useState } from 'react';
import { bool, func, string } from 'prop-types';
import { injectIntl, intlShape, FormattedMessage } from '../../util/reactIntl';
import { PrimaryButton } from '../../components';
import { loadStripe } from '@stripe/stripe-js';
import classNames from 'classnames';

import css from './ApplePayButton.module.css';

const ApplePayButton = ({ 
  totalAmount, 
  currency, 
  onPaymentSubmit, 
  inProgress, 
  intl,
  stripePublishableKey 
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stripe, setStripe] = useState(null);
  const [paymentRequest, setPaymentRequest] = useState(null);

  useEffect(() => {
    const initializeApplePay = async () => {
      if (!stripePublishableKey) return;

      try {
        // Initialize Stripe
        const stripeInstance = await loadStripe(stripePublishableKey);
        setStripe(stripeInstance);

        // Check Apple Pay availability
        if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
          return;
        }

        // Convert amount to cents if it's in dollars
        const amountInCents = typeof totalAmount === 'string' 
          ? Math.round(parseFloat(totalAmount.replace(/[^0-9.-]+/g, '')) * 100)
          : totalAmount;

        // Create payment request
        const pr = stripeInstance.paymentRequest({
          country: 'US',
          currency: currency.toLowerCase(),
          total: {
            label: 'Total',
            amount: amountInCents,
          },
          requestPayerName: true,
          requestPayerEmail: true,
        });

        // Check if payment request is available
        const result = await pr.canMakePayment();
        if (!result || !result.applePay) {
          return;
        }

        // Set up event handlers
        pr.on('paymentmethod', async (ev) => {
          try {
            // Submit payment data to parent component
            await onPaymentSubmit({
              type: 'apple_pay',
              paymentMethodId: ev.paymentMethod.id,
              paymentMethod: ev.paymentMethod
            });

            // Complete the payment
            ev.complete('success');
          } catch (error) {
            console.error('Apple Pay payment failed:', error);
            ev.complete('fail');
            setError(error.message || 'Payment failed');
          } finally {
            setIsLoading(false);
          }
        });

        // Handle cancel event
        pr.on('cancel', () => {
          setIsLoading(false);
        });

        // Store payment request and mark as available
        setPaymentRequest(pr);
        setIsAvailable(true);

      } catch (error) {
        console.error('Failed to initialize Apple Pay:', error);
        setError('Failed to initialize Apple Pay');
      }
    };

    initializeApplePay();
  }, [stripePublishableKey, totalAmount, currency, onPaymentSubmit]);

  const handleApplePayClick = () => {
    if (!paymentRequest || !isAvailable || isLoading || inProgress) {
      setError('Apple Pay is not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Show payment sheet synchronously - this MUST be called directly in the user gesture
      paymentRequest.show();
    } catch (error) {
      console.error('Apple Pay error:', error);
      setError(error.message || 'Failed to show Apple Pay');
      setIsLoading(false);
    }
  };

  if (!isAvailable) {
    return (
      <div className={css.unavailable}>
        <p>
          <FormattedMessage id="ApplePayButton.unavailable" />
        </p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      {error && (
        <div className={css.error}>
          <p>{error}</p>
        </div>
      )}
      
      <button
        className={classNames(css.applePayButton, { [css.loading]: isLoading || inProgress })}
        onClick={handleApplePayClick}
        disabled={isLoading || inProgress}
        type="button"
      >
        <span className={css.applePayLogo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" 
              fill="currentColor"
            />
          </svg>
        </span>
        <span className={css.applePayText}>
          {isLoading || inProgress ? (
            <FormattedMessage id="ApplePayButton.processing" />
          ) : (
            <FormattedMessage id="ApplePayButton.payWith" />
          )}
        </span>
      </button>

      <div className={css.securityInfo}>
        <p>
          <FormattedMessage id="ApplePayButton.securityInfo" />
        </p>
      </div>
    </div>
  );
};

ApplePayButton.defaultProps = {
  currency: 'USD',
  inProgress: false,
  stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
};

ApplePayButton.propTypes = {
  totalAmount: string.isRequired,
  currency: string,
  onPaymentSubmit: func.isRequired,
  inProgress: bool,
  intl: intlShape.isRequired,
  stripePublishableKey: string,
};

export default injectIntl(ApplePayButton);