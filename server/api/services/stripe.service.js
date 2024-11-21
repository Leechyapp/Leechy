const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  static async createNewCustomer(dataObj) {
    return await stripe.customers.create(dataObj);
  }

  static async createPaymentIntent(dataObj) {
    return await stripe.paymentIntents.create(dataObj);
  }

  static retrievePaymentIntent(stripePaymentIntentId) {
    return stripe.paymentIntents.retrieve(stripePaymentIntentId);
  }

  static async createSetupIntent(dataObj) {
    return await stripe.setupIntents.create(dataObj);
  }

  static async retrieveSetupIntent(stripeSetupIntentId) {
    return await stripe.setupIntents.retrieve(stripeSetupIntentId);
  }

  static async createAccount(dataObj) {
    const account = await stripe.accounts.create(dataObj);
    return account;
  }

  static async createLoginLink(stripeAccountId) {
    const account = await stripe.accounts.createLoginLink(stripeAccountId);
    return account;
  }

  static async createAccountLinks(dataObj) {
    const accountLinks = await stripe.accountLinks.create(dataObj);
    return accountLinks;
  }

  static async retrieveAccount(stripeAccountId) {
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account;
  }

  static async getBalance(stripeAccountId) {
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });
    return balance;
  }

  static async createPayout(stripeAccountId, amount, currency) {
    return await stripe.payouts.create(
      {
        amount,
        currency,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );
  }

  static async updateAccountToAutomaticPayouts(stripeAccountId) {
    const account = await stripe.accounts.update(stripeAccountId, {
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
          },
        },
      },
    });
    return account;
  }

  static async updateAccountPayoutInterval(stripeAccountId, interval) {
    const account = await stripe.accounts.update(stripeAccountId, {
      settings: {
        payouts: {
          schedule: {
            interval,
          },
        },
      },
    });
    return account;
  }

  static async createRefund(dataObj) {
    return await stripe.refunds.create(dataObj);
  }
}

module.exports = StripeService;
