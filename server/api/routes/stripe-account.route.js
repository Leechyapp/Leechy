const StripeAccountController = require('../controllers/stripe-account.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class StripeAccountRoute extends BaseRoute {
  constructor(router) {
    super('stripe-account');
    router.post(
      this.ROOT_PATH + '/update-payout-settings',
      authMiddleware,
      StripeAccountController.updatePayoutSettings
    );
  }
}
module.exports = StripeAccountRoute;
