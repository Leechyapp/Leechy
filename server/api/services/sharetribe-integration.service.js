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
        // res.data contains the response data
        return res;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  }
}
module.exports = SharetribeIntegrationService;
