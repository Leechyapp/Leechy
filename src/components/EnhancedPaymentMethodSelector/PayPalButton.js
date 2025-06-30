import React, { useEffect, useState } from 'react';
import { bool, func, string } from 'prop-types';
import { injectIntl, intlShape, FormattedMessage } from '../../util/reactIntl';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import classNames from 'classnames';
import { createPayPalOrder, authorizePayPalOrder, getPayPalConfigStatus } from '../../util/api';

import css from './PayPalButton.module.css';

const PayPalButton = ({ 
  totalAmount, 
  currency, 
  onPaymentSubmit, 
  inProgress, 
  intl,
  paypalClientId,
  transactionLineItems,
  providerId,
  customerId 
}) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paypalSDK, setPaypalSDK] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [backendConfigured, setBackendConfigured] = useState(false);

  useEffect(() => {
    // Detect if we're on mobile
    const mobile = Capacitor.isNativePlatform();
    setIsMobile(mobile);
    
    const initializePayPal = async () => {
      if (!paypalClientId) {
        return;
      }

      try {
        // Load PayPal SDK
        await loadPayPalSDK();
        
        // Test backend API availability
        const isBackendConfigured = await checkBackendConfig();
        
        // Only set available if backend is configured
        setIsAvailable(isBackendConfigured);
      } catch (error) {
        setError('Failed to initialize PayPal');
      }
    };

    const loadPayPalSDK = () => {
      return new Promise((resolve, reject) => {
        // Check if PayPal SDK is already loaded
        if (window.paypal) {
          setPaypalSDK(window.paypal);
          resolve();
          return;
        }

        // Create script tag for PayPal SDK
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=${currency.toUpperCase()}&intent=authorize&enable-funding=venmo`;
        script.onload = () => {
          setPaypalSDK(window.paypal);
          resolve();
        };
        script.onerror = () => {
          reject(new Error('Failed to load PayPal SDK'));
        };
        
        document.head.appendChild(script);
      });
    };

    const checkBackendConfig = async () => {
      try {
        const config = await getPayPalConfigStatus();
        const isConfigured = config.success && config.configured;
        setBackendConfigured(isConfigured);
        return isConfigured;
      } catch (error) {
        setBackendConfigured(false);
        return false;
      }
    };

    initializePayPal();
  }, [paypalClientId, currency]);

  const handlePayPalClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isMobile) {
        await handleMobilePayPal();
      } else {
        await handleWebPayPal();
      }
    } catch (error) {
      // Provide user-friendly error messages
      if (error.message && error.message.includes('cancelled')) {
        setError('Payment was cancelled');
      } else if (error.message && error.message.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else if (error.message && error.message.includes('Failed to create')) {
        setError('Unable to create PayPal order. Please check your connection and try again.');
      } else if (error.message && error.message.includes('Failed to capture')) {
        setError('Payment was processed but capture failed. Please contact support.');
      } else {
        setError('Unable to process PayPal payment. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebPayPal = async () => {
    if (!paypalSDK) {
      throw new Error('PayPal SDK not loaded');
    }

    // Convert amount to proper format
    const amount = typeof totalAmount === 'string' 
      ? parseFloat(totalAmount.replace(/[^0-9.-]+/g, '')).toFixed(2)
      : (totalAmount / 100).toFixed(2); // Convert from cents if needed

    return new Promise((resolve, reject) => {
      // Create a unique container for this PayPal button
      const containerId = `paypal-button-${Date.now()}`;
      const buttonsContainer = document.createElement('div');
      buttonsContainer.id = containerId;
      buttonsContainer.style.position = 'fixed';
      buttonsContainer.style.top = '50%';
      buttonsContainer.style.left = '50%';
      buttonsContainer.style.transform = 'translate(-50%, -50%)';
      buttonsContainer.style.zIndex = '10000';
      buttonsContainer.style.backgroundColor = 'white';
      buttonsContainer.style.padding = '20px';
      buttonsContainer.style.borderRadius = '8px';
      buttonsContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      buttonsContainer.style.minWidth = '300px';
      document.body.appendChild(buttonsContainer);

      // Add overlay
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      overlay.style.zIndex = '9999';
      document.body.appendChild(overlay);

      const cleanup = () => {
        if (document.body.contains(buttonsContainer)) {
          document.body.removeChild(buttonsContainer);
        }
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      };

      // Close on overlay click
      overlay.addEventListener('click', () => {
        cleanup();
        reject(new Error('Payment was cancelled'));
      });

      try {
        paypalSDK.Buttons({
          createOrder: async (data, actions) => {
            try {
              const orderPayload = {
                amount: amount,
                currency: currency.toUpperCase(),
                description: 'Leechy Booking Payment',
                metadata: {
                  source: 'paypal_button',
                  timestamp: new Date().toISOString()
                }
              };
              
              const orderData = await createPayPalOrder(orderPayload);

              return orderData.orderId;
            } catch (error) {
              cleanup();
              reject(error);
              throw error;
            }
          },
          onApprove: async (data, actions) => {
            try {
              const authorizePayload = {
                transactionLineItems,
                providerId,
                customerId
              };
              
              const authorizeData = await authorizePayPalOrder(data.orderID, authorizePayload);
              
              await onPaymentSubmit({
                type: 'paypal',
                orderId: authorizeData.authorization.orderId,
                authorizationId: authorizeData.authorization.authorizationId,
                payerInfo: authorizeData.authorization.order?.payer,
                order: authorizeData.authorization.order,
                captured: false, // Important: not captured yet
                backendProcessed: true,
                message: 'Payment authorized - will be captured when seller accepts'
              });
              
              cleanup();
              resolve(authorizeData);
            } catch (error) {
              cleanup();
              reject(error);
            }
          },
          onError: (error) => {
            cleanup();
            reject(error);
          },
          onCancel: () => {
            cleanup();
            reject(new Error('Payment was cancelled'));
          }
        }).render(`#${containerId}`).catch((error) => {
          cleanup();
          reject(error);
        });

      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  };

  const handleMobilePayPal = async () => {
    if (!paypalSDK) {
      throw new Error('PayPal SDK not loaded');
    }

    // For mobile, we'll use the same web flow but with mobile-optimized experience
    return handleWebPayPal();
  };

  if (!isAvailable) {
    return (
      <div className={css.unavailable}>
        <p>
          <FormattedMessage id="PayPalButton.unavailable" />
        </p>
      </div>
    );
  }

  return (
    <div className={css.root}>
      {error && (
        <div className={css.error}>
          <p>{error}</p>
        </div>
      )}
      
      <button
        className={classNames(css.paypalButton, { [css.loading]: isLoading || inProgress })}
        onClick={handlePayPalClick}
        disabled={isLoading || inProgress || !paypalSDK}
        type="button"
      >
        <span className={css.paypalLogo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M8.32 2.73A4.5 4.5 0 0 1 12.44 1h4.56a4.5 4.5 0 0 1 4.5 4.5v.56a4.5 4.5 0 0 1-4.5 4.5h-2.25L14 12.5h-1.5L11.75 10H9.5a4.5 4.5 0 0 1-4.5-4.5v-.56a4.5 4.5 0 0 1 1.32-3.21z" 
              fill="#003087"
            />
            <path 
              d="M7.5 6.5h8.5a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H7.5a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3z" 
              fill="#0070ba"
            />
            <path 
              d="M2.5 10.5h8.5a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3H2.5a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3z" 
              fill="#003087"
            />
          </svg>
        </span>
        <span className={css.paypalText}>
          {isLoading || inProgress ? (
            <FormattedMessage id="PayPalButton.processing" />
          ) : (
            <FormattedMessage id="PayPalButton.payWith" />
          )}
        </span>
      </button>

      <div className={css.securityInfo}>
        <p>
          <FormattedMessage id="PayPalButton.securityInfo" />
        </p>
        <p className={css.paymentOptions}>
          <FormattedMessage id="PayPalButton.availableOptions" />
        </p>
      </div>
    </div>
  );
};

PayPalButton.defaultProps = {
  currency: 'USD',
  inProgress: false,
  paypalClientId: null,
};

PayPalButton.propTypes = {
  totalAmount: string.isRequired,
  currency: string,
  onPaymentSubmit: func.isRequired,
  inProgress: bool,
  intl: intlShape.isRequired,
  paypalClientId: string,
  transactionLineItems: string,
  providerId: string,
  customerId: string,
};

export default injectIntl(PayPalButton);