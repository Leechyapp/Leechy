const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const SharetribeService = require('../services/sharetribe.service');
const { types } = require('sharetribe-flex-sdk');
const StripeService = require('../services/stripe.service');
const InsuranceMethodEnum = require('../enums/insurance-method.enum');
const { UUID } = types;

class SecurityDepositController {
  static chargeSecurityDeposit = async (req, res, next) => {
    try {
      const { transactionId } = req.body;

      const stripeAccountId = await SharetribeService.getUserStripeAccountId(req, res);
      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId.uuid);
      const transaction = await transactionRes.data;
      console.log(`transaction`, transaction);

      const insuranceMethod = transaction?.attributes?.protectedData?.insuranceMethod;
      if (insuranceMethod !== InsuranceMethodEnum.SecurityDeposit) {
        return res.send('Security deposit was not selected as a rental protection method.');
      }

      const payinTotal = transaction.attributes.payinTotal;
      const payinTotalCurrency = payinTotal.currency;

      const securityDepositPercentageValue =
        transaction?.attributes?.protectedData?.securityDepositPercentageValue;
      const securityDepositAmount = transaction?.attributes?.protectedData?.securityDepositAmount;
      const securityDepositTransferAmount =
        transaction?.attributes?.protectedData?.securityDepositTransferAmount;

      const stripeCustomerId = transaction?.attributes?.metadata?.stripeCustomerId;
      const stripePaymentMethodId = transaction?.attributes?.metadata?.stripePaymentMethodId;

      if (
        securityDepositPercentageValue &&
        securityDepositAmount &&
        securityDepositTransferAmount &&
        stripeCustomerId &&
        stripePaymentMethodId
      ) {
        const paymentIntentObject = {
          amount: securityDepositAmount,
          currency: payinTotalCurrency,
          payment_method_types: ['card'],
          customer: stripeCustomerId,
          payment_method: stripePaymentMethodId,
          description: `Security Deposit`,
          transfer_data: {
            amount: securityDepositTransferAmount,
            destination: stripeAccountId,
          },
          metadata: {
            transactionId: transactionId.uuid,
          },
          confirm: true,
        };
        console.log(`paymentIntentObject`, paymentIntentObject);
        const paymentIntent = await StripeService.createPaymentIntent(paymentIntentObject);
        console.log(`paymentIntent`, paymentIntent);

        const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
          id: new UUID(transactionId.uuid),
          metadata: {
            stripePaymentIntentId: paymentIntent.id,
            stripeChargeId: paymentIntent.latest_charge,
            securityDepositStatus: 'paid',
            securityDepositAmount,
            securityDepositTransferAmount,
          },
        });
        console.log(`updatedTransaction`, updatedTransaction);
        res.send('Ok');
      } else {
        res.send('No security deposit charged.');
      }
    } catch (e) {
      next(e);
    }
  };

  static saveSecurityDepositData = async (req, res, next) => {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).send(`Transaction ID of ${transactionId} does not exists.`);
      }

      const sharetribeRes = await SharetribeService.getCurrentUserFull(req, res, {
        include: ['stripeCustomer.defaultPaymentMethod'],
      });
      const included = sharetribeRes.data.included;

      const stripePaymentMethod = included?.[0];
      const stripePaymentMethodId = stripePaymentMethod?.attributes?.stripePaymentMethodId;
      if (!stripePaymentMethodId) {
        return res.status(400).send(`Stripe Payment Method ID does not exists.`);
      }
      const stripeCustomer = included?.[1];
      const stripeCustomerId = stripeCustomer?.attributes?.stripeCustomerId;
      if (!stripeCustomerId) {
        return res.status(400).send(`Stripe Customer ID does not exists.`);
      }

      const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          stripeCustomerId,
          stripePaymentMethodId,
          securityDepositStatus: 'pending',
        },
      });
      console.log(`updatedTransaction`, updatedTransaction);

      res.send('Ok');
    } catch (e) {
      next(e);
    }
  };

  static refundSecurityDeposit = async (req, res, next) => {
    try {
      const { transactionId } = req;

      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId);
      const transaction = await transactionRes.data;

      const stripeChargeId = await transaction?.attributes?.metadata?.stripeChargeId;

      const stripeRefund = await StripeService.createRefund({
        charge: stripeChargeId,
        reverse_transfer: true,
      });

      const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          stripeRefundId: stripeRefund.id,
          securityDepositStatus: 'refunded',
        },
      });
      console.log(`updatedTransaction`, updatedTransaction);

      res.send('Ok');
    } catch (e) {
      next(e);
    }
  };
}

module.exports = SecurityDepositController;
