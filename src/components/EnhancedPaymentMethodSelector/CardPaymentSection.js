import React from 'react';
import { bool, func, string } from 'prop-types';
import { injectIntl, intlShape } from '../../util/reactIntl';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import CustomStripePaymentForm from '../CustomStripePaymentForm/CustomStripePaymentForm';

import css from './CardPaymentSection.module.css';

const CardPaymentSection = ({ 
  clientSecret,
  stripePublishableKey,
  onPaymentSubmit, 
  totalAmount,
  currency,
  inProgress, 
  intl
}) => {
  const stripePromise = loadStripe(stripePublishableKey);

  const handleCardPaymentSubmit = async (params) => {
    await onPaymentSubmit({
      type: 'card',
      ...params
    });
  };

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0570de',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  if (!stripePromise || !clientSecret) {
    return (
      <div className={css.loading}>
        <p>Loading payment form...</p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <Elements 
        stripe={stripePromise} 
        options={{ 
          clientSecret, 
          appearance,
          loader: 'auto'
        }}
      >
        <CustomStripePaymentForm
          clientSecret={clientSecret}
          handleCustomPaymentSubmit={handleCardPaymentSubmit}
          ctaButtonTxt="CardPaymentSection.submitPayment"
          currentUserEmail=""
          showInitialMessageInput={false}
          trxSubmitInProgress={inProgress}
        />
      </Elements>
    </div>
  );
};

CardPaymentSection.defaultProps = {
  currency: 'USD',
  inProgress: false,
  stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
};

CardPaymentSection.propTypes = {
  clientSecret: string.isRequired,
  stripePublishableKey: string,
  onPaymentSubmit: func.isRequired,
  totalAmount: string,
  currency: string,
  inProgress: bool,
  intl: intlShape.isRequired,
};

export default injectIntl(CardPaymentSection); 