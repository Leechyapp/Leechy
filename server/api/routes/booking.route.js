const BookingController = require('../controllers/booking.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authTrxMiddleware } = require('../middlewares/authTrx.middleware');
const { verifyCaptchaStrict } = require('../middlewares/captcha.middleware');
const { rateLimitPayments, emergencyIPBlock } = require('../middlewares/rate-limit.middleware');
const { analyzeBehavior } = require('../middlewares/behavioral-analysis.middleware');
const BaseRoute = require('./base.route');

class BookingRoute extends BaseRoute {
  constructor(router) {
    super('booking');
    router.post(
      this.ROOT_PATH + '/create-booking-request',
      emergencyIPBlock,
      analyzeBehavior,
      rateLimitPayments(2, 60000),
      authMiddleware,
      verifyCaptchaStrict,
      BookingController.createBookingRequest
    );
    router.post(
      this.ROOT_PATH + '/accept-booking-request',
      emergencyIPBlock,
      rateLimitPayments(1, 300000), // Max 1 acceptance per 5 minutes
      authMiddleware,
      authTrxMiddleware,
      verifyCaptchaStrict, // CRITICAL: Add CAPTCHA protection
      BookingController.acceptBookingRequest
    );
  }
}

module.exports = BookingRoute;
