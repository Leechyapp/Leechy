const TransitionEnum = require('../enums/transition.enum');
const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const SharetribeService = require('../services/sharetribe.service');
const StripeService = require('../services/stripe.service');
const { types } = require('sharetribe-flex-sdk');
const ProcessAliasEnum = require('../enums/process-alias.enum');
const { UUID } = types;

class BookingController {
  static async createBookingRequest(req, res, next) {
    try {
      const { initialMessage, orderParams } = req.body;

      const { stripeCustomerId } = req.currentUser.attributes.profile.privateData;
      orderParams.protectedData.stripeCustomerId = stripeCustomerId;

      const initialTransition = await SharetribeService.transactionsInitiateDynamic(req, {
        processAlias: ProcessAliasEnum.DefaultBookingRelease1,
        transition: TransitionEnum.RequestPayment,
        params: orderParams,
      });
      if (initialTransition?.data?.errors) {
        return res.status(500).send(initialTransition?.data?.errors);
      }

      const transactionId = initialTransition.data.data.id;

      const transitionConfirmPaymentRes = await SharetribeService.transitionTransaction(req, res, {
        id: new UUID(transactionId.uuid),
        transition: TransitionEnum.ConfirmPayment,
        params: {},
      });
      if (transitionConfirmPaymentRes?.data?.errors) {
        return res.status(500).send(transitionConfirmPaymentRes?.data?.errors);
      }

      if (initialMessage && transactionId) {
        await SharetribeService.sendMessage(req, res, transactionId.uuid, initialMessage);
      }

      res.send({ transactionId });
    } catch (e) {
      next(e);
    }
  }

  static async acceptBookingRequest(req, res, next) {
    try {
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (!stripeAccountId) {
        return res.status(400).send({ message: `stripe_account_not_found` });
      } else {
        const stripeAccount = await StripeService.retrieveAccount(stripeAccountId);
        if (stripeAccount && stripeAccount?.payouts_enabled === false) {
          return res.status(400).send({ message: `stripe_payouts_disabled` });
        }
      }

      const { transactionId } = req.body;
      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId);
      const transaction = await transactionRes.data;
      const { protectedData } = transaction.attributes;

      const { stripeCustomerId, stripePaymentMethodId, payinTotal, payoutTotal } = protectedData;

      const paymentIntentObject = {
        amount: payinTotal.amount,
        currency: 'usd',
        payment_method_types: ['card'],
        customer: stripeCustomerId,
        payment_method: stripePaymentMethodId,
        description: `Transaction (ID: ${transactionId})`,
        transfer_data: {
          amount: payoutTotal.amount,
          destination: stripeAccountId,
        },
        metadata: {
          transactionId,
        },
        confirm: true,
      };

      const paymentIntent = await StripeService.createPaymentIntent(paymentIntentObject);

      await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          stripeAccountId,
          stripePaymentIntentId: paymentIntent.id,
          stripeChargeId: paymentIntent.latest_charge,
        },
      });

      res.send('This booking has been accepted.');
    } catch (e) {
      next(e);
    }
  }
}

module.exports = BookingController;
