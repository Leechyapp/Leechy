import React, { useEffect, useRef, useState } from 'react';
import { bool } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, Page, UserNav, LayoutSideNavigation, IconSpinner } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './PaymentMethodsPage.module.css';
import CustomSavedCardDetails from '../../components/CustomSavedCardDetails/CustomSavedCardDetails.js';
import CustomStripePaymentForm from '../../components/CustomStripePaymentForm/CustomStripePaymentForm.js';
import {
  attachPaymentMethod,
  createSetupIntent,
  detachPaymentMethod,
  getPaymentMethodsList,
} from '../../util/api.js';
import NativeBottomNavbar from '../../components/NativeBottomNavbar/NativeBottomNavbar.js';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh.js';

const PaymentMethodsPageComponent = props => {
  const { currentUser, scrollingDisabled, onManageDisableScrolling, intl } = props;

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

  const refreshData = () => {
    setCustomPaymentForm(false);
    setCustomClientSecret(null);
    setPaymentApiId(1);
    setCustomDefaultPaymentMethod(null);
    setCustomPaymentMethodList([]);
    setPaymentMethodsLoading(false);
    setSetupIntentLoading(false);
  };

  /****************** END CUSTOM STRIPE  ******************/

  const title = intl.formatMessage({ id: 'PaymentMethodsPage.title' });

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
        <PullToRefresh refreshData={refreshData}>
          <div className={css.content}>
            <H3 as="h1">
              <FormattedMessage id="PaymentMethodsPage.heading" />
            </H3>
            {rootPaymentAPI === 1 ? null : paymentMethodsLoading || setupIntentLoading ? (
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
        </PullToRefresh>
      </LayoutSideNavigation>
      <NativeBottomNavbar />
    </Page>
  );
};

PaymentMethodsPageComponent.defaultProps = {
  currentUser: null,
};

PaymentMethodsPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  scrollingDisabled: bool.isRequired,

  // from injectIntl
  intl: intlShape.isRequired,
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  return {
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

const mapDispatchToProps = dispatch => ({
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const PaymentMethodsPage = compose(
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(PaymentMethodsPageComponent);

export default PaymentMethodsPage;
