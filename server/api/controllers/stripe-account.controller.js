const StripeService = require('../services/stripe.service');
const { REACT_APP_MARKETPLACE_ROOT_URL } = process.env;

class StripeAccountController {
  static async retrieveStripeAccount(req, res, next) {
    try {
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (stripeAccountId) {
        const stripeAccount = await StripeService.retrieveAccount(stripeAccountId);
        res.send(stripeAccount);
      } else {
        res.status(400).send('Stripe Account ID does not exists.');
      }
    } catch (error) {
      next(error);
    }
  }

  static async connectStripeAccount(req, res, next) {
    try {
      const { transactionId } = req;
      const { privateData } = req.currentUser.attributes.profile;
      const userStripeAccountId = privateData?.stripeAccountId;

      let stripeAccountId;
      if (userStripeAccountId) {
        stripeAccountId = userStripeAccountId;
      } else {
        const { countryCode } = req.body;
        if (!countryCode) {
          return res.status(400).send('Country code is undefined.');
        }

        const account = await StripeService.createAccount({
          country: countryCode,
          type: 'express',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          settings: {
            payouts: {
              schedule: {
                interval: 'manual',
              },
            },
          },
        });
        stripeAccountId = account.id;

        await SharetribeService.currentUserUpdateProfile(req, res, {
          privateData: {
            ...privateData,
            stripeAccountId,
          },
        });
      }

      let callbackPath = '/account/payouts';
      if (transactionId) {
        callbackPath = `/sale/${transactionId}`;
      }

      const accountLinks = await StripeService.createAccountLinks({
        account: stripeAccountId,
        refresh_url: REACT_APP_MARKETPLACE_ROOT_URL + callbackPath,
        return_url: REACT_APP_MARKETPLACE_ROOT_URL + callbackPath,
        type: 'account_onboarding',
      });

      res.send(accountLinks.url);
    } catch (error) {
      next(error);
    }
  }

  static async createStripeDashboardLink(req, res, next) {
    try {
      // Use this only if user has completed verification (accessing the Dashboard)
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (stripeAccountId) {
        const loginLink = await StripeService.createLoginLink(stripeAccountId);
        res.send(loginLink.url + '#/account');
      } else {
        res.send(null);
      }
    } catch (error) {
      next(error);
    }
  }
  static async getStripeAccountBalance(req, res, next) {
    try {
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (!stripeAccountId) {
        return res.status(404).send({ message: 'Not Found: Stripe Account ID' });
      }

      const returnData = {
        pendingAmount: null,
        availableAmount: null,
      };

      const balance = await StripeService.getBalance(stripeAccountId);
      if (balance) {
        const { pending, available } = balance;
        returnData.pendingAmount = {
          amount: pending[0].amount,
          currency: String(pending[0].currency).toUpperCase(),
        };
        returnData.availableAmount = {
          amount: available[0].amount,
          currency: String(available[0].currency).toUpperCase(),
        };
      }

      res.send(returnData);
    } catch (e) {
      next(e);
    }
  }

  static async createStripeAccountPayout(req, res, next) {
    try {
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (!stripeAccountId) {
        return res.status(404).send({ message: 'Not Found: Stripe Account ID' });
      }

      const balance = await StripeService.getBalance(stripeAccountId);
      if (balance) {
        const { available } = balance;
        const stripeAccountPayout = await StripeService.createPayout(
          stripeAccountId,
          available[0].amount,
          available[0].currency
        );
        res.send(stripeAccountPayout);
      } else {
        res.send('Available balance not found');
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StripeAccountController;
