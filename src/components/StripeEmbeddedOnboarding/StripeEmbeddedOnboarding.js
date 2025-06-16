import React, { useState, useEffect, useRef } from 'react';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { createStripeAccountSession, connectStripeAccount } from '../../util/api';
import { isMobileDevice } from '../../util/isMobileDevice';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { openStripeConnectInApp } from '../../util/browserUtils';
import styles from './StripeEmbeddedOnboarding.module.css';

const StripeEmbeddedOnboarding = ({ 
  accountId, 
  transactionId,
  countryCode = 'US',
  onSuccess, 
  onError, 
  onExit,
  appearance = {
    overlays: 'dialog',
    variables: {
      colorPrimary: '#635BFF',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: isMobileDevice() ? '4px' : '6px',
      borderRadius: isMobileDevice() ? '6px' : '8px',
    }
  }
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stripeConnectInstance, setStripeConnectInstance] = useState(null);
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [showWebViewWarning, setShowWebViewWarning] = useState(false);
  const containerRef = useRef(null);
  const componentRef = useRef(null);

  // Check if we're in a problematic WebView environment
  const isProblematicWebView = () => {
    const isNative = Capacitor.isNativePlatform();
    const userAgent = navigator.userAgent.toLowerCase();
    const isWebView = userAgent.includes('wv') || userAgent.includes('webview');
    
    console.log('Environment check:', {
      isNative,
      isWebView,
      userAgent,
      platform: Capacitor.getPlatform()
    });
    
    return isNative || isWebView;
  };

  // Function to fetch client secret for account session
  const fetchClientSecret = async () => {
    try {
      console.log('=== StripeEmbeddedOnboarding fetchClientSecret called ===');
      console.log('transactionId:', transactionId);
      console.log('countryCode:', countryCode);
      
      // Always create/get the Stripe account first for embedded flow
      console.log('Creating/getting Stripe account for embedded flow...');
      const connectResponse = await connectStripeAccount({ 
        embedded: true,
        transactionId,
        countryCode 
      });
      
      if (!connectResponse.accountId) {
        throw new Error('Failed to get Stripe account ID from connect response');
      }

      const actualAccountId = connectResponse.accountId;
      setStripeAccountId(actualAccountId);
      
      console.log('Creating account session for account:', actualAccountId);
      
      // Small delay to ensure account is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await createStripeAccountSession({ accountId: actualAccountId });
      
      if (!response.client_secret) {
        throw new Error('No client secret received from account session');
      }
      
      console.log('Account session created successfully');
      return response.client_secret;
    } catch (err) {
      console.error('Failed to create account session:', err);
      throw err;
    }
  };

  // Alternative flow using Stripe's account links (the working approach)
  const handleAlternativeFlow = async () => {
    try {
      console.log('Using alternative flow with account links...');
      
      // Create account link instead of embedded component
      const accountLinkUrl = await connectStripeAccount({ 
        embedded: false, // Use account links instead
        transactionId,
        countryCode 
      });
      
      if (accountLinkUrl) {
        console.log('Opening account link in in-app browser:', accountLinkUrl);
        
        // Use centralized browser utility with callback
        await openStripeConnectInApp(accountLinkUrl, () => {
          console.log('Stripe Connect onboarding completed - refreshing data');
          if (onSuccess) {
            setTimeout(() => {
              onSuccess();
            }, 1000);
          }
        });
        
        console.log('Account link opened - user will complete onboarding in in-app browser');
      }
    } catch (err) {
      console.error('Alternative flow failed:', err);
      setError('Failed to initialize onboarding. Please try again.');
      if (onError) onError(err);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeStripeConnect = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if we're in a problematic environment
        if (isProblematicWebView()) {
          console.log('Detected WebView environment - using alternative flow directly');
          // Instead of showing warning, just use alternative flow directly
          await handleAlternativeFlow();
          setIsLoading(false);
          return;
        }

        // Initialize Stripe Connect for web browsers
        const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
        console.log('Using Stripe publishable key:', publishableKey ? 'Key found' : 'Key missing');
        console.log('Initializing Stripe Connect...');
        
        const connectInstance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret,
          appearance,
        });

        if (!mounted) return;

        setStripeConnectInstance(connectInstance);

        // Create the account onboarding component
        console.log('Creating account onboarding component...');
        const accountOnboarding = connectInstance.create('account-onboarding');

        // Set up event handlers
        accountOnboarding.setOnExit(() => {
          console.log('User exited the onboarding flow');
          if (onExit) onExit();
        });

        // Set collection options to minimize external redirects
        accountOnboarding.setCollectionOptions({
          fields: 'currently_due',
          futureRequirements: 'omit',
        });

        // Add error handler for load errors
        accountOnboarding.setOnLoadError((loadError) => {
          console.error('Account onboarding load error:', loadError);
          
          // If load error in WebView, use alternative
          if (isProblematicWebView()) {
            console.log('Load error in WebView, switching to alternative flow');
            handleAlternativeFlow();
          } else {
            if (onError) onError(new Error(`Load error: ${loadError.error.message}`));
          }
        });

        // Mount the component to the DOM
        if (containerRef.current && mounted) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(accountOnboarding);
          componentRef.current = accountOnboarding;
        }

        setIsLoading(false);

        // Handle successful onboarding
        accountOnboarding.setOnExit(async () => {
          try {
            if (onSuccess) onSuccess();
            if (onExit) onExit();
          } catch (err) {
            console.error('Error handling onboarding success:', err);
            if (onError) onError(err);
          }
        });

      } catch (err) {
        console.error('Failed to initialize Stripe Connect:', err);
        if (mounted) {
          // If initialization fails in WebView, use alternative
          if (isProblematicWebView()) {
            console.log('Initialization failed in WebView, using alternative flow');
            handleAlternativeFlow();
          } else {
            setError(err.message || 'Failed to initialize Stripe onboarding');
            setIsLoading(false);
            if (onError) onError(err);
          }
        }
      }
    };

    initializeStripeConnect();

    return () => {
      mounted = false;
      
      // Cleanup: remove component from DOM if it exists
      if (componentRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(componentRef.current);
        } catch (e) {
          // Component might already be removed
        }
      }
    };
  }, [accountId, onSuccess, onError, onExit]);

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorMessage}>
          <h3>Unable to load onboarding</h3>
          <p>{error}</p>
          
          <div className={styles.buttonContainer}>
            <button 
              className={styles.retryButton}
              onClick={() => {
                setError(null);
                setIsLoading(true);
                window.location.reload();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading Stripe onboarding...</p>
          <small>This may take a moment to initialize securely...</small>
        </div>
      )}
      <div 
        ref={containerRef} 
        className={styles.stripeContainer}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
    </div>
  );
};

export default StripeEmbeddedOnboarding; 