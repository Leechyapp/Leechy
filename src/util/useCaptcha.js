import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useState, useCallback } from 'react';

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

  const verifyCaptcha = useCallback(
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
    verifyCaptcha,
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