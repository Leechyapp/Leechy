const PaymentMethodService = require('../services/payment-method.service');

class PaymentMethodController {
  static getPaymentMethodsList = async (req, res, next) => {
    try {
      const stripeCustomerId = req.currentUser.attributes.profile.privateData.stripeCustomerId;
      if (stripeCustomerId) {
        const paymentMethodsList = await PaymentMethodService.getPaymentMethodsList(
          stripeCustomerId
        );
        res.send(paymentMethodsList);
      } else {
        res.send([]);
      }
    } catch (e) {
      next(e);
    }
  };

  static retrievePaymentMethod = async (req, res, next) => {
    try {
      const paymentMethod = await PaymentMethodService.retrievePaymentMethod(
        req.body.stripePaymentMethodId
      );
      res.send(paymentMethod);
    } catch (e) {
      next(e);
    }
  };

  static attachPaymentMethod = async (req, res, next) => {
    try {
      const { stripePaymentMethodId } = req.body;
      let { stripeCustomerId } = req.body;
      if (!stripeCustomerId) {
        stripeCustomerId = req.currentUser.attributes.profile.privateData.stripeCustomerId;
      }
      await PaymentMethodService.attachPaymentMethod(stripeCustomerId, stripePaymentMethodId);
      res.send('Payment method saved');
    } catch (e) {
      next(e);
    }
  };

  static detachPaymentMethod = async (req, res, next) => {
    try {
      await PaymentMethodService.detachPaymentMethod(req.body.paymentMethodId);
      res.send('Payment method detached');
    } catch (e) {
      next(e);
    }
  };
}

module.exports = PaymentMethodController;
