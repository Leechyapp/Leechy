const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentMethodService {
  static async getPaymentMethodsList(stripeCustomerId) {
    try {
      const cardsObj = await stripe.customers.listPaymentMethods(stripeCustomerId, {
        type: 'card',
        limit: 5,
      });
      return cardsObj.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  static async retrievePaymentMethod(paymentMethodId) {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod;
  }

  static async updatePaymentMethodMetaData(paymentMethodId, metadata) {
    await stripe.paymentMethods.update(paymentMethodId, { metadata });
  }

  static async attachPaymentMethod(stripeCustomerId, paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
  }

  static async detachPaymentMethod(paymentMethodId) {
    await stripe.paymentMethods.detach(paymentMethodId);
  }
}

module.exports = PaymentMethodService;
