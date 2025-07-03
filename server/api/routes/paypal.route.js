const express = require('express');
const router = express.Router();
const PayPalController = require('../controllers/paypal.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authPublicMiddleware } = require('../middlewares/authPublic.middleware');
const { verifyCaptchaStrict, verifyCaptcha } = require('../middlewares/captcha.middleware');
const { rateLimitPayments, emergencyIPBlock } = require('../middlewares/rate-limit.middleware');

// PayPal order management routes (use public auth for better flexibility)
// CRITICAL: Add CAPTCHA protection to prevent bot attacks
router.post('/create-order', authPublicMiddleware, verifyCaptchaStrict, PayPalController.createOrder);
router.post('/authorize-order/:orderId', authPublicMiddleware, verifyCaptchaStrict, PayPalController.authorizeOrder);
router.post('/capture-order/:orderId', authPublicMiddleware, verifyCaptchaStrict, PayPalController.captureOrder);
router.post('/capture-authorization/:authorizationId', authMiddleware, verifyCaptcha, PayPalController.captureAuthorization);
router.post('/void-authorization/:authorizationId', authMiddleware, PayPalController.voidAuthorization);
router.post('/void-booking-authorization/:transactionId', authMiddleware, PayPalController.voidBookingAuthorization);
router.get('/order/:orderId', authPublicMiddleware, PayPalController.getOrder);

// PayPal refund routes (require authentication)
router.post('/refund/:captureId', authMiddleware, PayPalController.refundPayment);

// PayPal webhook handler (no auth required - comes from PayPal)
router.post('/webhook', PayPalController.handleWebhook);

// PayPal configuration status (no auth required - public endpoint)
router.get('/config-status', PayPalController.getConfigStatus);

module.exports = router;