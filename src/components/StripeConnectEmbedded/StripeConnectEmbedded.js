import React, { useState, useEffect } from 'react';
import { bool, func, string } from 'prop-types';
import { FormattedMessage } from '../../util/reactIntl';
import { Modal, Button, IconSpinner } from '../../components';
import css from './StripeConnectEmbedded.module.css';

const StripeConnectEmbedded = props => {
  const {
    isOpen,
    onClose,
    stripeUrl,
    onSuccess,
    onError,
    inProgress,
    marketplaceRootURL,
  } = props;

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && stripeUrl) {
      setIframeLoaded(false);
      setError(null);
    }
  }, [isOpen, stripeUrl]);

  useEffect(() => {
    const handleMessage = (event) => {
      // Ensure the message is from Stripe
      if (event.origin !== 'https://connect.stripe.com') {
        return;
      }

      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'stripe_connect_account_onboarding_success':
            onSuccess();
            onClose();
            break;
          case 'stripe_connect_account_onboarding_failure':
            setError('Stripe onboarding failed. Please try again.');
            onError();
            break;
          case 'stripe_connect_account_onboarding_closed':
            onClose();
            break;
          default:
            break;
        }
      }
    };

    // Listen for messages from the iframe
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onSuccess, onError, onClose]);

  // Check if URL indicates success/failure (for fallback handling)
  useEffect(() => {
    const checkForRedirect = () => {
      try {
        const iframe = document.getElementById('stripe-connect-iframe');
        if (iframe && iframe.contentWindow) {
          const iframeUrl = iframe.contentWindow.location.href;
          
          if (iframeUrl.includes('/account/payouts?success') || 
              iframeUrl.includes('/account/payouts') && 
              !iframeUrl.includes('connect.stripe.com')) {
            onSuccess();
            onClose();
          } else if (iframeUrl.includes('/account/payouts?failure')) {
            setError('Stripe onboarding failed. Please try again.');
            onError();
          }
        }
      } catch (e) {
        // Cross-origin restrictions prevent access to iframe content
        // This is expected and we rely on postMessage instead
      }
    };

    if (iframeLoaded) {
      const interval = setInterval(checkForRedirect, 1000);
      return () => clearInterval(interval);
    }
  }, [iframeLoaded, onSuccess, onError, onClose]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
  };

  const handleIframeError = () => {
    setError('Failed to load Stripe onboarding. Please try again.');
    setIframeLoaded(true);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      id="StripeConnectEmbedded"
      isOpen={isOpen}
      onClose={onClose}
      usePortal
      className={css.modal}
    >
      <div className={css.container}>
        <div className={css.header}>
          <h3 className={css.title}>
            <FormattedMessage id="StripeConnectEmbedded.title" />
          </h3>
          <Button
            type="button"
            onClick={onClose}
            className={css.closeButton}
          >
            ×
          </Button>
        </div>
        
        {error ? (
          <div className={css.error}>
            <p>{error}</p>
            <Button onClick={onClose}>
              <FormattedMessage id="StripeConnectEmbedded.closeButton" />
            </Button>
          </div>
        ) : (
          <div className={css.iframeContainer}>
            {!iframeLoaded && (
              <div className={css.loading}>
                <IconSpinner />
                <p>
                  <FormattedMessage id="StripeConnectEmbedded.loading" />
                </p>
              </div>
            )}
            {stripeUrl && (
              <iframe
                id="stripe-connect-iframe"
                src={stripeUrl}
                className={css.iframe}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Stripe Connect Onboarding"
                frameBorder="0"
                allowFullScreen
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

StripeConnectEmbedded.defaultProps = {
  isOpen: false,
  stripeUrl: null,
  inProgress: false,
  marketplaceRootURL: '',
};

StripeConnectEmbedded.propTypes = {
  isOpen: bool,
  onClose: func.isRequired,
  stripeUrl: string,
  onSuccess: func.isRequired,
  onError: func.isRequired,
  inProgress: bool,
  marketplaceRootURL: string,
};

export default StripeConnectEmbedded; 