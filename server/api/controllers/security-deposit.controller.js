const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const SharetribeService = require('../services/sharetribe.service');
const { types } = require('sharetribe-flex-sdk');
const StripeService = require('../services/stripe.service');
const AccountingUtil = require('../utils/accounting.util');
const { UUID } = types;

const SECURITY_DEPOSIT_COMMISSION = 0.9;

class SecurityDepositController {
  static chargeSecurityDeposit = async (req, res, next) => {
    try {
      const { transactionId } = req.body;

      const stripeAccountId = await SharetribeService.getUserStripeAccountId(req, res);
      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId.uuid);
      const transaction = await transactionRes.data;
      console.log(`transaction`, transaction);
      const payinTotalAmount = transaction.attributes.payinTotal.amount;

      const securityDepositPercentageValue = await transaction?.attributes?.protectedData
        ?.securityDepositPercentageValue;
      const stripeCustomerId = await transaction?.attributes?.metadata?.stripeCustomerId;
      const stripePaymentMethodId = await transaction?.attributes?.metadata?.stripePaymentMethodId;

      if (securityDepositPercentageValue && stripeCustomerId && stripePaymentMethodId) {
        const depositAmountUnformatted = payinTotalAmount * (securityDepositPercentageValue / 100);
        console.log(`depositAmountUnformatted`, depositAmountUnformatted);
        const depositAmount2Decimals = AccountingUtil.convertToDecimalAmount(
          depositAmountUnformatted
        );
        console.log(`depositAmount2Decimals`, depositAmount2Decimals);
        const depositAmount = AccountingUtil.roundToStripeInteger(depositAmount2Decimals);
        console.log(`depositAmount`, depositAmount);
        const depositTransferAmount = AccountingUtil.roundToStripeInteger(
          depositAmount * SECURITY_DEPOSIT_COMMISSION
        );
        console.log(`depositTransferAmount`, depositTransferAmount);

        const paymentIntentObject = {
          amount: depositAmount,
          currency: 'usd',
          payment_method_types: ['card'],
          customer: stripeCustomerId,
          payment_method: stripePaymentMethodId,
          description: `Security Deposit`,
          transfer_data: {
            amount: depositTransferAmount,
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
