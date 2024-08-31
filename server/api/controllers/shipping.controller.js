const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const { types } = require('sharetribe-flex-sdk');
const SharetribeService = require('../services/sharetribe.service');
const ShippingStatusEnum = require('../enums/shipping-status-enum');
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
      let message;
      switch (nextTransition) {
        case ShippingStatusEnum.ItemShipped:
          message = 'The rental item has been shipped';
          break;
        case ShippingStatusEnum.ItemReceived:
          message = 'The rental item has been received';
          break;
        case ShippingStatusEnum.ItemReturnShipped:
          message = 'The rental item has been shipped for return';
          break;
        case ShippingStatusEnum.ItemReturnReceived:
          message = 'The rental item has been returned';
          break;
      }

      if (message) {
        await SharetribeService.sendMessage(req, res, transactionId, message);
      }

      res.send('Shipping status updated');
    } catch (error) {
      next(error);
    }
  }
}
module.exports = ShippingController;
