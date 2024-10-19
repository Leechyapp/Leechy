const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const StripeApiService = require('../services/stripe.service');

class StripeAccountController {
  static async updatePayoutSettings(req, res, next) {
    try {
      const stripeAccountId = await SharetribeIntegrationService.searchStripeAccountId(
        req.userUUID
      );
      const stripePayoutSettings = await StripeApiService.updateAccountToAutomaticPayouts(
        stripeAccountId
      );
      console.log(`stripePayoutSettings`, stripePayoutSettings);
      res.send(stripePayoutSettings);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StripeAccountController;
