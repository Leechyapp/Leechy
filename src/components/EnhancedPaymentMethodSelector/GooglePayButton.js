import React, { useEffect, useState } from 'react';
import { bool, func, string } from 'prop-types';
import { injectIntl, intlShape, FormattedMessage } from '../../util/reactIntl';
import { loadStripe } from '@stripe/stripe-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import classNames from 'classnames';

import css from './GooglePayButton.module.css';

const GooglePayButton = ({ 
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
  const [isMobile, setIsMobile] = useState(false);
  const [useExternalFlow, setUseExternalFlow] = useState(false);

  useEffect(() => {
    // Detect if we're on mobile
    const mobile = Capacitor.isNativePlatform();
    setIsMobile(mobile);
    
    const initializeGooglePay = async () => {
      if (!stripePublishableKey) {
        return;
      }

      try {
        // For mobile devices, always enable external flow immediately
        if (mobile) {
          setIsAvailable(true);
          setUseExternalFlow(true);
          return; // Skip Stripe Payment Request setup for mobile
        }
        
        // For web, try Stripe Payment Request API
        const stripeInstance = await loadStripe(stripePublishableKey);
        setStripe(stripeInstance);
        
        if (stripeInstance) {
          await setupPaymentRequest(stripeInstance);
        }
      } catch (error) {
        console.error('Failed to initialize Google Pay:', error);
        setError('Failed to initialize payment system');
      }
    };

    const setupPaymentRequest = async (stripeInstance) => {
      // Convert amount to cents if it's in dollars
      const amountInCents = typeof totalAmount === 'string' 
        ? Math.round(parseFloat(totalAmount.replace(/[^0-9.-]+/g, '')) * 100)
        : totalAmount;

      const paymentRequestConfig = {
        country: 'US',
        currency: currency.toLowerCase(),
        total: {
          label: 'Total',
          amount: amountInCents,
        },
        requestPayerName: false,
        requestPayerEmail: false,
        requestShipping: false,
        requestPayerPhone: false,
      };

      const pr = stripeInstance.paymentRequest(paymentRequestConfig);

      // Check if Google Pay is available (web only)
      try {
        const result = await pr.canMakePayment();
        
        if (result && result.googlePay) {
          setIsAvailable(true);
          setPaymentRequest(pr);
          setUseExternalFlow(false);
          
          // Set up event handlers for web flow
          setupPaymentRequestHandlers(pr);
        }
      } catch (availabilityError) {
        console.error('Error checking payment availability:', availabilityError);
      }
    };

    const setupPaymentRequestHandlers = (pr) => {
      // Handle payment method
      pr.on('paymentmethod', async (ev) => {
        try {
          // Submit payment data to parent component
          await onPaymentSubmit({
            type: 'google_pay',
            paymentMethodId: ev.paymentMethod.id,
            paymentMethod: ev.paymentMethod
          });
          
          // Complete the payment
          ev.complete('success');
        } catch (error) {
          console.error('Payment processing failed:', error);
          ev.complete('fail');
          setError(error.message || 'Payment failed');
        }
      });

      // Handle payment request errors
      pr.on('cancel', () => {
        // Payment cancelled by user
      });
    };

    initializeGooglePay();
  }, [stripePublishableKey, totalAmount, currency, onPaymentSubmit]);

  const handleGooglePayClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (useExternalFlow) {
        await handleExternalGooglePay();
      } else {
        await handleInAppGooglePay();
      }
    } catch (error) {
      console.error('Error with Google Pay:', error);
      
      // Provide user-friendly error messages
      if (error.message && error.message.includes('not supported')) {
        setError('Google Pay is not supported on this device or browser');
      } else if (error.message && error.message.includes('cancelled')) {
        setError('Payment was cancelled');
      } else {
        setError('Unable to process Google Pay. Please try a different payment method.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInAppGooglePay = async () => {
    if (!paymentRequest) {
      throw new Error('Payment request not available');
    }

    // Double-check availability before showing
    const canMakePayment = await paymentRequest.canMakePayment();
    if (!canMakePayment || !canMakePayment.googlePay) {
      throw new Error('Google Pay not available at payment time');
    }

    // Show the payment request
    paymentRequest.show();
  };

  const handleExternalGooglePay = async () => {
    try {
      // Create a Stripe Checkout session for Google Pay
      const response = await fetch('/api/stripe-checkout/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          currency: currency,
          payment_method_types: ['card', 'google_pay'],
          mode: 'payment',
          success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/payment-cancelled`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      // Open Stripe Checkout in external browser
      await Browser.open({
        url: url,
        windowName: '_system',
        presentationStyle: 'popover'
      });

      // Note: Payment completion will be handled via the success_url redirect
      // The parent component should listen for app resume and check payment status
      
    } catch (error) {
      console.error('External Google Pay flow failed:', error);
      throw error;
    }
  };

  // Don't render if not available
  if (!isAvailable) {
    return null;
  }

  return (
    <div className={css.root}>
      {error && (
        <div className={css.error}>
          <p>{error}</p>
        </div>
      )}
      
      <button
        className={classNames(css.googlePayButton, { [css.loading]: isLoading || inProgress })}
        onClick={handleGooglePayClick}
        disabled={isLoading || inProgress}
        type="button"
      >
        <span className={css.googlePayLogo}>
          <svg width="24" height="24" viewBox="0 0 41 17" fill="none">
            <g clipPath="url(#clip0)">
              <path d="M19.526 2.635v4.083h2.518c.6 0 1.096-.202 1.488-.605.403-.402.605-.882.605-1.438 0-.544-.202-1.018-.605-1.421-.392-.403-.888-.605-1.488-.605h-2.518v-.014zm0 5.52v4.736h-1.504V1.198h4.022c1.158 0 2.135.403 2.93 1.209.796.796 1.198 1.756 1.198 2.878 0 1.123-.402 2.082-1.198 2.878-.795.796-1.772 1.198-2.93 1.198h-2.518v.794z" fill="#5F6368"/>
              <path d="M26.194 1.198v1.504h-1.504V1.198h1.504zm0 2.97v8.825h-1.504V4.168h1.504z" fill="#5F6368"/>
              <path d="M35.498 5.814c-.403-.402-.888-.605-1.465-.605-.578 0-1.063.203-1.466.605-.402.403-.605.888-.605 1.466 0 .577.203 1.062.605 1.465.403.402.888.605 1.466.605.577 0 1.062-.203 1.465-.605.403-.403.605-.888.605-1.465 0-.578-.202-1.063-.605-1.466zm.807 4.022c-.48.48-1.041.72-1.683.72-.642 0-1.204-.24-1.684-.72-.479-.481-.72-1.042-.72-1.684 0-.643.241-1.204.72-1.684.48-.48 1.042-.72 1.684-.72.642 0 1.203.24 1.683.72.48.48.72 1.041.72 1.684 0 .642-.24 1.203-.72 1.684z" fill="#5F6368"/>
              <path d="M40.905 4.168v8.825h-1.504V11.29c-.403.481-.888.72-1.465.72-.577 0-1.062-.202-1.465-.605-.402-.403-.605-.888-.605-1.465V4.168h1.504v5.777c0 .202.078.384.234.544.156.159.337.238.544.238.206 0 .387-.079.544-.238.156-.16.234-.342.234-.544V4.168h1.013z" fill="#5F6368"/>
              <path d="M13.473 7.281c0 .641-.125 1.23-.374 1.768-.249.537-.592.994-1.029 1.371-.437.377-.94.659-1.508.847-.569.188-1.177.282-1.826.282-1.177 0-2.191-.389-3.041-1.166C4.696 9.605 4.271 8.591 4.271 7.414c0-1.178.425-2.192 1.274-3.042.849-.851 1.875-1.276 3.078-1.276.641 0 1.23.125 1.768.374.537.249.994.592 1.371 1.029l-1.029 1.029c-.282-.359-.659-.659-1.132-.9-.473-.241-.982-.362-1.526-.362-.718 0-1.327.249-1.826.748-.5.499-.748 1.108-.748 1.826 0 .718.248 1.327.748 1.826.499.5 1.108.748 1.826.748.641 0 1.177-.188 1.609-.564.432-.376.659-.847.682-1.414h-2.29V6.252h3.666c.047.188.071.376.071.564z" fill="#4285F4"/>
            </g>
          </svg>
        </span>
        <span className={css.googlePayText}>
          {isLoading || inProgress ? (
            <FormattedMessage id="GooglePayButton.processing" />
          ) : useExternalFlow ? (
            <FormattedMessage id="GooglePayButton.payWithSecure" />
          ) : (
            <FormattedMessage id="GooglePayButton.payWith" />
          )}
        </span>
      </button>

      <div className={css.securityInfo}>
        <p>
          {useExternalFlow ? (
            <FormattedMessage id="GooglePayButton.externalSecurityInfo" />
          ) : (
            <FormattedMessage id="GooglePayButton.securityInfo" />
          )}
        </p>
      </div>
    </div>
  );
};

GooglePayButton.defaultProps = {
  currency: 'USD',
  inProgress: false,
  stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
};

GooglePayButton.propTypes = {
  totalAmount: string.isRequired,
  currency: string,
  onPaymentSubmit: func.isRequired,
  inProgress: bool,
  intl: intlShape.isRequired,
  stripePublishableKey: string,
};

export default injectIntl(GooglePayButton);