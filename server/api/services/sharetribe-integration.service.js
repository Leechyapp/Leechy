const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');
const integrationSdk = sharetribeIntegrationSdk.createInstance({
  clientId: process.env.SHARETRIBE_INTEGRATION_API_CLIENT_ID,
  clientSecret: process.env.SHARETRIBE_INTEGRATION_API_SECRET_KEY,
});

class SharetribeIntegrationService {
  static async updateMetadata(params) {
    return await integrationSdk.transactions
      .updateMetadata(params, {
        expand: true,
      })
      .then(res => {
        return res;
      })
      .catch(error => {
        console.error(error);
        return error;
      });
  }

  static async showTransaction(params) {
    return await integrationSdk.transactions
      .show(params)
      .then(res => {
        return res;
      })
      .catch(error => {
        console.error(error);
        return error;
      });
  }
}
module.exports = SharetribeIntegrationService;
