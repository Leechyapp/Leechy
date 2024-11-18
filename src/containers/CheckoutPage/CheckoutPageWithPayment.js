import React, { useEffect, useRef, useState } from 'react';
import { arrayOf, bool, func, object, oneOfType, shape, string } from 'prop-types';

// Import contexts and util modules
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import { propTypes, LINE_ITEM_HOUR, DATE_TYPE_DATE, DATE_TYPE_DATETIME } from '../../util/types';
import { ensureTransaction } from '../../util/data';
import { createSlug } from '../../util/urlHelpers';
import { isTransactionInitiateListingNotFoundError } from '../../util/errors';
import { getProcess, isBookingProcessAlias } from '../../transactions/transaction';

// Import shared components
import { H3, H4, Heading, IconSpinner, NamedLink, OrderBreakdown, Page } from '../../components';

import {
  bookingDatesMaybe,
  getBillingDetails,
  getFormattedTotalPrice,
  getShippingDetailsMaybe,
  getTransactionTypeData,
  hasDefaultPaymentMethod,
  hasPaymentExpired,
  hasTransactionPassedPendingPayment,
  processCheckoutWithPayment,
  setOrderPageInitialValues,
} from './CheckoutPageTransactionHelpers.js';
import { getErrorMessages } from './ErrorMessages';

import CustomTopbar from './CustomTopbar';
import StripePaymentForm from './StripePaymentForm/StripePaymentForm';
import DetailsSideCard from './DetailsSideCard';
import MobileListingImage from './MobileListingImage';
import MobileOrderBreakdown from './MobileOrderBreakdown';

import css from './CheckoutPage.module.css';
import { InsuranceMethodEnum } from '../../enums/insurance-method.enum.js';

import stripePaymentFormCSS from './StripePaymentForm/StripePaymentForm.module.css';
import CustomStripePaymentForm from '../../components/CustomStripePaymentForm/CustomStripePaymentForm.js';
import {
  createBookingRequest,
  createSetupIntent,
  detachPaymentMethod,
  getPaymentMethodsList,
} from '../../util/api.js';
import CustomSavedCardDetails from '../../components/CustomSavedCardDetails/CustomSavedCardDetails.js';
import { useDispatch } from 'react-redux';
import { manageDisableScrolling } from '../../ducks/ui.duck.js';
import {
  parseLineItems,
  parsePayTotal,
  parseSharetribeCompatibleEmailData,
} from '../../util/priceBreakdownParser.js';
import PriceBreakdownFormatTypeEnum from '../../enums/price-breakdown-format-type.enum.js';

// Stripe PaymentIntent statuses, where user actions are already completed
// https://stripe.com/docs/payments/payment-intents/status
const STRIPE_PI_USER_ACTIONS_DONE_STATUSES = ['processing', 'requires_capture', 'succeeded'];

// Payment charge options
const ONETIME_PAYMENT = 'ONETIME_PAYMENT';
const PAY_AND_SAVE_FOR_LATER_USE = 'PAY_AND_SAVE_FOR_LATER_USE';
const USE_SAVED_CARD = 'USE_SAVED_CARD';

const paymentFlow = (selectedPaymentMethod, saveAfterOnetimePayment) => {
  // Payment mode could be 'replaceCard', but without explicit saveAfterOnetimePayment flag,
  // we'll handle it as one-time payment
  return selectedPaymentMethod === 'defaultCard'
    ? USE_SAVED_CARD
    : saveAfterOnetimePayment
    ? PAY_AND_SAVE_FOR_LATER_USE
    : ONETIME_PAYMENT;
};

/**
 * Construct orderParams object using pageData from session storage, shipping details, and optional payment params.
 * Note: This is used for both speculate transition and real transition
 *       - Speculate transition is called, when the the component is mounted. It's used to test if the data can go through the API validation
 *       - Real transition is made, when the user submits the StripePaymentForm.
 *
 * @param {Object} pageData data that's saved to session storage.
 * @param {Object} shippingDetails shipping address if applicable.
 * @param {Object} optionalPaymentParams (E.g. paymentMethod or setupPaymentMethodForSaving)
 * @param {Object} config app-wide configs. This contains hosted configs too.
 * @returns orderParams.
 */
const getOrderParams = (
  pageData,
  shippingDetails,
  optionalPaymentParams,
  config,
  speculatedTransaction = null
) => {
  const quantity = pageData.orderData?.quantity;
  const quantityMaybe = quantity ? { quantity } : {};
  const deliveryMethod = pageData.orderData?.deliveryMethod;
  const deliveryMethodMaybe = deliveryMethod ? { deliveryMethod } : {};

  const insuranceMethod = pageData.orderData?.insuranceMethod;
  const insuranceMethodMaybe = insuranceMethod ? { insuranceMethod } : {};

  let securityDepositMaybe = {};
  if (speculatedTransaction && insuranceMethod === InsuranceMethodEnum.SecurityDeposit) {
    const {
      securityDepositPercentageValue,
      totalPlusSecurityDepositPrice,
      securityDepositAmount,
      securityDepositTransferAmount,
    } = speculatedTransaction.attributes.protectedData;
    securityDepositMaybe = {
      securityDepositPercentageValue,
      totalPlusSecurityDepositPrice,
      securityDepositAmount,
      securityDepositTransferAmount,
    };
  }

  const { listingType, unitType } = pageData?.listing?.attributes?.publicData || {};
  const protectedDataMaybe = {
    protectedData: {
      ...getTransactionTypeData(listingType, unitType, config),
      ...deliveryMethodMaybe,
      ...shippingDetails,
      ...insuranceMethodMaybe,
      ...securityDepositMaybe,
    },
  };

  // These are the order parameters for the first payment-related transition
  // which is either initiate-transition or initiate-transition-after-enquiry
  const orderParams = {
    listingId: pageData?.listing?.id,
    ...deliveryMethodMaybe,
    ...quantityMaybe,
    ...bookingDatesMaybe(pageData.orderData?.bookingDates),
    ...protectedDataMaybe,
    ...optionalPaymentParams,
    ...insuranceMethodMaybe,
    ...securityDepositMaybe,
  };
  return orderParams;
};

const fetchSpeculatedTransactionIfNeeded = (orderParams, pageData, fetchSpeculatedTransaction) => {
  const tx = pageData ? pageData.transaction : null;
  const pageDataListing = pageData.listing;
  const processName =
    tx?.attributes?.processName ||
    pageDataListing?.attributes?.publicData?.transactionProcessAlias?.split('/')[0];
  const process = processName ? getProcess(processName) : null;

  // If transaction has passed payment-pending state, speculated tx is not needed.
  const shouldFetchSpeculatedTransaction =
    !!pageData?.listing?.id &&
    !!pageData.orderData &&
    !!process &&
    !hasTransactionPassedPendingPayment(tx, process);

  if (shouldFetchSpeculatedTransaction) {
    const processAlias = pageData.listing.attributes.publicData?.transactionProcessAlias;
    const transactionId = tx ? tx.id : null;
    const isInquiryInPaymentProcess =
      tx?.attributes?.lastTransition === process.transitions.INQUIRE;

    const requestTransition = isInquiryInPaymentProcess
      ? process.transitions.REQUEST_PAYMENT_AFTER_INQUIRY
      : process.transitions.REQUEST_PAYMENT;
    const isPrivileged = process.isPrivileged(requestTransition);

    fetchSpeculatedTransaction(
      orderParams,
      processAlias,
      transactionId,
      requestTransition,
      isPrivileged
    );
  }
};

/**
 * Load initial data for the page
 *
 * Since the data for the checkout is not passed in the URL (there
 * might be lots of options in the future), we must pass in the data
 * some other way. Currently the ListingPage sets the initial data
 * for the CheckoutPage's Redux store.
 *
 * For some cases (e.g. a refresh in the CheckoutPage), the Redux
 * store is empty. To handle that case, we store the received data
 * to window.sessionStorage and read it from there if no props from
 * the store exist.
 *
 * This function also sets of fetching the speculative transaction
 * based on this initial data.
 */
export const loadInitialDataForStripePayments = ({
  pageData,
  fetchSpeculatedTransaction,
  fetchStripeCustomer,
  config,
}) => {
  // Fetch currentUser with stripeCustomer entity
  // Note: since there's need for data loading in "componentWillMount" function,
  //       this is added here instead of loadData static function.
  fetchStripeCustomer();

  // Fetch speculated transaction for showing price in order breakdown
  // NOTE: if unit type is line-item/item, quantity needs to be added.
  // The way to pass it to checkout page is through pageData.orderData
  const shippingDetails = {};
  const optionalPaymentParams = {};
  const orderParams = getOrderParams(pageData, shippingDetails, optionalPaymentParams, config);

  fetchSpeculatedTransactionIfNeeded(orderParams, pageData, fetchSpeculatedTransaction);
};

const handleSubmit = (values, process, props, stripe, submitting, setSubmitting) => {
  if (submitting) {
    return;
  }
  setSubmitting(true);

  const {
    history,
    config,
    routeConfiguration,
    speculatedTransaction,
    currentUser,
    stripeCustomerFetched,
    paymentIntent,
    dispatch,
    onInitiateOrder,
    onConfirmCardPayment,
    onConfirmPayment,
    onSendMessage,
    onSavePaymentMethod,
    onSubmitCallback,
    pageData,
    setPageData,
    sessionStorageKey,
  } = props;
  const { card, message, paymentMethod: selectedPaymentMethod, formValues } = values;
  const { saveAfterOnetimePayment: saveAfterOnetimePaymentRaw } = formValues;

  const saveAfterOnetimePayment =
    Array.isArray(saveAfterOnetimePaymentRaw) && saveAfterOnetimePaymentRaw.length > 0;
  const selectedPaymentFlow = paymentFlow(selectedPaymentMethod, saveAfterOnetimePayment);
  const hasDefaultPaymentMethodSaved = hasDefaultPaymentMethod(stripeCustomerFetched, currentUser);
  const stripePaymentMethodId = hasDefaultPaymentMethodSaved
    ? currentUser?.stripeCustomer?.defaultPaymentMethod?.attributes?.stripePaymentMethodId
    : null;

  // If paymentIntent status is not waiting user action,
  // confirmCardPayment has been called previously.
  const hasPaymentIntentUserActionsDone =
    paymentIntent && STRIPE_PI_USER_ACTIONS_DONE_STATUSES.includes(paymentIntent.status);

  const requestPaymentParams = {
    pageData,
    speculatedTransaction,
    stripe,
    card,
    billingDetails: getBillingDetails(formValues, currentUser),
    message,
    paymentIntent,
    hasPaymentIntentUserActionsDone,
    stripePaymentMethodId,
    process,
    onInitiateOrder,
    onConfirmCardPayment,
    onConfirmPayment,
    onSendMessage,
    onSavePaymentMethod,
    sessionStorageKey,
    stripeCustomer: currentUser?.stripeCustomer,
    isPaymentFlowUseSavedCard: selectedPaymentFlow === USE_SAVED_CARD,
    isPaymentFlowPayAndSaveCard: selectedPaymentFlow === PAY_AND_SAVE_FOR_LATER_USE,
    setPageData,
  };

  const shippingDetails = getShippingDetailsMaybe(formValues);
  // Note: optionalPaymentParams contains Stripe paymentMethod,
  // but that can also be passed on Step 2
  // stripe.confirmCardPayment(stripe, { payment_method: stripePaymentMethodId })
  const optionalPaymentParams =
    selectedPaymentFlow === USE_SAVED_CARD && hasDefaultPaymentMethodSaved
      ? { paymentMethod: stripePaymentMethodId }
      : selectedPaymentFlow === PAY_AND_SAVE_FOR_LATER_USE
      ? { setupPaymentMethodForSaving: true }
      : {};

  // These are the order parameters for the first payment-related transition
  // which is either initiate-transition or initiate-transition-after-enquiry
  const orderParams = getOrderParams(
    pageData,
    shippingDetails,
    optionalPaymentParams,
    config,
    speculatedTransaction
  );

  // There are multiple XHR calls that needs to be made against Stripe API and Sharetribe Marketplace API on checkout with payments
  processCheckoutWithPayment(orderParams, requestPaymentParams)
    .then(response => {
      const { orderId, messageSuccess, paymentMethodSaved } = response;
      setSubmitting(false);

      const initialMessageFailedToTransaction = messageSuccess ? null : orderId;
      const orderDetailsPath = pathByRouteName('OrderDetailsPage', routeConfiguration, {
        id: orderId.uuid,
      });
      const initialValues = {
        initialMessageFailedToTransaction,
        savePaymentMethodFailed: !paymentMethodSaved,
      };

      setOrderPageInitialValues(initialValues, routeConfiguration, dispatch);
      onSubmitCallback();
      history.push(orderDetailsPath);
    })
    .catch(err => {
      console.error(err);
      setSubmitting(false);
    });
};

const onStripeInitialized = (stripe, process, props) => {
  const { paymentIntent, onRetrievePaymentIntent, pageData } = props;
  const tx = pageData?.transaction || null;

  // We need to get up to date PI, if payment is pending but it's not expired.
  const shouldFetchPaymentIntent =
    stripe &&
    !paymentIntent &&
    tx?.id &&
    process?.getState(tx) === process?.states.PENDING_PAYMENT &&
    !hasPaymentExpired(tx, process);

  if (shouldFetchPaymentIntent) {
    const { stripePaymentIntentClientSecret } =
      tx.attributes.protectedData?.stripePaymentIntents?.default || {};

    // Fetch up to date PaymentIntent from Stripe
    onRetrievePaymentIntent({ stripe, stripePaymentIntentClientSecret });
  }
};

export const CheckoutPageWithPayment = props => {
  const [submitting, setSubmitting] = useState(false);
  // Initialized stripe library is saved to state - if it's needed at some point here too.
  const [stripe, setStripe] = useState(null);

  // Custom Stripe Integration states
  const [showCustomPaymentForm, setCustomPaymentForm] = useState(false);
  const [customClientSecret, setCustomClientSecret] = useState(null);
  const [rootPaymentAPI, setPaymentApiId] = useState(1);
  const [customDefaultPaymentMethod, setCustomDefaultPaymentMethod] = useState(null);
  const [customPaymentMethodList, setCustomPaymentMethodList] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [setupIntentLoading, setSetupIntentLoading] = useState(false);
  const [trxSubmitInProgress, setTrxSubmitInProgress] = useState(false);
  const [initialMessage, setInitialMessage] = useState();
  const saveCardDetailsRef = useRef(null);

  const {
    scrollingDisabled,
    speculateTransactionError,
    speculatedTransaction: speculatedTransactionMaybe,
    isClockInSync,
    initiateOrderError,
    confirmPaymentError,
    intl,
    currentUser,
    confirmCardPaymentError,
    paymentIntent,
    retrievePaymentIntentError,
    stripeCustomerFetched,
    pageData,
    processName,
    listingTitle,
    title,
    config,
  } = props;

  // Since the listing data is already given from the ListingPage
  // and stored to handle refreshes, it might not have the possible
  // deleted or closed information in it. If the transaction
  // initiate or the speculative initiate fail due to the listing
  // being deleted or closed, we should dig the information from the
  // errors and not the listing data.
  const listingNotFound =
    isTransactionInitiateListingNotFoundError(speculateTransactionError) ||
    isTransactionInitiateListingNotFoundError(initiateOrderError);

  const { listing, transaction, orderData } = pageData;
  const existingTransaction = ensureTransaction(transaction);
  const speculatedTransaction = ensureTransaction(speculatedTransactionMaybe, {}, null);

  // If existing transaction has line-items, it has gone through one of the request-payment transitions.
  // Otherwise, we try to rely on speculatedTransaction for order breakdown data.
  const tx =
    existingTransaction?.attributes?.lineItems?.length > 0
      ? existingTransaction
      : speculatedTransaction;
  const timeZone = listing?.attributes?.availabilityPlan?.timezone;
  const transactionProcessAlias = listing?.attributes?.publicData?.transactionProcessAlias;
  const unitType = listing?.attributes?.publicData?.unitType;
  const lineItemUnitType = `line-item/${unitType}`;
  const dateType = lineItemUnitType === LINE_ITEM_HOUR ? DATE_TYPE_DATETIME : DATE_TYPE_DATE;
  const txBookingMaybe = tx?.booking?.id ? { booking: tx.booking, dateType, timeZone } : {};

  // Show breakdown only when (speculated?) transaction is loaded
  // (i.e. it has an id and lineItems)
  const breakdown =
    tx.id && tx.attributes.lineItems?.length > 0 ? (
      <OrderBreakdown
        className={css.orderBreakdown}
        userRole="customer"
        transaction={tx}
        {...txBookingMaybe}
        currency={config.currency}
        marketplaceName={config.marketplaceName}
      />
    ) : null;

  const totalPrice =
    tx?.attributes?.lineItems?.length > 0 ? getFormattedTotalPrice(tx, intl) : null;

  const process = processName ? getProcess(processName) : null;
  const transitions = process.transitions;
  const isPaymentExpired = hasPaymentExpired(existingTransaction, process, isClockInSync);

  // Allow showing page when currentUser is still being downloaded,
  // but show payment form only when user info is loaded.
  const showPaymentForm = !!(
    currentUser &&
    !listingNotFound &&
    !initiateOrderError &&
    !speculateTransactionError &&
    !retrievePaymentIntentError &&
    !isPaymentExpired
  );

  const firstImage = listing?.images?.length > 0 ? listing.images[0] : null;

  const listingLink = (
    <NamedLink
      name="ListingPage"
      params={{ id: listing?.id?.uuid, slug: createSlug(listingTitle) }}
    >
      <FormattedMessage id="CheckoutPage.errorlistingLinkText" />
    </NamedLink>
  );

  const errorMessages = getErrorMessages(
    listingNotFound,
    initiateOrderError,
    isPaymentExpired,
    retrievePaymentIntentError,
    speculateTransactionError,
    listingLink
  );

  const txTransitions = existingTransaction?.attributes?.transitions || [];
  const hasInquireTransition = txTransitions.find(tr => tr.transition === transitions.INQUIRE);
  const showInitialMessageInput = !hasInquireTransition;

  // Get first and last name of the current user and use it in the StripePaymentForm to autofill the name field
  const userName = currentUser?.attributes?.profile
    ? `${currentUser.attributes.profile.firstName} ${currentUser.attributes.profile.lastName}`
    : null;

  // If paymentIntent status is not waiting user action,
  // confirmCardPayment has been called previously.
  const hasPaymentIntentUserActionsDone =
    paymentIntent && STRIPE_PI_USER_ACTIONS_DONE_STATUSES.includes(paymentIntent.status);

  // If your marketplace works mostly in one country you can use initial values to select country automatically
  // e.g. {country: 'FI'}

  const initalValuesForStripePayment = { name: userName, recipientName: userName };
  const askShippingDetails =
    orderData?.deliveryMethod === 'shipping' &&
    !hasTransactionPassedPendingPayment(existingTransaction, process);

  /****************** START CUSTOM STRIPE  ******************/
  useEffect(() => {
    if (rootPaymentAPI !== 2) {
      handleChangePaymentAPI(2);
    }
    if (
      showCustomPaymentForm &&
      !customClientSecret &&
      rootPaymentAPI === 2 &&
      !customDefaultPaymentMethod &&
      customPaymentMethodList.length === 0
    ) {
      getCustomClientSecretAndSetForm();
    }
  }, [
    showCustomPaymentForm,
    customClientSecret,
    rootPaymentAPI,
    customDefaultPaymentMethod,
    customPaymentMethodList,
  ]);

  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const handleChangePaymentAPI = pmId => {
    setPaymentApiId(pmId);
    if (pmId === 2) {
      setPaymentMethodsLoading(true);
      getPaymentMethodsList({})
        .then(result => {
          if (result && result.length > 0) {
            setCustomPaymentMethodList(result);
            setCustomDefaultPaymentMethod(result[0]);
          } else {
            getCustomClientSecretAndSetForm();
          }
          setPaymentMethodsLoading(false);
        })
        .catch(error => {
          console.error(error);
          setPaymentMethodsLoading(false);
        });
    } else {
      setCustomClientSecret(null);
      setCustomPaymentMethodList([]);
      setCustomDefaultPaymentMethod(null);
    }
  };

  const deleteCardPaymentMethod = paymentMethodId => {
    detachPaymentMethod({ paymentMethodId })
      .then(() => {
        getPaymentMethodsList({})
          .then(result => {
            if (result && result.length > 0) {
              setCustomClientSecret(null);
              setCustomPaymentMethodList(result);
              setCustomDefaultPaymentMethod(result[0]);
            } else {
              setCustomPaymentForm(true);
              setCustomClientSecret(null);
              setCustomDefaultPaymentMethod(null);
              setCustomPaymentMethodList([]);
            }
          })
          .catch(error => {
            console.error(error);
          });
      })
      .catch(error => {
        console.error(error);
      });
  };

  const changeCustomPaymentMethod = paymentMethod => {
    setCustomPaymentForm(false);
    setCustomDefaultPaymentMethod(paymentMethod);
  };

  const getCustomClientSecretAndSetForm = () => {
    if (!customClientSecret) {
      setSetupIntentLoading(true);
      createSetupIntent({})
        .then(setupIntentId => {
          setCustomClientSecret(setupIntentId);
          setCustomPaymentForm(true);
          setSetupIntentLoading(false);
        })
        .catch(error => {
          setSetupIntentLoading(false);
          console.error(error);
        });
    } else {
      setCustomPaymentForm(true);
    }
  };

  const handleCustomPaymentSubmit = params => {
    const { stripePaymentMethodId } = params;
    const { booking, attributes } = speculatedTransaction;
    const { lineItems, payinTotal, payoutTotal } = attributes;
    const bookingStart = booking.attributes.start;
    const bookingEnd = booking.attributes.end;
    const displayStart = booking.attributes.displayStart;
    const displayEnd = booking.attributes.displayEnd;
    setTrxSubmitInProgress(true);
    createBookingRequest({
      initialMessage,
      orderParams: {
        listingId: listing.id,
        bookingStart,
        bookingEnd,
        displayStart,
        displayEnd,
        protectedData: {
          stripePaymentMethodId,
          lineItems: parseLineItems(lineItems, PriceBreakdownFormatTypeEnum.Json),
          payinTotal: parsePayTotal(payinTotal, PriceBreakdownFormatTypeEnum.Json),
          payoutTotal: parsePayTotal(payoutTotal, PriceBreakdownFormatTypeEnum.Json),
          emailData: parseSharetribeCompatibleEmailData({
            bookingStart,
            bookingEnd,
            displayStart,
            displayEnd,
            lineItems,
            payinTotal,
            payoutTotal,
            timeZone,
          }),
        },
      },
    })
      .then(({ transactionId }) => {
        redirectToOrderDetailsPage(transactionId);
      })
      .catch(err => {
        setTrxSubmitInProgress(false);
        console.error(err);
      });
  };

  const redirectToOrderDetailsPage = transactionId => {
    const { routeConfiguration, history } = props;
    history.push(
      pathByRouteName('OrderDetailsPage', routeConfiguration, {
        id: transactionId.uuid,
      })
    );
  };

  const authorDisplayName = listing?.author?.attributes?.profile?.displayName;

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
  /****************** END CUSTOM STRIPE  ******************/

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <CustomTopbar intl={intl} linkToExternalSite={config?.topbar?.logoLink} />
      <div className={css.contentContainer}>
        <MobileListingImage
          listingTitle={listingTitle}
          author={listing?.author}
          firstImage={firstImage}
          layoutListingImageConfig={config.layout.listingImage}
        />
        <div className={css.orderFormContainer}>
          <div className={css.headingContainer}>
            <H3 as="h1" className={css.heading}>
              {title}
            </H3>
            <H4 as="h2" className={css.detailsHeadingMobile}>
              <FormattedMessage id="CheckoutPage.listingTitle" values={{ listingTitle }} />
            </H4>
          </div>

          <MobileOrderBreakdown
            speculateTransactionErrorMessage={errorMessages.speculateTransactionErrorMessage}
            breakdown={breakdown}
          />

          {rootPaymentAPI === 1 ? (
            <section className={css.paymentContainer}>
              {errorMessages.initiateOrderErrorMessage}
              {errorMessages.listingNotFoundErrorMessage}
              {errorMessages.speculateErrorMessage}
              {errorMessages.retrievePaymentIntentErrorMessage}
              {errorMessages.paymentExpiredMessage}

              {showPaymentForm ? (
                <StripePaymentForm
                  className={css.paymentForm}
                  onSubmit={values =>
                    handleSubmit(values, process, props, stripe, submitting, setSubmitting)
                  }
                  inProgress={submitting}
                  formId="CheckoutPagePaymentForm"
                  authorDisplayName={listing?.author?.attributes?.profile?.displayName}
                  showInitialMessageInput={showInitialMessageInput}
                  initialValues={initalValuesForStripePayment}
                  initiateOrderError={initiateOrderError}
                  confirmCardPaymentError={confirmCardPaymentError}
                  confirmPaymentError={confirmPaymentError}
                  hasHandledCardPayment={hasPaymentIntentUserActionsDone}
                  loadingData={!stripeCustomerFetched}
                  defaultPaymentMethod={
                    hasDefaultPaymentMethod(stripeCustomerFetched, currentUser)
                      ? currentUser.stripeCustomer.defaultPaymentMethod
                      : null
                  }
                  paymentIntent={paymentIntent}
                  onStripeInitialized={stripe => {
                    setStripe(stripe);
                    return onStripeInitialized(stripe, process, props);
                  }}
                  askShippingDetails={askShippingDetails}
                  showPickUplocation={orderData?.deliveryMethod === 'pickup'}
                  listingLocation={listing?.attributes?.publicData?.location}
                  totalPrice={totalPrice}
                  locale={config.localization.locale}
                  stripePublishableKey={config.stripe.publishableKey}
                  marketplaceName={config.marketplaceName}
                  isBooking={isBookingProcessAlias(transactionProcessAlias)}
                  isFuzzyLocation={config.maps.fuzzy.enabled}
                />
              ) : null}
            </section>
          ) : (
            <section className={css.paymentContainer}>
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
              <Heading as="h3" rootClassName={stripePaymentFormCSS.heading}>
                <FormattedMessage id="StripePaymentForm.payWithHeading" />
              </Heading>
              {paymentMethodsLoading || setupIntentLoading ? (
                <IconSpinner />
              ) : (
                <>
                  {customDefaultPaymentMethod && customPaymentMethodList && (
                    <>
                      <CustomSavedCardDetails
                        onManageDisableScrolling={onManageDisableScrolling}
                        customDefaultPaymentMethod={customDefaultPaymentMethod}
                        customPaymentMethodList={customPaymentMethodList}
                        onChange={getCustomClientSecretAndSetForm}
                        onDeleteCardPaymentMethod={deleteCardPaymentMethod}
                        changeCustomPaymentMethod={changeCustomPaymentMethod}
                        ref={saveCardDetailsRef}
                      />
                      <br />
                      {!showCustomPaymentForm && (
                        <div className={stripePaymentFormCSS.submitContainer}>
                          <PrimaryButton
                            className={stripePaymentFormCSS.submitButton}
                            type="button"
                            inProgress={trxSubmitInProgress}
                            onClick={() =>
                              handleCustomPaymentSubmit({
                                stripePaymentMethodId: customDefaultPaymentMethod.id,
                                initialMessage,
                              })
                            }
                          >
                            <FormattedMessage id="StripePaymentForm.submitCustomStripePaymentInfo" />
                          </PrimaryButton>
                        </div>
                      )}
                    </>
                  )}
                  {showCustomPaymentForm && customClientSecret && (
                    <CustomStripePaymentForm
                      authorDisplayName={authorDisplayName}
                      clientSecret={customClientSecret}
                      ctaButtonTxt="CustomStripePaymentForm.submitBookingRequest"
                      handleCustomPaymentSubmit={handleCustomPaymentSubmit}
                      currentUserEmail={currentUser.attributes.email}
                      showInitialMessageInput={false}
                      trxSubmitInProgress={trxSubmitInProgress}
                    />
                  )}
                </>
              )}
            </section>
          )}
        </div>

        <DetailsSideCard
          listing={listing}
          listingTitle={listingTitle}
          author={listing?.author}
          firstImage={firstImage}
          layoutListingImageConfig={config.layout.listingImage}
          speculateTransactionErrorMessage={errorMessages.speculateTransactionErrorMessage}
          isInquiryProcess={false}
          processName={processName}
          breakdown={breakdown}
          intl={intl}
        />
      </div>
    </Page>
  );
};

CheckoutPageWithPayment.defaultProps = {
  initiateOrderError: null,
  confirmPaymentError: null,
  listing: null,
  orderData: {},
  speculateTransactionError: null,
  speculatedTransaction: null,
  transaction: null,
  currentUser: null,
  paymentIntent: null,
};

CheckoutPageWithPayment.propTypes = {
  scrollingDisabled: bool.isRequired,
  listing: propTypes.listing,
  orderData: object,
  fetchStripeCustomer: func.isRequired,
  stripeCustomerFetched: bool.isRequired,
  fetchSpeculatedTransaction: func.isRequired,
  speculateTransactionInProgress: bool.isRequired,
  speculateTransactionError: propTypes.error,
  speculatedTransaction: propTypes.transaction,
  transaction: propTypes.transaction,
  currentUser: propTypes.currentUser,
  params: shape({
    id: string,
    slug: string,
  }).isRequired,
  onConfirmPayment: func.isRequired,
  onInitiateOrder: func.isRequired,
  onConfirmCardPayment: func.isRequired,
  onRetrievePaymentIntent: func.isRequired,
  onSavePaymentMethod: func.isRequired,
  onSendMessage: func.isRequired,
  initiateOrderError: propTypes.error,
  confirmPaymentError: propTypes.error,
  // confirmCardPaymentError comes from Stripe so that's why we can't expect it to be in a specific form
  confirmCardPaymentError: oneOfType([propTypes.error, object]),
  paymentIntent: object,

  // from connect
  dispatch: func.isRequired,

  // from useIntl
  intl: intlShape.isRequired,

  // from useConfiguration
  config: object.isRequired,

  // from useRouteConfiguration
  routeConfiguration: arrayOf(propTypes.route).isRequired,

  // from useHistory
  history: shape({
    push: func.isRequired,
  }).isRequired,
};

export default CheckoutPageWithPayment;
