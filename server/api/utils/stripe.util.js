class StripeUtil {
  static checkIfPaymentIntentSucceeded(paymentIntent) {
    if (paymentIntent && paymentIntent.status !== 'succeeded') {
      throw new Error(
        `Stripe payment intent confirmation did not succeed, current status: ${paymentIntent.status}`
      );
    }
  }
}
module.exports = StripeUtil;
