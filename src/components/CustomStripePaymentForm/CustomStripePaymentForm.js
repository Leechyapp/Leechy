import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { compose } from 'redux';
import { FormattedMessage, injectIntl } from '../../util/reactIntl';
import { Heading, PrimaryButton } from '../../components';
import { string, func, bool } from 'prop-types';
import stripePaymentFormCSS from '../../containers/CheckoutPage/StripePaymentForm/StripePaymentForm.module.css';
import css from './CustomStripePaymentForm.module.scss';

const ELEMENT_OPTIONS = {
  fields: {
    billingDetails: {
      // name: 'never',
      // email: 'never'
    },
  },
};

const CheckoutForm = props => {
  const {
    showInitialMessageInput,
    authorDisplayName,
    intl,
    handleCustomPaymentSubmit,
    ctaButtonTxt,
    trxSubmitInProgress,
  } = props;

  const [status, setStatus] = useState();
  const [loading, setLoading] = useState(false);
  const [cardHolderName, setName] = useState('');
  const [stripeCustomerId, setStripeCustomerId] = useState();
  const [stripePaymentMethodId, setStripePaymentMethod] = useState();
  const [initialMessage, setInitialMessage] = useState();

  const stripe = useStripe();
  const elements = useElements();

  const getMessageInputPlaceholder = () => {
    if (showInitialMessageInput) {
      const messagePlaceholder = intl.formatMessage(
        { id: 'StripePaymentForm.messagePlaceholder' },
        { name: authorDisplayName }
      );

      const messageOptionalText = intl.formatMessage({
        id: 'StripePaymentForm.messageOptionalText',
      });

      const initialMessageLabel = intl.formatMessage(
        { id: 'StripePaymentForm.messageLabel' },
        { messageOptionalText: messageOptionalText }
      );

      return (
        <div>
          <br />
          <Heading as="h3" rootClassName={stripePaymentFormCSS.heading}>
            <FormattedMessage id="StripePaymentForm.messageHeading" />
          </Heading>
          <label for="CheckoutPagePaymentForm-message">{initialMessageLabel}</label>
          <textarea
            id="CheckoutPagePaymentForm-message"
            type="textarea"
            name="initialMessage"
            placeholder={messagePlaceholder}
            value={initialMessage}
            onChange={e => setInitialMessage(e.target.value)}
            className={[stripePaymentFormCSS.message, css.initialMessageTextArea].join(' ')}
          />
        </div>
      );
    } else {
      return null;
    }
  };

  const handleSubmit = event => {
    // Block native form submission.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }

    setLoading(true);

    if (stripeCustomerId && stripePaymentMethodId) {
      handleCustomPaymentSubmit({
        stripeCustomerId,
        stripePaymentMethodId,
        initialMessage,
      });
    } else {
      stripe
        .confirmSetup({
          elements,
          redirect: 'if_required',
          confirmParams: { return_url: window.location.href },
        })
        .then(({ setupIntent, error }) => {
          if (error) {
            setLoading(false);
            console.log(`setupIntent error`, error);
            console.error(error.message);
            setStatus(error.message);
          } else {
            setStripeCustomerId(setupIntent.customer);
            setStripePaymentMethod(setupIntent.payment_method);
            handleCustomPaymentSubmit({
              stripeCustomerId: setupIntent.customer,
              stripePaymentMethodId: setupIntent.payment_method,
              initialMessage,
            });
          }
        });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="cardHolderName">
        <FormattedMessage id={'CustomStripePaymentForm.fullName.label'} />
      </label>
      <input
        id="cardHolderName"
        className={css.cardHolderName}
        required
        placeholder="First and last name"
        value={cardHolderName}
        onChange={e => setName(e.target.value)}
      />
      <PaymentElement options={ELEMENT_OPTIONS} />
      {getMessageInputPlaceholder()}
      <div className={stripePaymentFormCSS.submitContainer}>
        <PrimaryButton
          className={stripePaymentFormCSS.submitButton}
          type="submit"
          inProgress={loading || trxSubmitInProgress}
          disabled={!stripe || loading || trxSubmitInProgress}
        >
          <FormattedMessage id={ctaButtonTxt} />
        </PrimaryButton>
        {status && <p>{status}</p>}
      </div>
    </form>
  );
};

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const CustomStripePaymentFormComponent = props => {
  const { clientSecret } = props;
  const [theme] = useState('stripe');

  return (
    <>
      {stripePromise && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme } }}>
          <CheckoutForm {...props} clientSecret={clientSecret} />
        </Elements>
      )}
    </>
  );
};

CustomStripePaymentFormComponent.defaultProps = {
  handleCustomPaymentSubmit: null,
  clientSecret: null,
  ctaButtonTxt: 'CustomStripePaymentForm.submitButton',
  currentUserEmail: null,
  authorDisplayName: null,
  intl: null,
  trxSubmitInProgress: false,
  showInitialMessageInput: false,
};

CustomStripePaymentFormComponent.propTypes = {
  handleCustomPaymentSubmit: func,
  clientSecret: string.isRequired,
  ctaButtonTxt: string,
  currentUserEmail: string.isRequired,
  authorDisplayName: string,
  intl: injectIntl,
  trxSubmitInProgress: bool.isRequired,
  showInitialMessageInput: bool.isRequired,
};

const CustomStripePaymentForm = compose(injectIntl)(CustomStripePaymentFormComponent);

export default CustomStripePaymentForm;
