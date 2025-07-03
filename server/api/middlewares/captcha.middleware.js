const axios = require('axios');

// Track used CAPTCHA tokens to prevent reuse attacks
const usedTokens = new Map();

// Clean up old tokens periodically (tokens are valid for max 2 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 2 * 60 * 1000; // 2 minutes
  
  for (const [token, timestamp] of usedTokens.entries()) {
    if (now - timestamp > maxAge) {
      usedTokens.delete(token);
    }
  }
}, 30000); // Clean every 30 seconds

/**
 * Check if a CAPTCHA token has been used before
 */
const isTokenUsed = (token) => {
  return usedTokens.has(token);
};

/**
 * Mark a CAPTCHA token as used
 */
const markTokenAsUsed = (token) => {
  usedTokens.set(token, Date.now());
};

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

  // STRICTER: If CAPTCHA is configured, require the token
  if (!captchaToken) {
    console.log('❌ CAPTCHA token required when CAPTCHA is configured');
    return res.status(400).json({
      error: 'Security verification required',
      message: 'Security verification is required for this action. Please refresh and try again.',
    });
  }

  // CRITICAL: Check for token reuse attacks
  if (isTokenUsed(captchaToken)) {
    console.log(`🚫 CAPTCHA REUSE ATTACK BLOCKED: Token already used - ${captchaToken.substring(0, 20)}...`);
    return res.status(400).json({
      error: 'CAPTCHA token already used',
      message: 'Security verification failed. Please refresh the page and try again.',
    });
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

    const { success, score, action, hostname, challenge_ts } = response.data;

    if (!success) {
      console.log('❌ CAPTCHA verification failed:', response.data);
      return res.status(400).json({
        error: 'CAPTCHA verification failed',
        message: 'Security verification failed. Please refresh and try again.',
      });
    }

    // CRITICAL: Validate timestamp to prevent old token reuse
    if (challenge_ts) {
      const challengeTime = new Date(challenge_ts).getTime();
      const now = Date.now();
      const maxAge = 2 * 60 * 1000; // 2 minutes max age
      
      if (now - challengeTime > maxAge) {
        console.log(`❌ CAPTCHA token too old: ${(now - challengeTime) / 1000}s old (max: ${maxAge / 1000}s)`);
        return res.status(400).json({
          error: 'CAPTCHA token expired',
          message: 'Security verification expired. Please refresh and try again.',
        });
      }
    }

    // CRITICAL: Validate action to prevent action mismatch attacks
    const expectedActions = ['booking_request', 'booking_acceptance', 'checkout_payment', 'add_payment_method', 'custom_payment_form', 'payment_form', 'security_deposit_charge', 'paypal_create_order', 'paypal_authorize_order', 'setup_intent', 'google_pay_checkout'];
    if (action && !expectedActions.includes(action)) {
      console.log(`❌ CAPTCHA action mismatch: got "${action}", expected one of: ${expectedActions.join(', ')}`);
      return res.status(400).json({
        error: 'CAPTCHA action mismatch',
        message: 'Security verification failed. Please refresh and try again.',
      });
    }

    // Check CAPTCHA score (0.0 = bot, 1.0 = human)
    // For payment forms, we want a higher threshold
    const minScore = process.env.RECAPTCHA_MIN_SCORE ? parseFloat(process.env.RECAPTCHA_MIN_SCORE) : 0.6;
    
    if (score < minScore) {
      console.log(`❌ CAPTCHA score too low: ${score} (min: ${minScore})`);
      return res.status(400).json({
        error: 'Security verification failed',
        message: 'Your request appears suspicious. Please try again or contact support.',
      });
    }

    // CRITICAL: Mark token as used AFTER all validations pass
    markTokenAsUsed(captchaToken);

    // Log successful verification for monitoring
    console.log(`✅ CAPTCHA verified: score=${score}, action=${action}, ip=${req.ip}`);
    
    // Add CAPTCHA data to request for logging/analytics
    req.captcha = {
      score,
      action,
      hostname,
      verified: true,
      challenge_ts,
    };

    next();
  } catch (error) {
    console.error('❌ CAPTCHA verification error:', error.message);
    
    // STRICTER: Block requests on verification errors in production
    const blockOnError = process.env.RECAPTCHA_BLOCK_ON_ERROR !== 'false'; // Default to blocking
    
    if (blockOnError) {
      return res.status(503).json({
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
    } else {
      delete process.env.RECAPTCHA_MIN_SCORE;
    }
    if (originalBlockOnError) {
      process.env.RECAPTCHA_BLOCK_ON_ERROR = originalBlockOnError;
    } else {
      delete process.env.RECAPTCHA_BLOCK_ON_ERROR;
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