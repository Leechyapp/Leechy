import { retrieveStripeAccount } from '../../util/api';
import { storableError } from '../../util/errors';
import * as log from '../../util/log';

export const FETCH_STRIPE_EXPRESS = 'app/StripeExpressPayoutPage/FETCH_STRIPE_EXPRESS';
export const UPDATE_STRIPE_EXPRESS = 'app/StripeExpressPayoutPage/UPDATE_STRIPE_EXPRESS';
export const ADD_STRIPE_EXPRESS = 'app/StripeExpressPayoutPage/ADD_STRIPE_EXPRESS';
export const SAVE_STRIPE_EXPRESS = 'app/StripeExpressPayoutPage/SAVE_STRIPE_EXPRESS';
export const SAVE_STRIPE_EXPRESS_IN_PROGRESS =
  'app/StripeExpressPayoutPage/SAVE_STRIPE_EXPRESS_IN_PROGRESS';
export const SAVE_STRIPE_EXPRESS_ERROR = 'app/StripeExpressPayoutPage/SAVE_STRIPE_EXPRESS_ERROR';

const initialState = {
  stripeExpress: null,
  saveStripeExpressError: null,
  saveStripeExpressInProgress: false,
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case FETCH_STRIPE_EXPRESS:
    case UPDATE_STRIPE_EXPRESS:
      return {
        ...state,
        stripeExpress: payload,
        saveStripeExpressInProgress: false,
        saveStripeExpressError: null,
      };
    case ADD_STRIPE_EXPRESS:
      return { ...state, stripeExpress: payload, saveStripeExpressInProgress: false };
    case SAVE_STRIPE_EXPRESS:
      return { ...state, stripeExpress: payload, saveStripeExpressInProgress: false };
    case SAVE_STRIPE_EXPRESS_IN_PROGRESS:
      return { ...state, saveStripeExpressInProgress: payload };
    default:
      return state;
  }
}

export const fetchStripeExpressRequest = stripeExpress => ({
  type: FETCH_STRIPE_EXPRESS,
  payload: stripeExpress,
});

export const saveStripeExpressError = error => ({
  type: SAVE_STRIPE_EXPRESS_ERROR,
  payload: error,
  error: true,
});

export const fetchStripeExpress = (params = null) => (dispatch, getState, sdk) => {
  return retrieveStripeAccount()
    .then(stripeExpress => {
      if (stripeExpress) {
        dispatch(fetchStripeExpressRequest(stripeExpress));
      }
      return stripeExpress;
    })
    .catch(error => {
      const e = storableError(error);
      dispatch(saveStripeExpressError(error));
      log.error(error, 'fetch-stripe-account-failed', { stripeMessage: error });
      // throw e;
    });
};

export const loadData = () => {
  return fetchStripeExpress();
};
