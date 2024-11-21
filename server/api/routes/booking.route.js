const BookingController = require('../controllers/booking.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authTrxMiddleware } = require('../middlewares/authTrx.middleware');
const BaseRoute = require('./base.route');

class BookingRoute extends BaseRoute {
  constructor(router) {
    super('booking');
    router.post(
      this.ROOT_PATH + '/create-booking-request',
      authMiddleware,
      BookingController.createBookingRequest
    );
    router.post(
      this.ROOT_PATH + '/accept-booking-request',
      authMiddleware,
      authTrxMiddleware,
      BookingController.acceptBookingRequest
    );
  }
}

module.exports = BookingRoute;
