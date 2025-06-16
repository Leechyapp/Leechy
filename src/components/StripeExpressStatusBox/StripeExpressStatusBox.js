import { useSelector } from 'react-redux';
import { connectStripeAccount, createStripeDashboardLink } from '../../util/api';
import React, { useState } from 'react';
import StripeConnectAccountStatusBox from '../StripeConnectAccountStatusBox/StripeConnectAccountStatusBox';
import css from './StripeExpressStatusBox.module.scss';
import { propTypes } from '../../util/types';
import Button from '../Button/Button';
import { FormattedMessage, injectIntl } from 'react-intl';
import { IconSpinner, Modal } from '..';
import StripeEmbeddedOnboarding from '../StripeEmbeddedOnboarding/StripeEmbeddedOnboarding';
import isNativePlatform from '../../util/isNativePlatform';
import { isMobileDevice, isMobileAppWebView, supportsPopups } from '../../util/isMobileDevice';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const StripeExpressStatusBox = injectIntl(props => {
  const { intl, transactionId, isCustomOffer } = props;

  const state = useSelector(state => state);

  const stripeExpressPayoutPage = state?.StripeExpressPayoutPage;
  const { fetchStripeExpressInProgress } = stripeExpressPayoutPage;
  const stripeExpress = stripeExpressPayoutPage?.stripeExpress;
  const payouts_enabled = stripeExpress?.payouts_enabled;

  const [accountLinkInProgress, setAccountLinkInProgress] = useState(false);
  const [dashboardLinkInProgress, setDashboardLinkInProgress] = useState(false);
  const [accountLinkInError, setAccountLinkError] = useState(null);
  const [countryCode, setCountryCode] = useState('US'); // Default to US for easier testing
  const [showEmbeddedOnboarding, setShowEmbeddedOnboarding] = useState(false);
  const [useEmbeddedFlow, setUseEmbeddedFlow] = useState(true);

  const onConnnectStripeAccount = (linkTarget = '_blank') => {
    // Debug logging
    console.log('=== Stripe Connect Debug ===');
    console.log('useEmbeddedFlow:', useEmbeddedFlow);
    console.log('isNativePlatform:', isNativePlatform);
    console.log('isMobileDevice():', isMobileDevice());
    console.log('isMobileAppWebView():', isMobileAppWebView());
    console.log('countryCode:', countryCode);
    
    // Check if we should use embedded flow (allow on all platforms - let's try embedded even in native apps)
    if (useEmbeddedFlow) {
      console.log('Using embedded flow - showing modal');
      setShowEmbeddedOnboarding(true);
      return;
    }
    
    console.log('Using fallback flow - making API call');

    // Original popup/redirect logic for fallback
    setAccountLinkInProgress(true);
    connectStripeAccount({ transactionId: transactionId?.uuid, countryCode })
      .then(async link => {
        if (link) {
          if (Capacitor.isNativePlatform()) {
            // Get the platform to customize browser behavior
            const platform = Capacitor.getPlatform();
            
            if (platform === 'ios') {
              // iOS-specific Safari View Controller configuration
              await Browser.open({
                url: link,
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
                url: link,
                windowName: '_blank',
                toolbarColor: '#635BFF',
                presentationStyle: 'fullscreen'
              });
            } else {
              // Fallback for other platforms
              await Browser.open({
                url: link,
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
            
          } else if (isNativePlatform || isMobileAppWebView()) {
            // Legacy native platform or WebView - open in same window
            window.open(link, '_self');
          } else if (isMobileDevice()) {
            // Mobile browser - open in same window to prevent external browser redirect
            window.location.href = link;
          } else if (supportsPopups()) {
            // Desktop with popup support - use popup
            const popupFeatures = 'width=800,height=700,scrollbars=yes,resizable=yes,status=yes,left=' + 
              ((window.innerWidth - 800) / 2) + ',top=' + ((window.innerHeight - 700) / 2);
            const popup = window.open(link, 'stripe-connect', popupFeatures);
            
            if (popup) {
              const checkClosed = setInterval(() => {
                if (popup.closed) {
                  clearInterval(checkClosed);
                  window.location.reload();
                }
              }, 1000);
            } else {
              // Popup blocked - fallback to same window
              window.location.href = link;
            }
          } else {
            // No popup support - fallback to same window
            window.location.href = link;
          }
          setAccountLinkInProgress(false);
        } else {
          setAccountLinkInProgress(false);
        }
      })
      .catch(error => {
        console.error(error);
        setAccountLinkInProgress(false);
        setAccountLinkError(true);
      });
  };

  const handleEmbeddedSuccess = () => {
    console.log('Embedded onboarding completed successfully');
    setShowEmbeddedOnboarding(false);
    // Refresh the page to update the account status
    window.location.reload();
  };

  const handleEmbeddedError = (error) => {
    console.error('Embedded onboarding error:', error);
    setShowEmbeddedOnboarding(false);
    // Fallback to popup method
    setUseEmbeddedFlow(false);
    onConnnectStripeAccount();
  };

  const handleEmbeddedExit = () => {
    console.log('User exited embedded onboarding');
    setShowEmbeddedOnboarding(false);
  };

  const getStripeConnectExpressDashboardLink = () => {
    setDashboardLinkInProgress(true);
    createStripeDashboardLink({})
      .then(async link => {
        if (link) {
          if (Capacitor.isNativePlatform()) {
            // Get the platform to customize browser behavior
            const platform = Capacitor.getPlatform();
            
            if (platform === 'ios') {
              // iOS-specific Safari View Controller configuration
              await Browser.open({
                url: link,
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
                url: link,
                windowName: '_blank',
                toolbarColor: '#635BFF',
                presentationStyle: 'fullscreen'
              });
            } else {
              // Fallback for other platforms
              await Browser.open({
                url: link,
                windowName: '_blank',
                toolbarColor: '#635BFF',
                presentationStyle: 'fullscreen'
              });
            }
          } else if (isNativePlatform || isMobileDevice() || isMobileAppWebView()) {
            // Legacy native platform, mobile device, or WebView - open in same window
            window.open(link, '_self');
          } else {
            // Desktop - open in new tab
            window.open(link, '_blank');
          }
          setDashboardLinkInProgress(false);
        } else {
          setDashboardLinkInProgress(false);
        }
      })
      .catch(error => {
        console.error(error);
        setDashboardLinkInProgress(false);
      });
  };

  return (
    <>
      {fetchStripeExpressInProgress ? (
        <IconSpinner />
      ) : (
        <>
          {!stripeExpress && (
            <StripeConnectAccountStatusBox
              intl={intl}
              type="verificationNotStarted"
              inProgress={accountLinkInProgress}
              onGetStripeConnectAccountLink={() => onConnnectStripeAccount()}
              onChangeCountryCode={value => setCountryCode(value)}
              countryCode={countryCode}
            />
          )}
          {stripeExpress && payouts_enabled && (
            <>
              {!isCustomOffer && (
                <>
                  <h6>
                    <FormattedMessage id="StripeExpressStatusBox.connected.label" />
                  </h6>
                  <StripeConnectAccountStatusBox
                    type="verificationSuccess"
                    inProgress={accountLinkInProgress}
                    onGetStripeConnectAccountLink={() => onConnnectStripeAccount()}
                  />
                  <Button
                    inProgress={dashboardLinkInProgress}
                    onClick={() => getStripeConnectExpressDashboardLink()}
                    className={css.stripeConnectCtaButton}
                  >
                    <FormattedMessage id="StripeExpressStatusBox.connected.button" />
                  </Button>
                </>
              )}
            </>
          )}
          {stripeExpress && !payouts_enabled && (
            <StripeConnectAccountStatusBox
              type="verificationNeeded"
              inProgress={accountLinkInProgress}
              onGetStripeConnectAccountLink={() => onConnnectStripeAccount('_blank')}
            />
          )}
        </>
      )}

      {/* Embedded Stripe Onboarding Modal */}
      {showEmbeddedOnboarding && (
        <>
          {console.log('=== Rendering Embedded Modal ===')}
          <Modal
            id="StripeEmbeddedOnboardingModal"
            isOpen={showEmbeddedOnboarding}
            onClose={handleEmbeddedExit}
            usePortal
            onManageDisableScrolling={() => {}}
          >
            <div className={css.embeddedOnboardingModal}>
              <div className={css.modalHeader}>
                <h2>
                  <FormattedMessage id="StripeExpressStatusBox.embeddedOnboarding.title" />
                </h2>
                <p>
                  <FormattedMessage id="StripeExpressStatusBox.embeddedOnboarding.description" />
                </p>
              </div>
              <StripeEmbeddedOnboarding
                transactionId={transactionId?.uuid}
                countryCode={countryCode}
                onSuccess={handleEmbeddedSuccess}
                onError={handleEmbeddedError}
                onExit={handleEmbeddedExit}
              />
            </div>
          </Modal>
        </>
      )}
    </>
  );
});

StripeExpressStatusBox.defaultProps = {
  transactionId: null,
  isCustomOffer: false,
};

StripeExpressStatusBox.propTypes = {
  rootClassName: propTypes.uuid,
  isCustomOffer: propTypes.bool,
};

export default StripeExpressStatusBox;
