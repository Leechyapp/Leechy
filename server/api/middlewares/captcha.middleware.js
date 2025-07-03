const axios = require('axios');

/**
 * Middleware to verify Google reCAPTCHA v3 tokens
 * Protects sensitive endpoints like payment processing from bot attacks
 */
const verifyCaptcha = async (req, res, next) => {
  const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
  // Check for CAPTCHA token in both headers and body
  const captchaToken = req.headers['x-captcha-token'] || req.body.captchaToken;

  // Skip CAPTCHA verification if not configured (for development)
  if (!recaptchaSecretKey) {
    console.warn('⚠️ CAPTCHA verification skipped - RECAPTCHA_SECRET_KEY not configured');
    return next();
  }

  // Skip if no CAPTCHA token provided (allows backward compatibility)
  if (!captchaToken) {
    console.warn('⚠️ CAPTCHA verification skipped - no captchaToken provided');
    return next();
  }

  try {
    // Verify the CAPTCHA token with Google
    const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
      params: {
        secret: recaptchaSecretKey,
        response: captchaToken,
        remoteip: req.ip || req.connection.remoteAddress,
      },
    });

    const { success, score, action, hostname } = response.data;

    if (!success) {
      console.log('❌ CAPTCHA verification failed:', response.data);
      return res.status(400).json({
        error: 'CAPTCHA verification failed',
        message: 'Security verification failed. Please refresh and try again.',
      });
    }

    // Check CAPTCHA score (0.0 = bot, 1.0 = human)
    // For payment forms, we want a higher threshold
    const minScore = process.env.RECAPTCHA_MIN_SCORE ? parseFloat(process.env.RECAPTCHA_MIN_SCORE) : 0.5;
    
    if (score < minScore) {
      console.log(`❌ CAPTCHA score too low: ${score} (min: ${minScore})`);
      return res.status(400).json({
        error: 'Security verification failed',
        message: 'Your request appears suspicious. Please try again or contact support.',
      });
    }

    // Log successful verification for monitoring
    console.log(`✅ CAPTCHA verified: score=${score}, action=${action}`);
    
    // Add CAPTCHA data to request for logging/analytics
    req.captcha = {
      score,
      action,
      hostname,
      verified: true,
    };

    next();
  } catch (error) {
    console.error('❌ CAPTCHA verification error:', error.message);
    
    // In case of verification service failure, allow through but log
    // You might want to block in production for maximum security
    const blockOnError = process.env.RECAPTCHA_BLOCK_ON_ERROR === 'true';
    
    if (blockOnError) {
      return res.status(500).json({
        error: 'Security verification unavailable',
        message: 'Security verification is temporarily unavailable. Please try again later.',
      });
    } else {
      console.warn('⚠️ CAPTCHA verification error - allowing request through');
      next();
    }
  }
};

/**
 * Stricter CAPTCHA verification for high-risk endpoints like payments
 * Requires higher score and blocks requests more aggressively
 */
const verifyCaptchaStrict = async (req, res, next) => {
  const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
  // Check for CAPTCHA token in both headers and body
  const captchaToken = req.headers['x-captcha-token'] || req.body.captchaToken;

  // In strict mode, if CAPTCHA is not configured, warn but allow through
  if (!recaptchaSecretKey) {
    console.warn('⚠️ CAPTCHA verification required but RECAPTCHA_SECRET_KEY not configured - allowing through');
    return next();
  }

  if (!captchaToken) {
    // If CAPTCHA keys are configured but no token provided, require it
    console.log('❌ CAPTCHA token required for strict verification');
    return res.status(400).json({
      error: 'CAPTCHA token required',
      message: 'Security verification is required for this action.',
    });
  }

  // Use stricter score threshold for payments
  const originalMinScore = process.env.RECAPTCHA_MIN_SCORE;
  process.env.RECAPTCHA_MIN_SCORE = '0.7'; // Higher threshold for payments
  
  // Temporarily set blocking on error for strict verification
  const originalBlockOnError = process.env.RECAPTCHA_BLOCK_ON_ERROR;
  process.env.RECAPTCHA_BLOCK_ON_ERROR = 'true';

  // Call regular verification with stricter settings
  verifyCaptcha(req, res, (error) => {
    // Restore original settings
    if (originalMinScore) {
      process.env.RECAPTCHA_MIN_SCORE = originalMinScore;
    }
    if (originalBlockOnError) {
      process.env.RECAPTCHA_BLOCK_ON_ERROR = originalBlockOnError;
    }

    if (error) {
      return next(error);
    }
    next();
  });
};

module.exports = {
  verifyCaptcha,
  verifyCaptchaStrict,
}; 