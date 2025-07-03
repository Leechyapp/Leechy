const SharetribeService = require('../services/sharetribe.service');
const StripeService = require('../services/stripe.service');

class SetupIntentController {
  static async getSetupIntent(req, res, next) {
    try {
      const { currentUser } = req;

      const email = currentUser.attributes.email;
      const firstName = currentUser.attributes.profile.firstName;
      const lastName = currentUser.attributes.profile.lastName;

      const getSetCustomerId = async () => {
        const { privateData } = req.currentUser.attributes.profile;
        const customerId = privateData?.stripeCustomerId;
        if (customerId) {
          return customerId;
        } else {
          const customer = await StripeService.createNewCustomer({
            name: `${firstName} ${lastName}`,
            email,
          });

          await SharetribeService.currentUserUpdateProfile(req, res, {
            privateData: {
              ...privateData,
              stripeCustomerId: customer.id,
            },
          });

          return customer.id;
        }
      };

      const stripeCustomerId = await getSetCustomerId();

      const setupIntentObject = {
        customer: stripeCustomerId,
        payment_method_types: ['card'],
      };

      // Security logging for monitoring setup intent requests
      console.log('🔒 SECURITY: SetupIntent creation attempt', {
        userId: currentUser?.id?.uuid,
        email: email,
        customerId: stripeCustomerId,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection.remoteAddress
      });

      const setupIntent = await StripeService.createSetupIntent(setupIntentObject);

      res.send(setupIntent.client_secret);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = SetupIntentController;
