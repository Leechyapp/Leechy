const { getSdk, getTrustedSdk } = require('../../api-util/sdk');
const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;

class SharetribeService {
  static async getCurrentUser(req, res) {
    const sdk = getSdk(req, res);
    return await sdk.currentUser
      .show()
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.error(error?.data?.errors);
        return null;
      });
  }

  static async getCurrentUserFull(req, res, params = {}) {
    const sdk = getSdk(req, res);
    return await sdk.currentUser
      .show(params)
      .then(res => {
        return res;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  }

  static async showTransaction(req, res, transactionId) {
    const sdk = getSdk(req, res);
    return await sdk.transactions
      .show({ id: new UUID(transactionId) })
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  }

  static async getUserStripeAccountId(req, res) {
    const sdk = getSdk(req, res);
    return sdk.stripeAccount
      .fetch()
      .then(res => {
        return res.data.data.attributes.stripeAccountId;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  }

  static async updateCurrentUser(req, res, dataObj) {
    const sdk = getSdk(req, res);
    return await sdk.currentUser
      .updateProfile(dataObj)
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  }

  static async deleteCurrentUser(req, res) {
    const { currentPassword } = req.body;
    const trustedSdk = await getTrustedSdk(req);
    return trustedSdk.currentUser
      .delete(
        {
          currentPassword,
        },
        {
          expand: true,
        }
      )
      .then(res => {
        return res;
      })
      .catch(error => {
        return error;
      });
  }

  static async showUser(req, res, dataObj) {
    const sdk = getSdk(req, res);
    return await sdk.users
      .show(dataObj)
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.error(error?.data?.errors);
        return null;
      });
  }

  static async sendMessage(req, res, transactionId, message) {
    const sdk = getSdk(req, res);
    return await sdk.messages
      .send(
        {
          transactionId: new UUID(transactionId),
          content: message,
        },
        {
          expand: true,
        }
      )
      .then(res => {
        return res.data;
      })
      .catch(error => {
        console.error(error?.data?.errors);
        return null;
      });
  }
}
module.exports = SharetribeService;
