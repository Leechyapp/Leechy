const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;

class ShippingController {
  static async updateShippingStatus(req, res, next) {
    try {
      const { transactionId, nextTransition } = req.body;
      console.log(`transactionId`, transactionId);
      const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          shippingStatus: nextTransition,
        },
      });
      console.log(`updatedTransaction`, updatedTransaction);
      res.send('Shipping status updated');
    } catch (error) {
      next(error);
    }
  }
}
module.exports = ShippingController;
