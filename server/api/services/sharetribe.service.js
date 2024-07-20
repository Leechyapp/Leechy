const { getSdk, getTrustedSdk } = require('../../api-util/sdk');

class SharetribeService {
  static async getCurrentUser(req, res) {
    const sdk = getSdk(req, res);
    return await sdk.currentUser
      .show()
      .then(res => {
        return res.data;
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
        console.error(error);
        return null;
      });
  }
}
module.exports = SharetribeService;
