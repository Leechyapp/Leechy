import React, { Component } from 'react';
import { bool, func, object, shape, string } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser } from '../../util/data';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  H3,
  LayoutSideNavigation,
  Page,
  UserNav,
  IconSpinner,
  InlineTextButton,
  Modal,
} from '../../components';
import StripeEmbeddedOnboarding from '../../components/StripeEmbeddedOnboarding/StripeEmbeddedOnboarding';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import { connectStripeAccount } from '../../util/api';
import { isMobileDevice, isMobileAppWebView, supportsPopups } from '../../util/isMobileDevice';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

import {
  stripeAccountClearError,
  getStripeConnectAccountLink,
  fetchStripeAccount,
} from '../../ducks/stripeConnectAccount.duck';
import { savePayoutDetails, loadData } from './StripePayoutPage.duck';
import css from './StripePayoutPage.module.css';

const STRIPE_ONBOARDING_RETURN_URL_SUCCESS = 'success';
const STRIPE_ONBOARDING_RETURN_URL_FAILURE = 'failure';

export class StripePayoutPageComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      countryCode: 'US',
      showEmbeddedOnboarding: false,
      useEmbeddedFlow: true,
    };
    
    // Bind methods
    this.handleGetStripeConnectAccountLinkError = this.handleGetStripeConnectAccountLinkError.bind(this);
    this.handleCreateStripeAccount = this.handleCreateStripeAccount.bind(this);
    this.handleEmbeddedSuccess = this.handleEmbeddedSuccess.bind(this);
    this.handleEmbeddedError = this.handleEmbeddedError.bind(this);
    this.handleEmbeddedExit = this.handleEmbeddedExit.bind(this);
  }

  componentDidMount() {
    const { onLoadData } = this.props;
    if (onLoadData) {
      onLoadData();
    }
  }

  handleGetStripeConnectAccountLinkError() {
    const { onStripeAccountClearError } = this.props;
    onStripeAccountClearError();
  }

  handleCreateStripeAccount() {
    const { getStripeConnectAccountLinkInProgress, onGetStripeConnectAccountLink } = this.props;
    
    // Check if we should use embedded flow (allow on all platforms - let's try embedded even in native apps)
    if (this.state.useEmbeddedFlow) {
      this.setState({ showEmbeddedOnboarding: true });
      return;
    }
    
    if (!getStripeConnectAccountLinkInProgress) {
      onGetStripeConnectAccountLink().then(async url => {
        if (url) {
          if (Capacitor.isNativePlatform()) {
            // Get the platform to customize browser behavior
            const platform = Capacitor.getPlatform();
            
            if (platform === 'ios') {
              // iOS-specific Safari View Controller configuration
              await Browser.open({
                url: url,
                windowName: '_blank',
                toolbarColor: '#635BFF',
                presentationStyle: 'popover', // Use popover for better in-app experience
                // iOS-specific options for Safari View Controller
                width: Math.min(window.innerWidth * 0.9, 800),
                height: Math.min(window.innerHeight * 0.9, 700)
              });
            } else if (platform === 'android') {
              // Android-specific Custom Tabs configuration
              await Browser.open({
                url: url,
                windowName: '_blank',
                toolbarColor: '#635BFF',
                presentationStyle: 'fullscreen'
              });
            } else {
              // Fallback for other platforms
              await Browser.open({
                url: url,
                windowName: '_blank',
                toolbarColor: '#635BFF',
                presentationStyle: 'fullscreen'
              });
            }
            
            // Listen for browser closure to refresh data
            const listener = await Browser.addListener('browserFinished', () => {
              console.log('Browser was closed - refreshing data');
              window.location.reload();
              listener.remove();
            });
            
          } else if (isMobileDevice() || isMobileAppWebView()) {
            // Mobile device or WebView - open in same window to prevent external browser redirect
            window.location.href = url;
          } else if (supportsPopups()) {
            // Desktop with popup support - use popup
            const popupFeatures = 'width=800,height=700,scrollbars=yes,resizable=yes,status=yes,left=' + 
              ((window.innerWidth - 800) / 2) + ',top=' + ((window.innerHeight - 700) / 2);
            const popup = window.open(url, 'stripe-connect', popupFeatures);
            
            if (popup) {
              const checkClosed = setInterval(() => {
                if (popup.closed) {
                  clearInterval(checkClosed);
                  window.location.reload();
                }
              }, 1000);
            } else {
              // Popup blocked - fallback to same window
              window.location.href = url;
            }
          } else {
            // No popup support - fallback to same window
            window.location.href = url;
          }
        }
      });
    }
  }

  handleEmbeddedSuccess() {
    console.log('Embedded onboarding completed successfully');
    this.setState({ showEmbeddedOnboarding: false });
    // Refresh the page to update the account status
    window.location.reload();
  }

  handleEmbeddedError(error) {
    console.error('Embedded onboarding error:', error);
    this.setState({ 
      showEmbeddedOnboarding: false,
      useEmbeddedFlow: false 
    });
    // Fallback to popup method
    this.handleCreateStripeAccount();
  }

  handleEmbeddedExit() {
    console.log('User exited embedded onboarding');
    this.setState({ showEmbeddedOnboarding: false });
  }

  render() {
    const {
      currentUser,
      getStripeConnectAccountLinkError,
      getStripeConnectAccountLinkInProgress,
      createStripeAccountError,
      createStripeAccountInProgress,
      stripeAccount,
      stripeAccountFetched,
      scrollingDisabled,
      intl,
    } = this.props;

    const { showEmbeddedOnboarding } = this.state;

    const ensuredCurrentUser = ensureCurrentUser(currentUser);
    const currentUserLoaded = !!ensuredCurrentUser.id;
    const stripeConnected = stripeAccount && stripeAccount.attributes.stripeAccountId;

    const title = intl.formatMessage({ id: 'StripePayoutPage.title' });

    const returnedNormallyFromStripe = window.location.search?.includes(
      STRIPE_ONBOARDING_RETURN_URL_SUCCESS
    );
    const returnedAbnormallyFromStripe = window.location.search?.includes(
      STRIPE_ONBOARDING_RETURN_URL_FAILURE
    );
    const showVerificationNeeded = stripeAccount && !stripeAccount.attributes.payoutsEnabled;

    // Get first and last name of the current user and use it in the form later
    const userName = ensuredCurrentUser.attributes.profile.displayName;
    const { firstName, lastName } = userName || {};

    const hasStripeOnboardingDataIfNeeded = returnedNormallyFromStripe
      ? !!(firstName && lastName && stripeConnected)
      : !!(firstName && lastName);

    const accountId = stripeConnected ? stripeAccount.attributes.stripeAccountId : null;
    const stripeAccountData = stripeConnected ? stripeAccount.attributes : null;

    const requirementsMissing =
      stripeAccount &&
      (stripeAccount.attributes.requirements.currently_due.length > 0 ||
        stripeAccount.attributes.requirements.past_due.length > 0);

    const savedCountry = stripeAccountData ? stripeAccountData.country : null;

    const handleGetStripeConnectAccountLinkFn = () => {
      this.handleCreateStripeAccount();
    };

    const returnedFromStripe = returnedNormallyFromStripe || returnedAbnormallyFromStripe;

    if (!currentUserLoaded) {
      return (
        <Page title={title} scrollingDisabled={scrollingDisabled}>
          <LayoutSideNavigation
            topbar={
              <>
                <TopbarContainer currentPage="StripePayoutPage" />
                <UserNav currentPage="StripePayoutPage" />
              </>
            }
            sideNav={null}
            useAccountSettingsNav
            currentPage="StripePayoutPage"
          >
            <div className={css.content}>
              <IconSpinner />
            </div>
          </LayoutSideNavigation>
        </Page>
      );
    }

    const showContent = stripeAccountFetched && hasStripeOnboardingDataIfNeeded;
    const showForm = !savedCountry && !stripeConnected;
    const savedCountryMaybe = savedCountry ? (
      <FormattedMessage id="StripePayoutPage.savedCountry" values={{ country: savedCountry }} />
    ) : null;

    const submitInProgress = createStripeAccountInProgress || getStripeConnectAccountLinkInProgress;
    const submitDisabled = !this.state.countryCode || submitInProgress;

    const {
      getBankAccountLinkError,
      getBankAccountLinkInProgress,
      onGetBankAccountLink,
      stripeBankAccountLastDigits,
    } = this.props;

    const accountOpened = !!(stripeAccount && stripeAccount.attributes.stripeAccountId);
    const accountNotConnected = !accountOpened;
    const bankAccountNotConnected = accountOpened && !stripeBankAccountLastDigits;
    const bankAccountConnected = accountOpened && stripeBankAccountLastDigits;
    const payoutsEnabled = stripeAccount && stripeAccount.attributes.payoutsEnabled;
    const accountRejected = false;

    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSideNavigation
          topbar={
            <>
              <TopbarContainer currentPage="StripePayoutPage" />
              <UserNav currentPage="StripePayoutPage" />
            </>
          }
          sideNav={null}
          useAccountSettingsNav
          currentPage="StripePayoutPage"
        >
          <div className={css.content}>
            <H3 as="h1" className={css.heading}>
              <FormattedMessage id="StripePayoutPage.heading" />
            </H3>
            {showContent ? (
              <div>
                {accountNotConnected && (
                  <div>
                    <H3 className={css.subtitle}>
                      <FormattedMessage id="StripePayoutPage.subtitle" />
                    </H3>
                    <p>
                      <FormattedMessage id="StripePayoutPage.description" />
                    </p>
                    
                    <InlineTextButton
                      className={css.submitButton}
                      inProgress={submitInProgress}
                      disabled={submitDisabled}
                      onClick={handleGetStripeConnectAccountLinkFn}
                    >
                      <FormattedMessage id="StripePayoutPage.submitButtonText" />
                    </InlineTextButton>
                  </div>
                )}
              </div>
            ) : (
              <IconSpinner />
            )}
          </div>
        </LayoutSideNavigation>

        {/* Embedded Stripe Onboarding Modal */}
        {showEmbeddedOnboarding && (
          <Modal
            id="StripeEmbeddedOnboardingModal"
            isOpen={showEmbeddedOnboarding}
            onClose={this.handleEmbeddedExit}
            usePortal
            onManageDisableScrolling={() => {}}
          >
            <div className={css.embeddedOnboardingModal}>
              <div className={css.modalHeader}>
                <h2>
                  <FormattedMessage id="StripePayoutPage.embeddedOnboarding.title" />
                </h2>
                <p>
                  <FormattedMessage id="StripePayoutPage.embeddedOnboarding.description" />
                </p>
              </div>
                             <StripeEmbeddedOnboarding
                 transactionId={ensuredCurrentUser.id?.uuid}
                 countryCode={this.state.countryCode}
                 onSuccess={this.handleEmbeddedSuccess}
                 onError={this.handleEmbeddedError}
                 onExit={this.handleEmbeddedExit}
               />
            </div>
          </Modal>
        )}
      </Page>
    );
  }
}

StripePayoutPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  scrollingDisabled: bool.isRequired,
  getStripeConnectAccountLinkError: propTypes.error,
  getStripeConnectAccountLinkInProgress: bool.isRequired,
  createStripeAccountError: propTypes.error,
  createStripeAccountInProgress: bool.isRequired,
  stripeAccount: propTypes.stripeAccount,
  stripeAccountFetched: bool.isRequired,
  onStripeAccountClearError: func.isRequired,
  onGetStripeConnectAccountLink: func.isRequired,
  onGetBankAccountLink: func.isRequired,
  onLoadData: func,
  stripeBankAccountLastDigits: string,
  getBankAccountLinkError: propTypes.error,
  getBankAccountLinkInProgress: bool.isRequired,
  intl: intlShape.isRequired,
};

const mapStateToProps = state => {
  const {
    getAccountLinkError: getStripeConnectAccountLinkError,
    getAccountLinkInProgress: getStripeConnectAccountLinkInProgress,
    createStripeAccountError,
    createStripeAccountInProgress,
    stripeAccount,
    stripeAccountFetched,
  } = state.stripeConnectAccount;
  const { currentUser } = state.user;
  return {
    currentUser,
    getStripeConnectAccountLinkError,
    getStripeConnectAccountLinkInProgress,
    createStripeAccountError,
    createStripeAccountInProgress,
    stripeAccount,
    stripeAccountFetched,
    scrollingDisabled: isScrollingDisabled(state),
    // Add missing props that are used in the component
    getBankAccountLinkError: null,
    getBankAccountLinkInProgress: false,
    stripeBankAccountLastDigits: null,
  };
};

const mapDispatchToProps = dispatch => ({
  onStripeAccountClearError: () => dispatch(stripeAccountClearError()),
  onGetStripeConnectAccountLink: () => dispatch(getStripeConnectAccountLink({
    failureURL: window.location.href,
    successURL: window.location.href,
    type: 'account_onboarding'
  })),
  onGetBankAccountLink: () => {}, // Placeholder function since this isn't implemented
  onLoadData: () => dispatch(loadData()),
});

const StripePayoutPage = compose(
  connect(mapStateToProps, mapDispatchToProps),
  injectIntl
)(StripePayoutPageComponent);

export default StripePayoutPage;
