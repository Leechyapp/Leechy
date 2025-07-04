import merge from 'lodash/merge';
import { denormalisedResponseEntities } from '../../util/data';
import { storableError } from '../../util/errors';
import { fetchCurrentUser, currentUserShowSuccess } from '../../ducks/user.duck';

// ================ Action types ================ //

export const SAVE_CONTACT_DETAILS_REQUEST = 'app/ContactDetailsPage/SAVE_CONTACT_DETAILS_REQUEST';
export const SAVE_CONTACT_DETAILS_SUCCESS = 'app/ContactDetailsPage/SAVE_CONTACT_DETAILS_SUCCESS';
export const SAVE_EMAIL_ERROR = 'app/ContactDetailsPage/SAVE_EMAIL_ERROR';
export const SAVE_PHONE_NUMBER_ERROR = 'app/ContactDetailsPage/SAVE_PHONE_NUMBER_ERROR';
export const SAVE_PAYPAL_EMAIL_ERROR = 'app/ContactDetailsPage/SAVE_PAYPAL_EMAIL_ERROR';

export const SAVE_CONTACT_DETAILS_CLEAR = 'app/ContactDetailsPage/SAVE_CONTACT_DETAILS_CLEAR';

export const RESET_PASSWORD_REQUEST = 'app/ContactDetailsPage/RESET_PASSWORD_REQUEST';
export const RESET_PASSWORD_SUCCESS = 'app/ContactDetailsPage/RESET_PASSWORD_SUCCESS';
export const RESET_PASSWORD_ERROR = 'app/ContactDetailsPage/RESET_PASSWORD_ERROR';

// ================ Reducer ================ //

const initialState = {
  saveEmailError: null,
  savePhoneNumberError: null,
  savePayPalEmailError: null,
  saveContactDetailsInProgress: false,
  contactDetailsChanged: false,
  resetPasswordInProgress: false,
  resetPasswordError: null,
};

export default function reducer(state = initialState, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case SAVE_CONTACT_DETAILS_REQUEST:
      return {
        ...state,
        saveContactDetailsInProgress: true,
        saveEmailError: null,
        savePhoneNumberError: null,
        savePayPalEmailError: null,
        contactDetailsChanged: false,
      };
    case SAVE_CONTACT_DETAILS_SUCCESS:
      return { ...state, saveContactDetailsInProgress: false, contactDetailsChanged: true };
    case SAVE_EMAIL_ERROR:
      return { ...state, saveContactDetailsInProgress: false, saveEmailError: payload };
    case SAVE_PHONE_NUMBER_ERROR:
      return { ...state, saveContactDetailsInProgress: false, savePhoneNumberError: payload };
    case SAVE_PAYPAL_EMAIL_ERROR:
      return { ...state, saveContactDetailsInProgress: false, savePayPalEmailError: payload };

    case SAVE_CONTACT_DETAILS_CLEAR:
      return {
        ...state,
        saveContactDetailsInProgress: false,
        saveEmailError: null,
        savePhoneNumberError: null,
        savePayPalEmailError: null,
        contactDetailsChanged: false,
      };

    case RESET_PASSWORD_REQUEST:
      return { ...state, resetPasswordInProgress: true, resetPasswordError: null };
    case RESET_PASSWORD_SUCCESS:
      return { ...state, resetPasswordInProgress: false };
    case RESET_PASSWORD_ERROR:
      console.error(payload); // eslint-disable-line no-console
      return { ...state, resetPasswordInProgress: false, resetPasswordError: payload };

    default:
      return state;
  }
}

// ================ Action creators ================ //

export const saveContactDetailsRequest = () => ({ type: SAVE_CONTACT_DETAILS_REQUEST });
export const saveContactDetailsSuccess = () => ({ type: SAVE_CONTACT_DETAILS_SUCCESS });
export const saveEmailError = error => ({
  type: SAVE_EMAIL_ERROR,
  payload: error,
  error: true,
});
export const savePhoneNumberError = error => ({
  type: SAVE_PHONE_NUMBER_ERROR,
  payload: error,
  error: true,
});
export const savePayPalEmailError = error => ({
  type: SAVE_PAYPAL_EMAIL_ERROR,
  payload: error,
  error: true,
});

export const saveContactDetailsClear = () => ({ type: SAVE_CONTACT_DETAILS_CLEAR });

export const resetPasswordRequest = () => ({ type: RESET_PASSWORD_REQUEST });

export const resetPasswordSuccess = () => ({ type: RESET_PASSWORD_SUCCESS });

export const resetPasswordError = e => ({
  type: RESET_PASSWORD_ERROR,
  error: true,
  payload: e,
});

// ================ Thunks ================ //

/**
 * Make a phone number update request to the API and return the current user.
 */
const requestSavePhoneNumber = params => (dispatch, getState, sdk) => {
  const phoneNumber = params.phoneNumber;

  return sdk.currentUser
    .updateProfile(
      { protectedData: { phoneNumber } },
      {
        expand: true,
        include: ['profileImage'],
        'fields.image': ['variants.square-small', 'variants.square-small2x'],
      }
    )
    .then(response => {
      const entities = denormalisedResponseEntities(response);
      if (entities.length !== 1) {
        throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
      }

      const currentUser = entities[0];
      return currentUser;
    })
    .catch(e => {
      dispatch(savePhoneNumberError(storableError(e)));
      // pass the same error so that the SAVE_CONTACT_DETAILS_SUCCESS
      // action will not be fired
      throw e;
    });
};

/**
 * Make a PayPal email update request to the API and return the current user.
 */
const requestSavePayPalEmail = params => (dispatch, getState, sdk) => {
  const paypalEmail = params.paypalEmail;

  return sdk.currentUser
    .updateProfile(
      { protectedData: { paypalEmail } },
      {
        expand: true,
        include: ['profileImage'],
        'fields.image': ['variants.square-small', 'variants.square-small2x'],
      }
    )
    .then(response => {
      const entities = denormalisedResponseEntities(response);
      if (entities.length !== 1) {
        throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
      }

      const currentUser = entities[0];
      return currentUser;
    })
    .catch(e => {
      dispatch(savePayPalEmailError(storableError(e)));
      // pass the same error so that the SAVE_CONTACT_DETAILS_SUCCESS
      // action will not be fired
      throw e;
    });
};

/**
 * Make a email update request to the API and return the current user.
 */
const requestSaveEmail = params => (dispatch, getState, sdk) => {
  const { email, currentPassword } = params;

  return sdk.currentUser
    .changeEmail(
      { email, currentPassword },
      {
        expand: true,
        include: ['profileImage'],
        'fields.image': ['variants.square-small', 'variants.square-small2x'],
      }
    )
    .then(response => {
      const entities = denormalisedResponseEntities(response);
      if (entities.length !== 1) {
        throw new Error('Expected a resource in the sdk.currentUser.changeEmail response');
      }

      const currentUser = entities[0];
      return currentUser;
    })
    .catch(e => {
      dispatch(saveEmailError(storableError(e)));
      // pass the same error so that the SAVE_CONTACT_DETAILS_SUCCESS
      // action will not be fired
      throw e;
    });
};

/**
 * Save email and update the current user.
 */
const saveEmail = params => (dispatch, getState, sdk) => {
  return (
    dispatch(requestSaveEmail(params))
      .then(user => {
        dispatch(currentUserShowSuccess(user));
        dispatch(saveContactDetailsSuccess());
      })
      // error action dispatched in requestSaveEmail
      .catch(e => null)
  );
};

/**
 * Save phone number and update the current user.
 */
const savePhoneNumber = params => (dispatch, getState, sdk) => {
  return (
    dispatch(requestSavePhoneNumber(params))
      .then(user => {
        dispatch(currentUserShowSuccess(user));
        dispatch(saveContactDetailsSuccess());
      })
      // error action dispatched in requestSavePhoneNumber
      .catch(e => null)
  );
};

/**
 * Save PayPal email and update the current user.
 */
const savePayPalEmail = params => (dispatch, getState, sdk) => {
  return (
    dispatch(requestSavePayPalEmail(params))
      .then(user => {
        dispatch(currentUserShowSuccess(user));
        dispatch(saveContactDetailsSuccess());
      })
      // error action dispatched in requestSavePayPalEmail
      .catch(e => null)
  );
};

/**
 * Save email and phone number and update the current user.
 */
const saveEmailAndPhoneNumber = params => (dispatch, getState, sdk) => {
  const { email, phoneNumber, currentPassword } = params;

  // order of promises: 1. email, 2. phone number
  const promises = [
    dispatch(requestSaveEmail({ email, currentPassword })),
    dispatch(requestSavePhoneNumber({ phoneNumber })),
  ];

  return Promise.all(promises)
    .then(values => {
      // Array of two user objects is resolved
      // the first one is from the email update
      // the second one is from the phone number update

      const saveEmailUser = values[0];
      const savePhoneNumberUser = values[1];

      // merge the protected data from the user object returned
      // by the phone update operation
      const protectedData = savePhoneNumberUser.attributes.profile.protectedData;
      const phoneNumberMergeSource = { attributes: { profile: { protectedData } } };

      const currentUser = merge(saveEmailUser, phoneNumberMergeSource);
      dispatch(currentUserShowSuccess(currentUser));
      dispatch(saveContactDetailsSuccess());
    })
    .catch(e => null);
};

/**
 * Save email and PayPal email and update the current user.
 */
const saveEmailAndPayPalEmail = params => (dispatch, getState, sdk) => {
  const { email, paypalEmail, currentPassword } = params;

  // order of promises: 1. email, 2. PayPal email
  const promises = [
    dispatch(requestSaveEmail({ email, currentPassword })),
    dispatch(requestSavePayPalEmail({ paypalEmail })),
  ];

  return Promise.all(promises)
    .then(values => {
      const saveEmailUser = values[0];
      const savePayPalEmailUser = values[1];

      // merge the protected data from the user object returned by the PayPal email update operation
      const protectedData = savePayPalEmailUser.attributes.profile.protectedData;
      const paypalEmailMergeSource = { attributes: { profile: { protectedData } } };

      const currentUser = merge(saveEmailUser, paypalEmailMergeSource);
      dispatch(currentUserShowSuccess(currentUser));
      dispatch(saveContactDetailsSuccess());
    })
    .catch(e => null);
};

/**
 * Save phone number and PayPal email and update the current user.
 */
const savePhoneNumberAndPayPalEmail = params => (dispatch, getState, sdk) => {
  const { phoneNumber, paypalEmail } = params;

  // order of promises: 1. phone number, 2. PayPal email
  const promises = [
    dispatch(requestSavePhoneNumber({ phoneNumber })),
    dispatch(requestSavePayPalEmail({ paypalEmail })),
  ];

  return Promise.all(promises)
    .then(values => {
      const savePhoneNumberUser = values[0];
      const savePayPalEmailUser = values[1];

      // merge the protected data from both user objects
      const phoneProtectedData = savePhoneNumberUser.attributes.profile.protectedData;
      const paypalProtectedData = savePayPalEmailUser.attributes.profile.protectedData;
      const mergedProtectedData = { ...phoneProtectedData, ...paypalProtectedData };
      const mergeSource = { attributes: { profile: { protectedData: mergedProtectedData } } };

      const currentUser = merge(savePhoneNumberUser, mergeSource);
      dispatch(currentUserShowSuccess(currentUser));
      dispatch(saveContactDetailsSuccess());
    })
    .catch(e => null);
};

/**
 * Save email, phone number and PayPal email and update the current user.
 */
const saveEmailPhoneNumberAndPayPalEmail = params => (dispatch, getState, sdk) => {
  const { email, phoneNumber, paypalEmail, currentPassword } = params;

  // order of promises: 1. email, 2. phone number, 3. PayPal email
  const promises = [
    dispatch(requestSaveEmail({ email, currentPassword })),
    dispatch(requestSavePhoneNumber({ phoneNumber })),
    dispatch(requestSavePayPalEmail({ paypalEmail })),
  ];

  return Promise.all(promises)
    .then(values => {
      const saveEmailUser = values[0];
      const savePhoneNumberUser = values[1];
      const savePayPalEmailUser = values[2];

      // merge the protected data from all user objects
      const phoneProtectedData = savePhoneNumberUser.attributes.profile.protectedData;
      const paypalProtectedData = savePayPalEmailUser.attributes.profile.protectedData;
      const mergedProtectedData = { ...phoneProtectedData, ...paypalProtectedData };
      const mergeSource = { attributes: { profile: { protectedData: mergedProtectedData } } };

      const currentUser = merge(saveEmailUser, mergeSource);
      dispatch(currentUserShowSuccess(currentUser));
      dispatch(saveContactDetailsSuccess());
    })
    .catch(e => null);
};

/**
 * Update contact details, actions depend on which data has changed
 */
export const saveContactDetails = params => (dispatch, getState, sdk) => {
  dispatch(saveContactDetailsRequest());

  const { 
    email, 
    currentEmail, 
    phoneNumber, 
    currentPhoneNumber, 
    paypalEmail, 
    currentPayPalEmail, 
    currentPassword 
  } = params;
  
  const emailChanged = email !== currentEmail;
  const phoneNumberChanged = phoneNumber !== currentPhoneNumber;
  const paypalEmailChanged = paypalEmail !== currentPayPalEmail;

  if (emailChanged && phoneNumberChanged && paypalEmailChanged) {
    return dispatch(saveEmailPhoneNumberAndPayPalEmail({ email, currentPassword, phoneNumber, paypalEmail }));
  } else if (emailChanged && phoneNumberChanged) {
    return dispatch(saveEmailAndPhoneNumber({ email, currentPassword, phoneNumber }));
  } else if (emailChanged && paypalEmailChanged) {
    return dispatch(saveEmailAndPayPalEmail({ email, currentPassword, paypalEmail }));
  } else if (phoneNumberChanged && paypalEmailChanged) {
    return dispatch(savePhoneNumberAndPayPalEmail({ phoneNumber, paypalEmail }));
  } else if (emailChanged) {
    return dispatch(saveEmail({ email, currentPassword }));
  } else if (phoneNumberChanged) {
    return dispatch(savePhoneNumber({ phoneNumber }));
  } else if (paypalEmailChanged) {
    return dispatch(savePayPalEmail({ paypalEmail }));
  } else {
    // No changes made, dispatch success immediately
    dispatch(saveContactDetailsSuccess());
    return Promise.resolve();
  }
};

export const resetPassword = email => (dispatch, getState, sdk) => {
  dispatch(resetPasswordRequest());
  return sdk.passwordReset
    .request({ email })
    .then(() => dispatch(resetPasswordSuccess()))
    .catch(e => dispatch(resetPasswordError(storableError(e))));
};

export const loadData = () => (dispatch) => {
  // ContactDetailsPage doesn't need data from backend
  return Promise.resolve({});
};
