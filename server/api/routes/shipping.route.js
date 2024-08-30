const ShippingController = require('../controllers/shipping.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class ShippingRoute extends BaseRoute {
  constructor(router) {
    super('shipping');
    router.post(
      this.ROOT_PATH + '/update-shipping-status',
      authMiddleware,
      ShippingController.updateShippingStatus
    );
  }
}

module.exports = ShippingRoute;
