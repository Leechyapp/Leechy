import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useState, useCallback } from 'react';

/**
 * Standalone CAPTCHA verification function for use outside React components
 * This is used in Redux actions and other non-component contexts
 */
export const verifyCaptcha = async (action = 'payment_form') => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.debug('reCAPTCHA not available in server environment');
    return null;
  }

  // Check if reCAPTCHA is configured
  if (!window.grecaptcha) {
    console.debug('reCAPTCHA not loaded yet - skipping verification');
    return null;
  }

  try {
    // Get the site key from environment
    const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.debug('reCAPTCHA site key not configured');
      return null;
    }

    // Wait for reCAPTCHA to be ready
    if (!window.grecaptcha.ready) {
      console.debug('reCAPTCHA not ready yet - skipping verification');
      return null;
    }

    // Execute reCAPTCHA verification using the ready promise
    const token = await new Promise((resolve, reject) => {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(siteKey, { action })
          .then(resolve)
          .catch(reject);
      });
    });
    
    if (!token) {
      throw new Error('Failed to get reCAPTCHA token');
    }
    
          // CAPTCHA token obtained successfully
    return token;
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error);
    return null;
  }
};

/**
 * Custom hook for handling reCAPTCHA verification
 * Provides an easy interface for payment forms to verify users before submission
 */
export const useCaptcha = () => {
  // Safely try to get the reCAPTCHA context - it might not be available
  let executeRecaptcha = null;
  try {
    const recaptchaContext = useGoogleReCaptcha();
    executeRecaptcha = recaptchaContext?.executeRecaptcha;
  } catch (error) {
    // Provider context not available - this is fine when reCAPTCHA is not configured
    console.debug('reCAPTCHA provider not available:', error.message);
  }

  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState(null);

  const verifyCaptchaHook = useCallback(
    async (action = 'payment_form') => {
      if (!executeRecaptcha) {
        console.debug('reCAPTCHA not configured - skipping verification');
        return null;
      }

      try {
        setCaptchaLoading(true);
        setCaptchaError(null);
        
        // Get the reCAPTCHA token
        const token = await executeRecaptcha(action);
        
        if (!token) {
          throw new Error('Failed to get reCAPTCHA token');
        }
        
        return token;
      } catch (error) {
        console.error('reCAPTCHA verification failed:', error);
        setCaptchaError(error.message || 'CAPTCHA verification failed');
        return null;
      } finally {
        setCaptchaLoading(false);
      }
    },
    [executeRecaptcha]
  );

  return {
    verifyCaptcha: verifyCaptchaHook,
    captchaLoading,
    captchaError,
    isCaptchaReady: !!executeRecaptcha,
  };
};

/**
 * Higher-order component that wraps forms with CAPTCHA protection
 * Usage: export default withCaptchaProtection(YourPaymentForm);
 */
export const withCaptchaProtection = (WrappedComponent) => {
  return (props) => {
    const captcha = useCaptcha();
    
    return <WrappedComponent {...props} captcha={captcha} />;
  };
}; 