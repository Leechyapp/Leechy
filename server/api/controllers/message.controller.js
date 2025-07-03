const AwsService = require('../services/aws.service');
const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const { types } = require('sharetribe-flex-sdk');
const SharetribeService = require('../services/sharetribe.service');
const { UUID } = types;

class MessageController {
  static async saveFiles(req, res, next) {
    try {
      const { files } = req;
      const { messageId } = req.body;
      const transactionId = req.body.transactionId;
      // Processing transaction ID (removed logging for security)
      // Removed files logging for security

      const filesToSave = new Array();
      if (messageId) {
        for (let i = 0; i < files.length; i++) {
          filesToSave.push({
            filename: files[i].key,
            mimetype: files[i].mimetype,
          });
        }
      }

      const transactionRes = await SharetribeIntegrationService.showTransaction({
        id: transactionId,
      });
      const transaction = transactionRes.data.data;
      // Processing transaction data (removed sensitive logging)
      const existingFileAttachments = transaction?.attributes?.metadata?.fileAttachments || {};

      const fileAttachments = {
        ...existingFileAttachments,
        [messageId]: filesToSave,
      };

      const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          fileAttachments,
        },
      });

      if (updatedTransaction?.data?.errors) {
        // Transaction update failed (removed error details logging for security)
        res.status(400).send(updatedTransaction?.data?.errors);
      }

      // Process file attachments for saving (removed sensitive logging)
      for (const [key, value] of Object.entries(fileAttachments)) {
        const files = value;
        for (let i = 0; i < files.length; i++) {
          files[i].url = await AwsService.generatePreSignedPutUrl(files[i].filename);
        }
      }

      res.send(fileAttachments);
    } catch (error) {
      next(error);
    }
  }

  static async fetchFiles(req, res, next) {
    try {
      const transactionId = req.body.transactionId.uuid;

      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId);
      const transaction = transactionRes.data;
      const fileAttachments = transaction?.attributes?.metadata?.fileAttachments || {};
      // Process file attachments for fetching (removed sensitive logging)
      for (const [key, value] of Object.entries(fileAttachments)) {
        const files = value;
        for (let i = 0; i < files.length; i++) {
          files[i].url = await AwsService.generatePreSignedPutUrl(files[i].filename);
        }
      }

      res.send(fileAttachments);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = MessageController;
