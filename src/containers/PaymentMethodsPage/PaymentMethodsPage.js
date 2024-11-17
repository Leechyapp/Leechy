import React, { useEffect, useRef, useState } from 'react';
import { bool, func, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import { ensureCurrentUser, ensureStripeCustomer, ensurePaymentMethodCard } from '../../util/data';
import { propTypes } from '../../util/types';
import { savePaymentMethod, deletePaymentMethod } from '../../ducks/paymentMethods.duck';
import { handleCardSetup } from '../../ducks/stripe.duck';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';

import {
  H3,
  SavedCardDetails,
  Page,
  UserNav,
  LayoutSideNavigation,
  IconSpinner,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import PaymentMethodsForm from './PaymentMethodsForm/PaymentMethodsForm';

import { createStripeSetupIntent, stripeCustomer } from './PaymentMethodsPage.duck.js';

import css from './PaymentMethodsPage.module.css';
import CustomSavedCardDetails from '../../components/CustomSavedCardDetails/CustomSavedCardDetails.js';
import CustomStripePaymentForm from '../../components/CustomStripePaymentForm/CustomStripePaymentForm.js';
import {
  attachPaymentMethod,
  createSetupIntent,
  detachPaymentMethod,
  getPaymentMethodsList,
} from '../../util/api.js';

const PaymentMethodsPageComponent = props => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardState, setCardState] = useState(null);

  const [showCustomPaymentForm, setCustomPaymentForm] = useState(false);
  const [customClientSecret, setCustomClientSecret] = useState(null);
  const [rootPaymentAPI, setPaymentApiId] = useState(1);
  const [customDefaultPaymentMethod, setCustomDefaultPaymentMethod] = useState(null);
  const [customPaymentMethodList, setCustomPaymentMethodList] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [setupIntentLoading, setSetupIntentLoading] = useState(false);
  const saveCardDetailsRef = useRef(null);

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

  const {
    currentUser,
    addPaymentMethodError,
    deletePaymentMethodError,
    createStripeCustomerError,
    handleCardSetupError,
    deletePaymentMethodInProgress,
    onCreateSetupIntent,
    onHandleCardSetup,
    onSavePaymentMethod,
    onDeletePaymentMethod,
    fetchStripeCustomer,
    scrollingDisabled,
    onManageDisableScrolling,
    intl,
    stripeCustomerFetched,
  } = props;

  /****************** START CUSTOM STRIPE  ******************/
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
          setPaymentMethodsLoading(false);
          console.error(error);
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
    attachPaymentMethod(params)
      .then(() => {
        getPaymentMethodsList()
          .then(result => {
            if (result && result.length > 0) {
              setCustomPaymentMethodList(result);
              setCustomDefaultPaymentMethod(result[0]);
              setCustomClientSecret(null);
              setCustomPaymentForm(false);
              saveCardDetailsRef.current.setActiveToDefault();
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
  /****************** END CUSTOM STRIPE  ******************/

  const getClientSecret = setupIntent => {
    return setupIntent && setupIntent.attributes ? setupIntent.attributes.clientSecret : null;
  };
  const getPaymentParams = (currentUser, formValues) => {
    const { name, addressLine1, addressLine2, postal, state, city, country } = formValues;
    const addressMaybe =
      addressLine1 && postal
        ? {
            address: {
              city: city,
              country: country,
              line1: addressLine1,
              line2: addressLine2,
              postal_code: postal,
              state: state,
            },
          }
        : {};
    const billingDetails = {
      name,
      email: ensureCurrentUser(currentUser).attributes.email,
      ...addressMaybe,
    };

    const paymentParams = {
      payment_method_data: {
        billing_details: billingDetails,
      },
    };

    return paymentParams;
  };

  const handleSubmit = params => {
    setIsSubmitting(true);
    const ensuredCurrentUser = ensureCurrentUser(currentUser);
    const stripeCustomer = ensuredCurrentUser.stripeCustomer;
    const { stripe, card, formValues } = params;

    onCreateSetupIntent()
      .then(setupIntent => {
        const stripeParams = {
          stripe,
          card,
          setupIntentClientSecret: getClientSecret(setupIntent),
          paymentParams: getPaymentParams(currentUser, formValues),
        };

        return onHandleCardSetup(stripeParams);
      })
      .then(result => {
        const newPaymentMethod = result.setupIntent.payment_method;
        // Note: stripe.handleCardSetup might return an error inside successful call (200), but those are rejected in thunk functions.

        return onSavePaymentMethod(stripeCustomer, newPaymentMethod);
      })
      .then(() => {
        // Update currentUser entity and its sub entities: stripeCustomer and defaultPaymentMethod
        fetchStripeCustomer();
        setIsSubmitting(false);
        setCardState('default');
      })
      .catch(error => {
        console.error(error);
        setIsSubmitting(false);
      });
  };

  const handleRemovePaymentMethod = () => {
    onDeletePaymentMethod().then(() => {
      fetchStripeCustomer();
    });
  };

  const title = intl.formatMessage({ id: 'PaymentMethodsPage.title' });

  const ensuredCurrentUser = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!ensuredCurrentUser.id;

  const hasDefaultPaymentMethod =
    currentUser &&
    ensureStripeCustomer(currentUser.stripeCustomer).attributes.stripeCustomerId &&
    ensurePaymentMethodCard(currentUser.stripeCustomer.defaultPaymentMethod).id;

  // Get first and last name of the current user and use it in the StripePaymentForm to autofill the name field
  const userName = currentUserLoaded
    ? `${ensuredCurrentUser.attributes.profile.firstName} ${ensuredCurrentUser.attributes.profile.lastName}`
    : null;

  const initalValuesForStripePayment = { name: userName };

  const card = hasDefaultPaymentMethod
    ? ensurePaymentMethodCard(currentUser.stripeCustomer.defaultPaymentMethod).attributes.card
    : null;

  const showForm = cardState === 'replaceCard' || !hasDefaultPaymentMethod;
  const showCardDetails = !!hasDefaultPaymentMethod;
  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation
        topbar={
          <>
            <TopbarContainer
              desktopClassName={css.desktopTopbar}
              mobileClassName={css.mobileTopbar}
            />
            <UserNav currentPage="PaymentMethodsPage" />
          </>
        }
        sideNav={null}
        useAccountSettingsNav
        currentPage="PaymentMethodsPage"
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <H3 as="h1">
            <FormattedMessage id="PaymentMethodsPage.heading" />
          </H3>
          {rootPaymentAPI === 1 ? (
            !stripeCustomerFetched ? null : (
              <>
                {showCardDetails ? (
                  <SavedCardDetails
                    card={card}
                    onManageDisableScrolling={onManageDisableScrolling}
                    onChange={setCardState}
                    onDeleteCard={handleRemovePaymentMethod}
                    deletePaymentMethodInProgress={deletePaymentMethodInProgress}
                  />
                ) : null}
                {showForm ? (
                  <PaymentMethodsForm
                    className={css.paymentForm}
                    formId="PaymentMethodsForm"
                    initialValues={initalValuesForStripePayment}
                    onSubmit={handleCustomPaymentSubmit}
                    handleRemovePaymentMethod={handleRemovePaymentMethod}
                    hasDefaultPaymentMethod={hasDefaultPaymentMethod}
                    addPaymentMethodError={addPaymentMethodError}
                    deletePaymentMethodError={deletePaymentMethodError}
                    createStripeCustomerError={createStripeCustomerError}
                    handleCardSetupError={handleCardSetupError}
                    inProgress={isSubmitting}
                  />
                ) : null}
              </>
            )
          ) : paymentMethodsLoading || setupIntentLoading ? (
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
                </>
              )}
              {showCustomPaymentForm && customClientSecret && (
                <CustomStripePaymentForm
                  clientSecret={customClientSecret}
                  ctaButtonTxt="CustomStripePaymentForm.savePaymentMethodButton"
                  handleCustomPaymentSubmit={handleCustomPaymentSubmit}
                  currentUserEmail={currentUser.attributes.email}
                  showInitialMessageInput={false}
                />
              )}
            </>
          )}
        </div>
      </LayoutSideNavigation>
    </Page>
  );
};

PaymentMethodsPageComponent.defaultProps = {
  currentUser: null,
  addPaymentMethodError: null,
  deletePaymentMethodError: null,
  createStripeCustomerError: null,
  handleCardSetupError: null,
};

PaymentMethodsPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  scrollingDisabled: bool.isRequired,
  addPaymentMethodError: object,
  deletePaymentMethodError: object,
  createStripeCustomerError: object,
  handleCardSetupError: object,
  onCreateSetupIntent: func.isRequired,
  onHandleCardSetup: func.isRequired,
  onSavePaymentMethod: func.isRequired,
  onDeletePaymentMethod: func.isRequired,
  fetchStripeCustomer: func.isRequired,

  // from injectIntl
  intl: intlShape.isRequired,
};

const mapStateToProps = state => {
  const { currentUser } = state.user;

  const {
    deletePaymentMethodInProgress,
    addPaymentMethodError,
    deletePaymentMethodError,
    createStripeCustomerError,
  } = state.paymentMethods;

  const { stripeCustomerFetched } = state.PaymentMethodsPage;

  const { handleCardSetupError } = state.stripe;
  return {
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
    deletePaymentMethodInProgress,
    addPaymentMethodError,
    deletePaymentMethodError,
    createStripeCustomerError,
    handleCardSetupError,
    stripeCustomerFetched,
  };
};

const mapDispatchToProps = dispatch => ({
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  fetchStripeCustomer: () => dispatch(stripeCustomer()),
  onHandleCardSetup: params => dispatch(handleCardSetup(params)),
  onCreateSetupIntent: params => dispatch(createStripeSetupIntent(params)),
  onSavePaymentMethod: (stripeCustomer, newPaymentMethod) =>
    dispatch(savePaymentMethod(stripeCustomer, newPaymentMethod)),
  onDeletePaymentMethod: params => dispatch(deletePaymentMethod(params)),
});

const PaymentMethodsPage = compose(
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(PaymentMethodsPageComponent);

export default PaymentMethodsPage;
