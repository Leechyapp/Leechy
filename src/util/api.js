// These helpers are calling this template's own server-side routes
// so, they are not directly calling Marketplace API or Integration API.
// You can find these api endpoints from 'server/api/...' directory

import axios from 'axios';
import appSettings from '../config/settings';
import { types as sdkTypes, transit } from './sdkLoader';
import Decimal from 'decimal.js';

export const apiBaseUrl = marketplaceRootURL => {
  const port = process.env.REACT_APP_DEV_API_SERVER_PORT;
  const useDevApiServer = process.env.NODE_ENV === 'development' && !!port;

  // In development, the dev API server is running in a different port
  if (useDevApiServer) {
    return `http://localhost:${port}`;
  }

  // Otherwise, use the given marketplaceRootURL parameter or the same domain and port as the frontend
  return marketplaceRootURL ? marketplaceRootURL.replace(/\/$/, '') : `${window.location.origin}`;
};

// Application type handlers for JS SDK.
//
// NOTE: keep in sync with `typeHandlers` in `server/api-util/sdk.js`
export const typeHandlers = [
  // Use Decimal type instead of SDK's BigDecimal.
  {
    type: sdkTypes.BigDecimal,
    customType: Decimal,
    writer: v => new sdkTypes.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

const serialize = data => {
  return transit.write(data, { typeHandlers, verbose: appSettings.sdk.transitVerbose });
};

const deserialize = str => {
  return transit.read(str, { typeHandlers });
};

const methods = {
  POST: 'POST',
  GET: 'GET',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// If server/api returns data from SDK, you should set Content-Type to 'application/transit+json'
const request = (path, options = {}) => {
  const url = `${apiBaseUrl()}${path}`;
  const { credentials, headers, body, ...rest } = options;

  // If headers are not set, we assume that the body should be serialized as transit format.
  const shouldSerializeBody =
    (!headers || headers['Content-Type'] === 'application/transit+json') && body;
  const bodyMaybe = shouldSerializeBody ? { body: serialize(body) } : {};

  const fetchOptions = {
    credentials: credentials || 'include',
    // Since server/api mostly talks to Marketplace API using SDK,
    // we default to 'application/transit+json' as content type (as SDK uses transit).
    headers: headers || { 'Content-Type': 'application/transit+json' },
    ...bodyMaybe,
    ...rest,
  };

  return window.fetch(url, fetchOptions).then(res => {
    const contentTypeHeader = res.headers.get('Content-Type');
    const contentType = contentTypeHeader ? contentTypeHeader.split(';')[0] : null;

    if (res.status >= 400) {
      // Clone the response to avoid the "body stream already read" error
      const responseClone = res.clone();
      
      return res.json().then(data => {
        console.error(`❌ API Error ${res.status} for ${path}:`, data);
        // Removed headers logging for security
        let e = new Error();
        e = Object.assign(e, data);
        throw e;
      }).catch(jsonError => {
        // If response isn't JSON, try to get text from the cloned response
        return responseClone.text().then(text => {
          console.error(`❌ API Error ${res.status} for ${path} (non-JSON):`, text);
          let e = new Error(text || `HTTP ${res.status}`);
          e.status = res.status;
          throw e;
        });
      });
    }
    if (contentType === 'application/transit+json') {
      return res.text().then(deserialize);
    } else if (contentType === 'application/json') {
      return res.json();
    }
    return res.text();
  });
};

// Keep the previous parameter order for the post method.
// For now, only POST has own specific function, but you can create more or use request directly.
const post = (path, body, options = {}) => {
  const requestOptions = {
    ...options,
    method: methods.POST,
    body,
  };

  return request(path, requestOptions);
};

const postUploadFiles = (path, body) => {
  const url = `${apiBaseUrl()}${path}`;
  const options = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/transit+json',
    },
    body: serialize(body),
  };

  return axios
    .post(url, body, options)
    .then(res => {
      return res.data;
    })
    .catch(error => {
      console.log(error);
      return {};
    });
};

// Fetch transaction line items from the local API endpoint.
//
// See `server/api/transaction-line-items.js` to see what data should
// be sent in the body.
export const transactionLineItems = body => {
  return post('/api/transaction-line-items', body);
};

// Initiate a privileged transaction.
//
// With privileged transitions, the transactions need to be created
// from the backend. This endpoint enables sending the order data to
// the local backend, and passing that to the Marketplace API.
//
// See `server/api/initiate-privileged.js` to see what data should be
// sent in the body.
export const initiatePrivileged = body => {
  return post('/api/initiate-privileged', body);
};

// Transition a transaction with a privileged transition.
//
// This is similar to the `initiatePrivileged` above. It will use the
// backend for the transition. The backend endpoint will add the
// payment line items to the transition params.
//
// See `server/api/transition-privileged.js` to see what data should
// be sent in the body.
export const transitionPrivileged = body => {
  return post('/api/transition-privileged', body);
};

// Create user with identity provider (e.g. Facebook or Google)
//
// If loginWithIdp api call fails and user can't authenticate to Marketplace API with idp
// we will show option to create a new user with idp.
// For that user needs to confirm data fetched from the idp.
// After the confirmation, this endpoint is called to create a new user with confirmed data.
//
// See `server/api/auth/createUserWithIdp.js` to see what data should
// be sent in the body.
export const createUserWithIdp = body => {
  return post('/api/auth/create-user-with-idp', body);
};

export const deleteCurrentUser = body => {
  return post('/api/current-user/delete', body);
};
export const blockUser = body => {
  return post('/api/current-user/block-user', body);
};
export const unblockUser = body => {
  return post('/api/current-user/unblock-user', body);
};
export const getBlockedUsersList = body => {
  return post('/api/current-user/get-blocked-users-list', body);
};

export const sendContactEmail = body => {
  return post('/api/contact/send-contact-email', body);
};

export const chargeSecurityDeposit = (body, captchaToken = null) => {
  const options = captchaToken ? {
    headers: {
      'Content-Type': 'application/transit+json',
      'x-captcha-token': captchaToken
    }
  } : {};
  return post('/api/security-deposit/charge', body, options);
};
export const saveSecurityDepositData = body => {
  return post('/api/security-deposit/save', body);
};
export const refundSecurityDeposit = body => {
  return post('/api/security-deposit/refund', body);
};

export const fetchMessageFiles = body => {
  return post('/api/message/fetch-files', body);
};
export const saveMessageFiles = body => {
  return postUploadFiles('/api/message/save-files', body);
};

export const updateShippingStatus = body => {
  return post('/api/shipping/update-shipping-status', body);
};

export const searchInitialFollowsData = body => {
  return post('/api/follows/search-initial-follows-data', body);
};
export const followUnfollowUser = body => {
  return post('/api/follows/follow-unfollow-user', body);
};
export const getFollowersList = body => {
  return post('/api/follows/get-followers-list', body);
};
export const getFollowingList = body => {
  return post('/api/follows/get-following-list', body);
};

export const sendPushNotification = body => {
  return post('/api/push-notification/send-push-notification', body);
};
export const updateFCMToken = body => {
  return post('/api/push-notification/update-fcm-token', body);
};

export const createBookingRequest = (body, captchaToken = null) => {
  const options = captchaToken ? {
    headers: {
      'Content-Type': 'application/transit+json',
      'x-captcha-token': captchaToken
    }
  } : {};
  return post('/api/booking/create-booking-request', body, options);
};
export const acceptBookingRequest = (body, captchaToken = null) => {
  const options = captchaToken ? {
    headers: {
      'Content-Type': 'application/transit+json',
      'x-captcha-token': captchaToken
    }
  } : {};
  return post('/api/booking/accept-booking-request', body, options);
};

export const retrieveStripeAccount = (body = {}) => {
  return post('/api/stripe-account/retrieve-stripe-account', body);
};
export const connectStripeAccount = (body = {}) => {
  return post('/api/stripe-account/connect-stripe-account', body);
};
export const createStripeAccountSession = (body = {}) => {
  return post('/api/stripe-account/create-account-session', body);
};
export const createStripeDashboardLink = body => {
  return post('/api/stripe-account/create-stripe-account-dashboard-link', body);
};
export const getStripeAccountBalanceDetails = () => {
  return post('/api/stripe-account/get-balance', {});
};
export const createStripeAccountPayout = () => {
  return post('/api/stripe-account/create-payout', {});
};
export const updateStripeAccountPayoutInterval = body => {
  return post('/api/stripe-account/update-payout-interval', body);
};

export const createSetupIntent = (body = {}, captchaToken = null) => {
  const options = captchaToken ? {
    headers: {
      'Content-Type': 'application/transit+json',
      'x-captcha-token': captchaToken
    }
  } : {};
  return post('/api/setup-intent/get-client-secret', body, options);
};

export const getPaymentMethodsList = (body = {}) => {
  return post('/api/payment-method/list', body);
};
export const retrievePaymentMethod = body => {
  return post('/api/payment-method/retrieve', body);
};
export const attachPaymentMethod = (body, captchaToken = null) => {
  const options = captchaToken ? {
    headers: {
      'Content-Type': 'application/transit+json',
      'x-captcha-token': captchaToken
    }
  } : {};
  return post('/api/payment-method/attach', body, options);
};
export const detachPaymentMethod = body => {
  return post('/api/payment-method/detach', body);
};

// PayPal payment methods
export const createPayPalOrder = (body, captchaToken = null) => {
  const options = captchaToken ? {
    headers: {
      'Content-Type': 'application/transit+json',
      'x-captcha-token': captchaToken
    }
  } : {};
  return post('/api/paypal/create-order', body, options);
};

export const authorizePayPalOrder = (orderId, authorizePayload = {}, captchaToken = null) => {
  const headers = captchaToken ? { 'x-captcha-token': captchaToken } : {};
  return request(`/api/paypal/authorize-order/${orderId}`, {
    method: 'POST',
    body: authorizePayload,
    headers,
  });
};

export const capturePayPalOrder = (orderId, capturePayload = {}) => {
  return request(`/api/paypal/capture-order/${orderId}`, {
    method: 'POST',
    body: capturePayload,
  });
};

export const capturePayPalAuthorization = (authorizationId, capturePayload = {}) => {
  return request(`/api/paypal/capture-authorization/${authorizationId}`, {
    method: 'POST',
    body: capturePayload,
  });
};

export const voidPayPalAuthorization = (authorizationId) => {
  return request(`/api/paypal/void-authorization/${authorizationId}`, {
    method: 'POST',
  });
};

export const voidPayPalBookingAuthorization = (transactionId) => {
  return request(`/api/paypal/void-booking-authorization/${transactionId}`, {
    method: 'POST',
  });
};

export const getPayPalOrder = orderId => {
  return request(`/api/paypal/order/${orderId}`, {
    method: 'GET',
  });
};

export const getPayPalConfigStatus = () => {
  return request('/api/paypal/config-status', {
    method: 'GET',
  });
};

// NEW: Unified payout endpoints for multi-payment-method earnings
export const getUnifiedEarnings = () => {
  return post('/api/earnings/unified-balance', {});
};

export const createUnifiedPayout = () => {
  return post('/api/earnings/create-unified-payout', {});
};
