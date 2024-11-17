import { getStripeAccountBalanceDetails } from '../../util/api';
import { storableError } from '../../util/errors';
import * as log from '../../util/log';

export const FETCH_STRIPE_ACCOUNT_BALANCE_REQUEST =
  'app/StripeEarningsPage/FETCH_STRIPE_ACCOUNT_BALANCE_REQUEST';
export const FETCH_STRIPE_ACCOUNT_BALANCE_SUCCESS =
  'app/StripeEarningsPage/FETCH_STRIPE_ACCOUNT_BALANCE_SUCCESS';
export const UPDATE_STRIPE_ACCOUNT_BALANCE =
  'app/StripeEarningsPage/FETCH_STRIPE_ACCOUNT_BALANCE_REQUEST';
export const FETCH_STRIPE_ACCOUNT_BALANCE_ERROR =
  'app/StripeEarningsPage/FETCH_STRIPE_ACCOUNT_BALANCE_ERROR';

const initialState = {
  stripeBalance: null,
  stripeBalanceLoading: false,
  stripeBalanceError: false,
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case FETCH_STRIPE_ACCOUNT_BALANCE_REQUEST:
      return {
        ...state,
        stripeBalanceLoading: true,
      };
    case FETCH_STRIPE_ACCOUNT_BALANCE_SUCCESS:
    case UPDATE_STRIPE_ACCOUNT_BALANCE:
      return {
        ...state,
        stripeBalance: payload,
        stripeBalanceLoading: false,
        stripeBalanceError: null,
      };
    case FETCH_STRIPE_ACCOUNT_BALANCE_ERROR:
      return {
        ...state,
        stripeBalanceError: payload,
        stripeBalanceLoading: false,
      };

    default:
      return state;
  }
}

export const fetchStripeAccountBalanceRequest = () => ({
  type: FETCH_STRIPE_ACCOUNT_BALANCE_REQUEST,
  payload: { stripeBalanceLoading: true },
});

export const fetchStripeAccountBalanceSuccess = stripeBalance => ({
  type: FETCH_STRIPE_ACCOUNT_BALANCE_SUCCESS,
  payload: stripeBalance,
});

export const fetchStripeAccountBalanceError = error => ({
  type: FETCH_STRIPE_ACCOUNT_BALANCE_ERROR,
  payload: error,
  error: true,
});

export const fetchStripeAccountBalance = (params = null) => (dispatch, getState, sdk) => {
  dispatch(fetchStripeAccountBalanceRequest());
  return getStripeAccountBalanceDetails()
    .then(stripeBalance => {
      if (stripeBalance) {
        dispatch(fetchStripeAccountBalanceSuccess(stripeBalance));
      }
      return stripeBalance;
    })
    .catch(error => {
      const e = storableError(error);
      dispatch(fetchStripeAccountBalanceError(error));
      log.error(error, 'fetch-stripe-account-balance-failed', { stripeMessage: error });
      // throw e;
    });
};

export const loadData = () => {
  return fetchStripeAccountBalance();
};
