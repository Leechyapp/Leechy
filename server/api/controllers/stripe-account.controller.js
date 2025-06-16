const SharetribeService = require('../services/sharetribe.service');
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

  static async createAccountSession(req, res, next) {
    try {
      console.log('createAccountSession called');
      console.log('User:', req.currentUser ? 'authenticated' : 'not authenticated');
      console.log('Request body:', req.body);

      if (!req.currentUser) {
        console.log('No authenticated user found');
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { accountId } = req.body;
      const { privateData } = req.currentUser.attributes.profile;
      const userStripeAccountId = accountId || privateData?.stripeAccountId;

      console.log('Creating account session for account:', userStripeAccountId);
      console.log('User private data:', privateData);

      if (!userStripeAccountId) {
        console.log('No Stripe account ID found');
        return res.status(400).json({ error: 'Stripe Account ID does not exist. Please create account first.' });
      }

      // Verify the account exists in Stripe
      try {
        const existingAccount = await StripeService.retrieveAccount(userStripeAccountId);
        console.log('Account exists in Stripe:', existingAccount.id);
      } catch (accountError) {
        console.error('Account does not exist in Stripe:', accountError);
        return res.status(400).json({ error: 'Stripe account not found. Please create account first.' });
      }

      // Create Account Session for embedded onboarding
      const accountSession = await StripeService.createAccountSession({
        account: userStripeAccountId,
        components: {
          account_onboarding: {
            enabled: true,
            features: {
              external_account_collection: true,
            },
          },
        },
      });

      console.log('Account session created successfully');
      res.json({ client_secret: accountSession.client_secret });
    } catch (error) {
      console.error('Error creating account session:', error);
      res.status(500).json({ error: error.message || 'Failed to create account session' });
    }
  }

  static async connectStripeAccount(req, res, next) {
    try {
      console.log('connectStripeAccount called');
      console.log('Request body:', req.body);
      
      const { transactionId } = req;
      const { embedded } = req.body;
      const { privateData } = req.currentUser.attributes.profile;
      const userStripeAccountId = privateData?.stripeAccountId;

      console.log('Existing Stripe account ID:', userStripeAccountId);
      console.log('Embedded flow requested:', embedded);

      let stripeAccountId;
      if (userStripeAccountId) {
        stripeAccountId = userStripeAccountId;
        console.log('Using existing Stripe account:', stripeAccountId);
      } else {
        const { countryCode } = req.body;
        if (!countryCode) {
          console.log('No country code provided');
          return res.status(400).json({ error: 'Country code is undefined.' });
        }

        console.log('Creating new Stripe account for country:', countryCode);
        const account = await StripeService.createAccount({
          country: countryCode,
          type: 'express',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        stripeAccountId = account.id;
        console.log('Created new Stripe account:', stripeAccountId);

        console.log('Updating user profile with Stripe account ID');
        await SharetribeService.currentUserUpdateProfile(req, res, {
          privateData: {
            ...privateData,
            stripeAccountId,
          },
        });
        console.log('User profile updated successfully');
      }

      // If embedded flow is requested, return account ID for Account Session creation
      if (embedded) {
        console.log('Returning account ID for embedded flow:', stripeAccountId);
        return res.json({ 
          accountId: stripeAccountId,
          embedded: true 
        });
      }

      // Legacy redirect flow
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

  static async updateStripeAccountPayoutInterval(req, res, next) {
    try {
      const stripeAccountId = req.currentUser.attributes.profile.privateData?.stripeAccountId;
      if (!stripeAccountId) {
        return res.status(404).send({ message: 'Not Found: Stripe Account ID' });
      }
      await StripeService.updateAccountPayoutInterval(stripeAccountId, req.body.interval);
      res.send('Stripe Account payout interval updated.');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StripeAccountController;
