const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeApiService {
  static async createSetupIntent(dataObj) {
    return await stripe.setupIntents.create(dataObj);
  }

  static async createPaymentIntent(dataObj) {
    return await stripe.paymentIntents.create(dataObj);
  }

  static retrievePaymentIntent(stripePaymentIntentId) {
    return stripe.paymentIntents.retrieve(stripePaymentIntentId);
  }

  static async createRefund(dataObj) {
    return await stripe.refunds.create(dataObj);
  }
}

module.exports = StripeApiService;
