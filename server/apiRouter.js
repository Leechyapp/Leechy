/**
 * This file contains server side endpoints that can be used to perform backend
 * tasks that can not be handled in the browser.
 *
 * The endpoints should not clash with the application routes. Therefore, the
 * endpoints are prefixed in the main server where this file is used.
 */

const express = require('express');
const bodyParser = require('body-parser');
const { deserialize } = require('./api-util/sdk');

const initiateLoginAs = require('./api/initiate-login-as');
const loginAs = require('./api/login-as');
const transactionLineItems = require('./api/transaction-line-items');
const initiatePrivileged = require('./api/initiate-privileged');
const transitionPrivileged = require('./api/transition-privileged');
const { verifyCaptchaStrict } = require('./api/middlewares/captcha.middleware');
const { rateLimitPayments, emergencyIPBlock } = require('./api/middlewares/rate-limit.middleware');

const createUserWithIdp = require('./api/auth/createUserWithIdp');

const { authenticateFacebook, authenticateFacebookCallback } = require('./api/auth/facebook');
const { authenticateGoogle, authenticateGoogleCallback } = require('./api/auth/google');
const CurrentUserRoute = require('./api/routes/currentuser.route');
const ContactRoute = require('./api/routes/contact.route');
const SecurityDepositRoute = require('./api/routes/security-deposit.route');
const MessageRoute = require('./api/routes/message.route');
const ShippingRoute = require('./api/routes/shipping.route');
const PushNotificationRoute = require('./api/routes/push-notification.route');
const FollowsRoute = require('./api/routes/follows.route');
const StripeAccountRoute = require('./api/routes/stripe-account.route');
const SetupIntentRoute = require('./api/routes/setup-intent.route');
const PaymentMethodRoute = require('./api/routes/payment-method.route');
const BookingRoute = require('./api/routes/booking.route');
const StripeCheckoutRoute = require('./api/routes/stripe-checkout.route');
const PayPalRoute = require('./api/routes/paypal.route');
const EarningsRoute = require('./api/routes/earnings.route');
const SecurityMonitorRoute = require('./api/routes/security-monitor.route');

const router = express.Router();

// ================ API router middleware: ================ //

// Parse JSON body for application/json requests (e.g., PayPal API)
router.use(
  bodyParser.json({
    type: 'application/json',
  })
);

// Parse Transit body first to a string
router.use(
  bodyParser.text({
    type: 'application/transit+json',
  })
);

// Deserialize Transit body string to JS data
router.use((req, res, next) => {
  if (req.get('Content-Type') === 'application/transit+json' && typeof req.body === 'string') {
    try {
      req.body = deserialize(req.body);
    } catch (e) {
      console.error('Failed to parse request body as Transit:');
      console.error(e);
      res.status(400).send('Invalid Transit in request body.');
      return;
    }
  }
  next();
});

// ================ API router endpoints: ================ //

router.get('/initiate-login-as', initiateLoginAs);
router.get('/login-as', loginAs);
router.post('/transaction-line-items', transactionLineItems);
router.post('/initiate-privileged', initiatePrivileged);
router.post('/transition-privileged', emergencyIPBlock, rateLimitPayments(3, 60000), verifyCaptchaStrict, transitionPrivileged);

// Create user with identity provider (e.g. Facebook or Google)
// This endpoint is called to create a new user after user has confirmed
// they want to continue with the data fetched from IdP (e.g. name and email)
router.post('/auth/create-user-with-idp', createUserWithIdp);

// Facebook authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Facebook
router.get('/auth/facebook', authenticateFacebook);

// This is the route for callback URL the user is redirected after authenticating
// with Facebook. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/facebook/callback', authenticateFacebookCallback);

// Google authentication endpoints

// This endpoint is called when user wants to initiate authenticaiton with Google
router.get('/auth/google', authenticateGoogle);

// This is the route for callback URL the user is redirected after authenticating
// with Google. In this route a Passport.js custom callback is used for calling
// loginWithIdp endpoint in Sharetribe Auth API to authenticate user to the marketplace
router.get('/auth/google/callback', authenticateGoogleCallback);

new CurrentUserRoute(router);
new ContactRoute(router);
new SecurityDepositRoute(router);
new MessageRoute(router);
new ShippingRoute(router);
new PushNotificationRoute(router);
new FollowsRoute(router);
new StripeAccountRoute(router);
new BookingRoute(router);
new SetupIntentRoute(router);
new PaymentMethodRoute(router);

// Add Stripe Checkout routes for Google Pay fallback
router.use('/stripe-checkout', StripeCheckoutRoute);

// Add PayPal routes for PayPal and Venmo payments
router.use('/paypal', PayPalRoute);

// Add unified earnings routes for multi-payment-method payouts
router.use('/earnings', EarningsRoute);

// Add security monitoring routes (EMERGENCY: Monitor bot attacks)
router.use('/security', SecurityMonitorRoute);

module.exports = router;
