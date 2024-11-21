const StripeAccountController = require('../controllers/stripe-account.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class StripeAccountRoute extends BaseRoute {
  constructor(router) {
    super('stripe-account');
    router.post(
      this.ROOT_PATH + '/retrieve-stripe-account',
      authMiddleware,
      StripeAccountController.retrieveStripeAccount
    );
    router.post(
      this.ROOT_PATH + '/connect-stripe-account',
      authMiddleware,
      StripeAccountController.connectStripeAccount
    );
    router.post(
      this.ROOT_PATH + '/create-stripe-account-dashboard-link',
      authMiddleware,
      StripeAccountController.createStripeDashboardLink
    );
    router.post(
      this.ROOT_PATH + '/get-balance',
      authMiddleware,
      StripeAccountController.getStripeAccountBalance
    );
    router.post(
      this.ROOT_PATH + '/create-payout',
      authMiddleware,
      StripeAccountController.createStripeAccountPayout
    );
    router.post(
      this.ROOT_PATH + '/update-payout-interval',
      authMiddleware,
      StripeAccountController.updateStripeAccountPayoutInterval
    );
  }
}
module.exports = StripeAccountRoute;
