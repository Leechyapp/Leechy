import pick from 'lodash/pick';
import pickBy from 'lodash/pickBy';
import isEmpty from 'lodash/isEmpty';

import { types as sdkTypes, createImageVariantConfig } from '../../util/sdkLoader';
import { findNextBoundary, getStartOf, monthIdString } from '../../util/dates';
import { isTransactionsTransitionInvalidTransition, storableError } from '../../util/errors';
import {
  acceptBookingRequest,
  chargeSecurityDeposit,
  fetchMessageFiles,
  sendPushNotification,
  transactionLineItems,
} from '../../util/api';
import * as log from '../../util/log';
import {
  updatedEntities,
  denormalisedEntities,
  denormalisedResponseEntities,
} from '../../util/data';
import {
  resolveLatestProcessName,
  getProcess,
  isBookingProcess,
} from '../../transactions/transaction';

import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchCurrentUserNotifications } from '../../ducks/user.duck';
import { transitions } from '../../transactions/transactionProcessBooking';
import { PushNotificationCodeEnum } from '../../enums/push-notification-code.enum';
import PriceBreakdownFormatTypeEnum from '../../enums/price-breakdown-format-type.enum';
import { parseLineItems, parsePayTotal } from '../../util/priceBreakdownParser';
import { verifyCaptcha } from '../../util/useCaptcha';

const { UUID } = sdkTypes;

const MESSAGES_PAGE_SIZE = 100;
const REVIEW_TX_INCLUDES = ['reviews', 'reviews.author', 'reviews.subject'];

// ================ Action types ================ //

export const SET_INITIAL_VALUES = 'app/TransactionPage/SET_INITIAL_VALUES';

export const FETCH_TRANSACTION_REQUEST = 'app/TransactionPage/FETCH_TRANSACTION_REQUEST';
export const FETCH_TRANSACTION_SUCCESS = 'app/TransactionPage/FETCH_TRANSACTION_SUCCESS';
export const FETCH_TRANSACTION_ERROR = 'app/TransactionPage/FETCH_TRANSACTION_ERROR';

export const FETCH_TRANSITIONS_REQUEST = 'app/TransactionPage/FETCH_TRANSITIONS_REQUEST';
export const FETCH_TRANSITIONS_SUCCESS = 'app/TransactionPage/FETCH_TRANSITIONS_SUCCESS';
export const FETCH_TRANSITIONS_ERROR = 'app/TransactionPage/FETCH_TRANSITIONS_ERROR';

export const TRANSITION_REQUEST = 'app/TransactionPage/MARK_RECEIVED_REQUEST';
export const TRANSITION_SUCCESS = 'app/TransactionPage/TRANSITION_SUCCESS';
export const TRANSITION_ERROR = 'app/TransactionPage/TRANSITION_ERROR';

export const FETCH_MESSAGES_REQUEST = 'app/TransactionPage/FETCH_MESSAGES_REQUEST';
export const FETCH_MESSAGES_SUCCESS = 'app/TransactionPage/FETCH_MESSAGES_SUCCESS';
export const FETCH_MESSAGES_ERROR = 'app/TransactionPage/FETCH_MESSAGES_ERROR';

export const SEND_MESSAGE_REQUEST = 'app/TransactionPage/SEND_MESSAGE_REQUEST';
export const SEND_MESSAGE_SUCCESS = 'app/TransactionPage/SEND_MESSAGE_SUCCESS';
export const SEND_MESSAGE_ERROR = 'app/TransactionPage/SEND_MESSAGE_ERROR';

export const SEND_REVIEW_REQUEST = 'app/TransactionPage/SEND_REVIEW_REQUEST';
export const SEND_REVIEW_SUCCESS = 'app/TransactionPage/SEND_REVIEW_SUCCESS';
export const SEND_REVIEW_ERROR = 'app/TransactionPage/SEND_REVIEW_ERROR';

export const FETCH_TIME_SLOTS_REQUEST = 'app/TransactionPage/FETCH_TIME_SLOTS_REQUEST';
export const FETCH_TIME_SLOTS_SUCCESS = 'app/TransactionPage/FETCH_TIME_SLOTS_SUCCESS';
export const FETCH_TIME_SLOTS_ERROR = 'app/TransactionPage/FETCH_TIME_SLOTS_ERROR';

export const FETCH_LINE_ITEMS_REQUEST = 'app/TransactionPage/FETCH_LINE_ITEMS_REQUEST';
export const FETCH_LINE_ITEMS_SUCCESS = 'app/TransactionPage/FETCH_LINE_ITEMS_SUCCESS';
export const FETCH_LINE_ITEMS_ERROR = 'app/TransactionPage/FETCH_LINE_ITEMS_ERROR';

export const FETCH_FILES_SUCCESS = 'app/TransactionPage/FETCH_FILES_SUCCESS';
export const UPDATE_FILES_SUCCESS = 'app/TransactionPage/UPDATE_FILES_SUCCESS';

export const SET_STRIPE_PAYOUTS_DISABLED = 'app/TransactionPage/SET_STRIPE_PAYOUTS_DISABLED';

// ================ Reducer ================ //

const initialState = {
  fetchTransactionInProgress: false,
  fetchTransactionError: null,
  transactionRef: null,
  transitionInProgress: null,
  transitionError: null,
  fetchMessagesInProgress: false,
  fetchMessagesError: null,
  totalMessages: 0,
  totalMessagePages: 0,
  oldestMessagePageFetched: 0,
  messages: [],
  initialMessageFailedToTransaction: null,
  savePaymentMethodFailed: false,
  sendMessageInProgress: false,
  sendMessageError: null,
  sendReviewInProgress: false,
  sendReviewError: null,
  monthlyTimeSlots: {
    // '2022-03': {
    //   timeSlots: [],
    //   fetchTimeSlotsError: null,
    //   fetchTimeSlotsInProgress: null,
    // },
  },
  fetchTransitionsInProgress: false,
  fetchTransitionsError: null,
  processTransitions: null,
  lineItems: null,
  fetchLineItemsInProgress: false,
  fetchLineItemsError: null,
};

// Merge entity arrays using ids, so that conflicting items in newer array (b) overwrite old values (a).
// const a = [{ id: { uuid: 1 } }, { id: { uuid: 3 } }];
// const b = [{ id: : { uuid: 2 } }, { id: : { uuid: 1 } }];
// mergeEntityArrays(a, b)
// => [{ id: { uuid: 3 } }, { id: : { uuid: 2 } }, { id: : { uuid: 1 } }]
const mergeEntityArrays = (a, b) => {
  return a.filter(aEntity => !b.find(bEntity => aEntity.id.uuid === bEntity.id.uuid)).concat(b);
};

export default function transactionPageReducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case SET_INITIAL_VALUES:
      return { ...initialState, ...payload };

    case FETCH_TRANSACTION_REQUEST:
      return { ...state, fetchTransactionInProgress: true, fetchTransactionError: null };
    case FETCH_TRANSACTION_SUCCESS: {
      const transactionRef = { id: payload.data.data.id, type: 'transaction' };
      return { ...state, fetchTransactionInProgress: false, transactionRef };
    }
    case FETCH_TRANSACTION_ERROR:
      console.error(payload); // eslint-disable-line
      return { ...state, fetchTransactionInProgress: false, fetchTransactionError: payload };

    case FETCH_TRANSITIONS_REQUEST:
      return { ...state, fetchTransitionsInProgress: true, fetchTransitionsError: null };
    case FETCH_TRANSITIONS_SUCCESS:
      return { ...state, fetchTransitionsInProgress: false, processTransitions: payload };
    case FETCH_TRANSITIONS_ERROR:
      console.error(payload); // eslint-disable-line
      return { ...state, fetchTransitionsInProgress: false, fetchTransitionsError: payload };

    case TRANSITION_REQUEST:
      return {
        ...state,
        transitionInProgress: payload,
        transitionError: null,
      };
    case TRANSITION_SUCCESS:
      return { ...state, transitionInProgress: null };
    case TRANSITION_ERROR:
      return {
        ...state,
        transitionInProgress: null,
        transitionError: payload,
      };

    case FETCH_MESSAGES_REQUEST:
      return { ...state, fetchMessagesInProgress: true, fetchMessagesError: null };
    case FETCH_MESSAGES_SUCCESS: {
      const oldestMessagePageFetched =
        state.oldestMessagePageFetched > payload.page
          ? state.oldestMessagePageFetched
          : payload.page;
      return {
        ...state,
        fetchMessagesInProgress: false,
        messages: mergeEntityArrays(state.messages, payload.messages),
        totalMessages: payload.totalItems,
        totalMessagePages: payload.totalPages,
        oldestMessagePageFetched,
      };
    }
    case FETCH_MESSAGES_ERROR:
      return { ...state, fetchMessagesInProgress: false, fetchMessagesError: payload };

    case SEND_MESSAGE_REQUEST:
      return {
        ...state,
        sendMessageInProgress: true,
        sendMessageError: null,
        initialMessageFailedToTransaction: null,
      };
    case SEND_MESSAGE_SUCCESS:
      return { ...state, sendMessageInProgress: false };
    case SEND_MESSAGE_ERROR:
      return { ...state, sendMessageInProgress: false, sendMessageError: payload };

    case SEND_REVIEW_REQUEST:
      return { ...state, sendReviewInProgress: true, sendReviewError: null };
    case SEND_REVIEW_SUCCESS:
      return { ...state, sendReviewInProgress: false };
    case SEND_REVIEW_ERROR:
      return { ...state, sendReviewInProgress: false, sendReviewError: payload };

    case FETCH_TIME_SLOTS_REQUEST: {
      const monthlyTimeSlots = {
        ...state.monthlyTimeSlots,
        [payload]: {
          ...state.monthlyTimeSlots[payload],
          fetchTimeSlotsError: null,
          fetchTimeSlotsInProgress: true,
        },
      };
      return { ...state, monthlyTimeSlots };
    }
    case FETCH_TIME_SLOTS_SUCCESS: {
      const monthId = payload.monthId;
      const monthlyTimeSlots = {
        ...state.monthlyTimeSlots,
        [monthId]: {
          ...state.monthlyTimeSlots[monthId],
          fetchTimeSlotsInProgress: false,
          timeSlots: payload.timeSlots,
        },
      };
      return { ...state, monthlyTimeSlots };
    }
    case FETCH_TIME_SLOTS_ERROR: {
      const monthId = payload.monthId;
      const monthlyTimeSlots = {
        ...state.monthlyTimeSlots,
        [monthId]: {
          ...state.monthlyTimeSlots[monthId],
          fetchTimeSlotsInProgress: false,
          fetchTimeSlotsError: payload.error,
        },
      };
      return { ...state, monthlyTimeSlots };
    }

    case FETCH_LINE_ITEMS_REQUEST:
      return { ...state, fetchLineItemsInProgress: true, fetchLineItemsError: null };
    case FETCH_LINE_ITEMS_SUCCESS:
      return { ...state, fetchLineItemsInProgress: false, lineItems: payload };
    case FETCH_LINE_ITEMS_ERROR:
      return { ...state, fetchLineItemsInProgress: false, fetchLineItemsError: payload };

    case FETCH_FILES_SUCCESS:
      return { ...state, files: payload };
    case UPDATE_FILES_SUCCESS:
      return {
        ...state,
        files: {
          ...state.files,
          ...payload.file,
        },
      };

    case SET_STRIPE_PAYOUTS_DISABLED:
      return { ...state, stripePayoutsDisabled: payload.stripePayoutsDisabled };

    default:
      return state;
  }
}

// ================ Selectors ================ //

export const transitionInProgress = state => {
  return state.TransactionPage.transitionInProgress;
};

// ================ Action creators ================ //
export const setInitialValues = initialValues => ({
  type: SET_INITIAL_VALUES,
  payload: pick(initialValues, Object.keys(initialState)),
});

const fetchTransactionRequest = () => ({ type: FETCH_TRANSACTION_REQUEST });
const fetchTransactionSuccess = response => ({
  type: FETCH_TRANSACTION_SUCCESS,
  payload: response,
});
const fetchTransactionError = e => ({ type: FETCH_TRANSACTION_ERROR, error: true, payload: e });

const fetchTransitionsRequest = () => ({ type: FETCH_TRANSITIONS_REQUEST });
const fetchTransitionsSuccess = response => ({
  type: FETCH_TRANSITIONS_SUCCESS,
  payload: response,
});
const fetchTransitionsError = e => ({ type: FETCH_TRANSITIONS_ERROR, error: true, payload: e });

const transitionRequest = transitionName => ({ type: TRANSITION_REQUEST, payload: transitionName });
const transitionSuccess = () => ({ type: TRANSITION_SUCCESS });
const transitionPause = () => ({ type: TRANSITION_SUCCESS });
const transitionError = e => ({ type: TRANSITION_ERROR, error: true, payload: e });

const fetchMessagesRequest = () => ({ type: FETCH_MESSAGES_REQUEST });
const fetchMessagesSuccess = (messages, pagination) => ({
  type: FETCH_MESSAGES_SUCCESS,
  payload: { messages, ...pagination },
});
const fetchMessagesError = e => ({ type: FETCH_MESSAGES_ERROR, error: true, payload: e });

const sendMessageRequest = () => ({ type: SEND_MESSAGE_REQUEST });
const sendMessageSuccess = () => ({ type: SEND_MESSAGE_SUCCESS });
const sendMessageError = e => ({ type: SEND_MESSAGE_ERROR, error: true, payload: e });

const sendReviewRequest = () => ({ type: SEND_REVIEW_REQUEST });
const sendReviewSuccess = () => ({ type: SEND_REVIEW_SUCCESS });
const sendReviewError = e => ({ type: SEND_REVIEW_ERROR, error: true, payload: e });

export const fetchTimeSlotsRequest = monthId => ({
  type: FETCH_TIME_SLOTS_REQUEST,
  payload: monthId,
});
export const fetchTimeSlotsSuccess = (monthId, timeSlots) => ({
  type: FETCH_TIME_SLOTS_SUCCESS,
  payload: { timeSlots, monthId },
});
export const fetchTimeSlotsError = (monthId, error) => ({
  type: FETCH_TIME_SLOTS_ERROR,
  error: true,
  payload: { monthId, error },
});

export const fetchLineItemsRequest = () => ({ type: FETCH_LINE_ITEMS_REQUEST });
export const fetchLineItemsSuccess = lineItems => ({
  type: FETCH_LINE_ITEMS_SUCCESS,
  payload: lineItems,
});
export const fetchLineItemsError = error => ({
  type: FETCH_LINE_ITEMS_ERROR,
  error: true,
  payload: error,
});

export const fetchFilesSuccess = files => ({
  type: FETCH_FILES_SUCCESS,
  payload: files,
});
export const updateFilesSuccess = uploadedFile => ({
  type: UPDATE_FILES_SUCCESS,
  payload: uploadedFile,
});

export const setStripePayoutsDisabled = stripePayoutsDisabled => ({
  type: SET_STRIPE_PAYOUTS_DISABLED,
  payload: { stripePayoutsDisabled },
});

// ================ Thunks ================ //

const timeSlotsRequest = params => (dispatch, getState, sdk) => {
  return sdk.timeslots.query(params).then(response => {
    return denormalisedResponseEntities(response);
  });
};

export const fetchTimeSlots = (listingId, start, end, timeZone) => (dispatch, getState, sdk) => {
  const monthId = monthIdString(start, timeZone);

  dispatch(fetchTimeSlotsRequest(monthId));

  // The maximum pagination page size for timeSlots is 500
  const extraParams = {
    perPage: 500,
    page: 1,
  };

  return dispatch(timeSlotsRequest({ listingId, start, end, ...extraParams }))
    .then(timeSlots => {
      dispatch(fetchTimeSlotsSuccess(monthId, timeSlots));
    })
    .catch(e => {
      dispatch(fetchTimeSlotsError(monthId, storableError(e)));
    });
};

// Helper function for loadData call.
const fetchMonthlyTimeSlots = (dispatch, listing) => {
  const hasWindow = typeof window !== 'undefined';
  const attributes = listing.attributes;
  // Listing could be ownListing entity too, so we just check if attributes key exists
  const hasTimeZone =
    attributes && attributes.availabilityPlan && attributes.availabilityPlan.timezone;

  // Fetch time-zones on client side only.
  if (hasWindow && listing.id && hasTimeZone) {
    const tz = listing.attributes.availabilityPlan.timezone;
    const nextBoundary = findNextBoundary(new Date(), 'hour', tz);

    const nextMonth = getStartOf(nextBoundary, 'month', tz, 1, 'months');
    const nextAfterNextMonth = getStartOf(nextMonth, 'month', tz, 1, 'months');

    return Promise.all([
      dispatch(fetchTimeSlots(listing.id, nextBoundary, nextMonth, tz)),
      dispatch(fetchTimeSlots(listing.id, nextMonth, nextAfterNextMonth, tz)),
    ]);
  }

  // By default return an empty array
  return Promise.all([]);
};

// Helper to fetch correct image variants for different thunk calls
const getImageVariants = listingImageConfig => {
  const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } = listingImageConfig;
  const aspectRatio = aspectHeight / aspectWidth;
  return {
    'fields.image': [
      // Profile images
      'variants.square-small',
      'variants.square-small2x',

      // Listing images:
      `variants.${variantPrefix}`,
      `variants.${variantPrefix}-2x`,
    ],
    ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
    ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
  };
};

const listingRelationship = txResponse => {
  return txResponse.data.data.relationships.listing.data;
};

export const fetchTransaction = (id, txRole, config) => (dispatch, getState, sdk) => {
  dispatch(fetchTransactionRequest());
  let txResponse = null;

  return sdk.transactions
    .show(
      {
        id,
        include: [
          'customer',
          'customer.profileImage',
          'provider',
          'provider.profileImage',
          'listing',
          'listing.currentStock',
          'booking',
          'reviews',
          'reviews.author',
          'reviews.subject',
        ],
        ...getImageVariants(config.layout.listingImage),
      },
      { expand: true }
    )
    .then(response => {
      txResponse = response;
      const listingId = listingRelationship(response).id;
      const entities = updatedEntities({}, response.data);
      const listingRef = { id: listingId, type: 'listing' };
      const transactionRef = { id, type: 'transaction' };
      const denormalised = denormalisedEntities(entities, [listingRef, transactionRef]);
      const listing = denormalised[0];
      const transaction = denormalised[1];
      const processName = resolveLatestProcessName(transaction.attributes.processName);
      try {
        const process = getProcess(processName);
        const isInquiry = process.getState(transaction) === process.states.INQUIRY;

        // Fetch time slots for transactions that are in inquired state
        const canFetchTimeslots =
          txRole === 'customer' && isBookingProcess(processName) && isInquiry;

        if (canFetchTimeslots) {
          fetchMonthlyTimeSlots(dispatch, listing);
        }
      } catch (error) {
        console.log(`transaction process (${processName}) was not recognized`);
      }

      const canFetchListing = listing && listing.attributes && !listing.attributes.deleted;
      if (canFetchListing) {
        return sdk.listings.show({
          id: listingId,
          include: ['author', 'author.profileImage', 'images'],
          ...getImageVariants(config.layout.listingImage),
        });
      } else {
        return response;
      }
    })
    .then(response => {
      const listingFields = config?.listing?.listingFields;
      const sanitizeConfig = { listingFields };
      try {
        const protectedData = txResponse.data.data.attributes.protectedData;
        const lineItems = protectedData?.lineItems;
        const payinTotal = protectedData?.payinTotal;
        const payoutTotal = protectedData?.payoutTotal;
        if (lineItems) {
          txResponse.data.data.attributes.lineItems = parseLineItems(
            lineItems,
            PriceBreakdownFormatTypeEnum.Sharetribe
          );
        }
        if (payinTotal) {
          txResponse.data.data.attributes.payinTotal = parsePayTotal(
            payinTotal,
            PriceBreakdownFormatTypeEnum.Sharetribe
          );
        }
        if (payoutTotal) {
          txResponse.data.data.attributes.payoutTotal = parsePayTotal(
            payoutTotal,
            PriceBreakdownFormatTypeEnum.Sharetribe
          );
        }
      } catch (error) {
        console.error(`Error merging data`, error);
      }
      dispatch(addMarketplaceEntities(txResponse, sanitizeConfig));
      dispatch(addMarketplaceEntities(response, sanitizeConfig));
      dispatch(fetchTransactionSuccess(txResponse));
      return response;
    })
    .catch(e => {
      dispatch(fetchTransactionError(storableError(e)));
      throw e;
    });
};

const delay = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const refreshTx = (sdk, txId) => sdk.transactions.show({ id: txId }, { expand: true });
const refreshTransactionEntity = (sdk, txId, dispatch, delayValue = 3000) => {
  delay(delayValue)
    .then(() => refreshTx(sdk, txId))
    .then(async response => {
      dispatch(addMarketplaceEntities(response));
      const transactionId = response.data.data.id;
      return await fetchMessageFiles({ transactionId })
        .then(files => {
          dispatch(fetchFilesSuccess(files));
          return response;
        })
        .catch(err => {
          console.error(err);
          return response;
        });
    })
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      const lastTransition = response?.data?.data?.attributes?.lastTransition;
      // We'll make another attempt if mark-received-from-purchased from default-purchase process is still the latest.
      if (lastTransition === 'transition/mark-received-from-purchased') {
        return delay(8000)
          .then(() => refreshTx(sdk, txId))
          .then(response => {
            dispatch(addMarketplaceEntities(response));
          });
      }
    })
    .catch(e => {
      // refresh failed, but we don't act upon it.
      console.log('error', e);
    });
};

export const onRefreshTransactionEntity = txId => (dispatch, getState, sdk) => {
  return refreshTransactionEntity(sdk, txId, dispatch);
};

export const makeTransition = (txId, transitionName, params) => async (dispatch, getState, sdk) => {
  if (transitionInProgress(getState())) {
    return Promise.reject(new Error('Transition already in progress'));
  }
  dispatch(transitionRequest(transitionName));

  const onMakeTransition = () => {
    return sdk.transactions
      .transition({ id: txId, transition: transitionName, params }, { expand: true })
      .then(response => {
        dispatch(addMarketplaceEntities(response));
        dispatch(transitionSuccess());
        dispatch(fetchCurrentUserNotifications());

        // There could be automatic transitions after this transition
        // For example mark-received-from-purchased > auto-complete.
        // Here, we make 1-2 delayed updates for the tx entity.
        // This way "leave a review" link should show up for the customer.
        refreshTransactionEntity(sdk, txId, dispatch);

        if (transitionName === transitions.ACCEPT) {
          onSendPushNotification(PushNotificationCodeEnum.BookingAccepted, txId.uuid);
          onSendPushNotification(PushNotificationCodeEnum.BookingPayoutDetails, txId.uuid);
        } else if (transitionName === transitions.DECLINE) {
          onSendPushNotification(PushNotificationCodeEnum.BookingDeclined, txId.uuid);
          
          // Void PayPal authorization if it's a PayPal payment
          import('../../util/api').then(({ voidPayPalBookingAuthorization }) => {
            voidPayPalBookingAuthorization(txId.uuid)
              .then(result => {
                if (result.voided) {
                  console.log('✅ PayPal authorization voided on decline:', result);
                } else if (result.skipped) {
                  console.log('ℹ️ PayPal void skipped:', result.reason);
                } else {
                  console.warn('⚠️ PayPal void failed:', result.error);
                }
              })
              .catch(error => {
                console.error('❌ PayPal void error (non-critical):', error);
              });
          }).catch(error => {
            console.error('❌ Failed to import PayPal void handler:', error);
          });
        }

        return response;
      })
      .catch(e => {
        dispatch(transitionError(storableError(e)));
        log.error(e, `${transitionName}-failed`, {
          txId,
          transition: transitionName,
        });
        throw e;
      });
  };

  if (transitionName === transitions.ACCEPT) {
    const onChargeSecurityDeposit = async () => {
      // Get CAPTCHA token for security deposit charging
      let captchaToken = null;
      try {
        captchaToken = await verifyCaptcha('security_deposit_charge');
        // CAPTCHA verification completed for security deposit
      } catch (error) {
        console.warn('CAPTCHA verification failed for security deposit:', error);
        // Continue without CAPTCHA if it fails
      }

      // If CAPTCHA is not available, try to proceed anyway
      // This is a fallback since the booking is already accepted
      if (!captchaToken) {
        console.warn('⚠️ Proceeding with security deposit charge without CAPTCHA token');
      }

      return chargeSecurityDeposit({ transactionId: txId }, captchaToken)
        .then(() => {
          // Security deposit charged successfully
          return onMakeTransition();
        })
        .catch(e => {
          console.error('❌ Security deposit charge failed:', e);
          log.error(storableError(e), 'charge-security-deposit-failed');
          
          // If it's a CAPTCHA error, try again without CAPTCHA
          if (e.message && e.message.includes('CAPTCHA token required')) {
            console.log('🔄 Retrying security deposit charge without CAPTCHA...');
            return chargeSecurityDeposit({ transactionId: txId }, null)
              .then(() => {
                // Security deposit charged successfully (retry without CAPTCHA)
                return onMakeTransition();
              })
              .catch(retryError => {
                console.error('❌ Security deposit charge failed on retry:', retryError);
                log.error(storableError(retryError), 'charge-security-deposit-failed-retry');
                return onMakeTransition(); // Continue anyway
              });
          }
          
          return onMakeTransition(); // Continue anyway
        });
    };

    // Get CAPTCHA token before making the booking acceptance request
    const captchaToken = await verifyCaptcha('booking_acceptance');
    
    return acceptBookingRequest({ 
      transactionId: txId.uuid
    }, captchaToken)
      .then(() => {
        return onChargeSecurityDeposit();
      })
      .catch(error => {
        // Process error and check for specific error types
        let errorMessage = error?.message;
        if (typeof errorMessage === 'string' && errorMessage.startsWith('{')) {
          try {
            const parsed = JSON.parse(errorMessage);
            errorMessage = parsed.message;
          } catch (e) {
            // If parsing fails, keep original message
          }
        }
        
        if (
          errorMessage === 'stripe_account_not_found' ||
          errorMessage === 'stripe_payouts_disabled'
        ) {
          // Detected Stripe payout error - showing setup modal
          dispatch(transitionPause());
          dispatch(setStripePayoutsDisabled(true));
          return null;
        } else {
          // Unhandled error - logging and rethrowing
          dispatch(transitionError(storableError(error)));
          log.error(error, `${transitionName}-failed`, {
            txId,
            transition: transitionName,
          });
          throw error;
        }
      });
  } else {
    return onMakeTransition();
  }
};

const fetchMessages = (txId, page, config) => (dispatch, getState, sdk) => {
  const paging = { page, perPage: MESSAGES_PAGE_SIZE };
  dispatch(fetchMessagesRequest());

  return sdk.messages
    .query({
      transaction_id: txId,
      include: ['sender', 'sender.profileImage'],
      ...getImageVariants(config.layout.listingImage),
      ...paging,
    })
    .then(response => {
      const messages = denormalisedResponseEntities(response);
      const { totalItems, totalPages, page: fetchedPage } = response.data.meta;
      const pagination = { totalItems, totalPages, page: fetchedPage };
      const totalMessages = getState().TransactionPage.totalMessages;

      // Original fetchMessages call succeeded
      dispatch(fetchMessagesSuccess(messages, pagination));

      // Check if totalItems has changed between fetched pagination pages
      // if totalItems has changed, fetch first page again to include new incoming messages.
      // TODO if there're more than 100 incoming messages,
      // this should loop through most recent pages instead of fetching just the first one.
      if (totalItems > totalMessages && page > 1) {
        dispatch(fetchMessages(txId, 1, config))
          .then(() => {
            // Original fetch was enough as a response for user action,
            // this just includes new incoming messages
          })
          .catch(() => {
            // Background update, no need to to do anything atm.
          });
      }
    })
    .catch(e => {
      dispatch(fetchMessagesError(storableError(e)));
      throw e;
    });
};

export const fetchMoreMessages = (txId, config) => (dispatch, getState, sdk) => {
  const state = getState();
  const { oldestMessagePageFetched, totalMessagePages } = state.TransactionPage;
  const hasMoreOldMessages = totalMessagePages > oldestMessagePageFetched;

  // In case there're no more old pages left we default to fetching the current cursor position
  const nextPage = hasMoreOldMessages ? oldestMessagePageFetched + 1 : oldestMessagePageFetched;

  return dispatch(fetchMessages(txId, nextPage, config));
};

export const sendMessage = (txId, message, config) => (dispatch, getState, sdk) => {
  dispatch(sendMessageRequest());

  return sdk.messages
    .send({ transactionId: txId, content: message })
    .then(response => {
      const messageId = response.data.data.id;

      // We fetch the first page again to add sent message to the page data
      // and update possible incoming messages too.
      // TODO if there're more than 100 incoming messages,
      // this should loop through most recent pages instead of fetching just the first one.
      return dispatch(fetchMessages(txId, 1, config))
        .then(() => {
          dispatch(sendMessageSuccess());
          return messageId;
        })
        .catch(() => dispatch(sendMessageSuccess()));
    })
    .catch(e => {
      dispatch(sendMessageError(storableError(e)));
      // Rethrow so the page can track whether the sending failed, and
      // keep the message in the form for a retry.
      throw e;
    });
};

// If other party has already sent a review, we need to make transition to
// transitions.REVIEW_2_BY_<CUSTOMER/PROVIDER>
const sendReviewAsSecond = (txId, transition, params, dispatch, sdk, config) => {
  const include = REVIEW_TX_INCLUDES;

  return sdk.transactions
    .transition(
      { id: txId, transition, params },
      { expand: true, include, ...getImageVariants(config.layout.listingImage) }
    )
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      dispatch(sendReviewSuccess());
      return response;
    })
    .then(response => {
      onSendPushNotification(PushNotificationCodeEnum.Review, txId.uuid);
      return response;
    })
    .catch(e => {
      dispatch(sendReviewError(storableError(e)));

      // Rethrow so the page can track whether the sending failed, and
      // keep the message in the form for a retry.
      throw e;
    });
};

// If other party has not yet sent a review, we need to make transition to
// transitions.REVIEW_1_BY_<CUSTOMER/PROVIDER>
// However, the other party might have made the review after previous data synch point.
// So, error is likely to happen and then we must try another state transition
// by calling sendReviewAsSecond().
const sendReviewAsFirst = (txId, transition, params, dispatch, sdk, config) => {
  const include = REVIEW_TX_INCLUDES;

  return sdk.transactions
    .transition(
      { id: txId, transition, params },
      { expand: true, include, ...getImageVariants(config.layout.listingImage) }
    )
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      dispatch(sendReviewSuccess());
      return response;
    })
    .then(response => {
      onSendPushNotification(PushNotificationCodeEnum.Review, txId.uuid);
      return response;
    })
    .catch(e => {
      // If transaction transition is invalid, lets try another endpoint.
      if (isTransactionsTransitionInvalidTransition(e)) {
        return sendReviewAsSecond(id, params, role, dispatch, sdk);
      } else {
        dispatch(sendReviewError(storableError(e)));

        // Rethrow so the page can track whether the sending failed, and
        // keep the message in the form for a retry.
        throw e;
      }
    });
};

export const sendReview = (tx, transitionOptionsInfo, params, config) => (
  dispatch,
  getState,
  sdk
) => {
  const { reviewAsFirst, reviewAsSecond, hasOtherPartyReviewedFirst } = transitionOptionsInfo;
  dispatch(sendReviewRequest());

  return hasOtherPartyReviewedFirst
    ? sendReviewAsSecond(tx?.id, reviewAsSecond, params, dispatch, sdk, config)
    : sendReviewAsFirst(tx?.id, reviewAsFirst, params, dispatch, sdk, config);
};

const isNonEmpty = value => {
  return typeof value === 'object' || Array.isArray(value) ? !isEmpty(value) : !!value;
};

export const fetchNextTransitions = id => (dispatch, getState, sdk) => {
  dispatch(fetchTransitionsRequest());

  return sdk.processTransitions
    .query({ transactionId: id })
    .then(res => {
      dispatch(fetchTransitionsSuccess(res.data.data));
    })
    .catch(e => {
      dispatch(fetchTransitionsError(storableError(e)));
    });
};

export const fetchTransactionLineItems = ({ orderData, listingId, isOwnListing }) => dispatch => {
  dispatch(fetchLineItemsRequest());
  transactionLineItems({ orderData, listingId, isOwnListing })
    .then(response => {
      const lineItems = response.data;
      dispatch(fetchLineItemsSuccess(lineItems));
    })
    .catch(e => {
      dispatch(fetchLineItemsError(storableError(e)));
      log.error(e, 'fetching-line-items-failed', {
        listingId: listingId.uuid,
        orderData,
      });
    });
};

export const loadFilesAndMessages = params => dispatch => {
  const { uploadedFile } = params;
  return Promise.all([dispatch(updateFilesSuccess({ file: uploadedFile }))]);
};

export const loadFileAttachments = txId => dispatch => {
  return fetchMessageFiles({ transactionId: txId })
    .then(files => {
      dispatch(fetchFilesSuccess(files));
      return files;
    })
    .catch(err => {
      console.error(err);
      return err;
    });
};

const onSendPushNotification = (pushNotificationCode, transactionId) => {
  sendPushNotification({
    pushNotificationCode,
    transactionId,
    params: {},
  })
    .then(pushNotificationRes => {
      // Push notification sent successfully (removed logging for security)
    })
    .catch(err => {
      console.error(err);
    });
};

// loadData is a collection of async calls that need to be made
// before page has all the info it needs to render itself
export const loadData = (params, search, config) => (dispatch, getState) => {
  const txId = new UUID(params.id);
  const state = getState().TransactionPage;
  const txRef = state.transactionRef;
  const txRole = params.transactionRole;

  // In case a transaction reference is found from a previous
  // data load -> clear the state. Otherwise keep the non-null
  // and non-empty values which may have been set from a previous page.
  const initialValues = txRef ? {} : pickBy(state, isNonEmpty);
  dispatch(setInitialValues(initialValues));

  // Sale / order (i.e. transaction entity in API)
  return Promise.all([
    dispatch(fetchTransaction(txId, txRole, config)),
    dispatch(fetchMessages(txId, 1, config)),
    dispatch(fetchNextTransitions(txId)),
    dispatch(loadFileAttachments(txId)),
  ]);
};
