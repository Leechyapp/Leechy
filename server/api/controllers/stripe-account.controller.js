const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const StripeApiService = require('../services/stripe.service');

class StripeAccountController {
  static async updatePayoutSettings(req, res, next) {
    try {
      const stripeAccountId = await SharetribeIntegrationService.searchStripeAccountId(
        req.userUUID
      );
      await StripeApiService.updateAccountToAutomaticPayouts(stripeAccountId);
      res.send('Payout settings updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StripeAccountController;
