const PaymentMethodController = require('../controllers/payment-method.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class PaymentMethodRoute extends BaseRoute {
  constructor(router) {
    super('payment-method');
    router.post(
      this.ROOT_PATH + '/list',
      authMiddleware,
      PaymentMethodController.getPaymentMethodsList
    );
    router.post(
      this.ROOT_PATH + '/retrieve',
      authMiddleware,
      PaymentMethodController.retrievePaymentMethod
    );
    router.post(
      this.ROOT_PATH + '/attach',
      authMiddleware,
      PaymentMethodController.attachPaymentMethod
    );
    router.post(
      this.ROOT_PATH + '/detach',
      authMiddleware,
      PaymentMethodController.detachPaymentMethod
    );
  }
}

module.exports = PaymentMethodRoute;
