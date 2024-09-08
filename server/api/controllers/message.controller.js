const AwsService = require('../services/aws.service');
const SharetribeIntegrationService = require('../services/sharetribe-integration.service');
const { types } = require('sharetribe-flex-sdk');
const SharetribeService = require('../services/sharetribe.service');
const { UUID } = types;

class MessageController {
  static async saveFiles(req, res, next) {
    try {
      const { files, userUUID } = req;
      const { messageId } = req.body;
      const transactionId = req.body.transactionId.uuid;

      console.log(`files`, files);

      const filesToSave = new Array();
      if (messageId) {
        for (let i = 0; i < files.length; i++) {
          filesToSave.push({
            messageId,
            transactionId,
            userId: userUUID,
            filename: files[i].key,
            mimetype: files[i].mimetype,
          });
        }
      }
      const fileAttachments = {
        [messageId]: filesToSave,
      };
      console.log(`fileAttachments`, fileAttachments);

      const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId),
        metadata: {
          fileAttachments,
        },
      });

      if (updatedTransaction?.data?.errors) {
        console.log(`updatedTransaction?.data?.errors`, updatedTransaction?.data?.errors);
        res.status(400).send(updatedTransaction?.data?.errors);
      }

      for (const [key, value] of Object.entries(fileAttachments)) {
        console.log(`${key} -> `, value);
        fileAttachments[key].url = await AwsService.generatePreSignedPutUrl(
          fileAttachments[key].filename
        );
      }

      return { fileAttachments };
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
      console.log(`fileAttachments (1)`, fileAttachments);
      for (const [key, value] of Object.entries(fileAttachments)) {
        console.log(`${key} -> ${value}`);
        const files = value;
        for (let i = 0; i < files.length; i++) {
          files[i].url = await AwsService.generatePreSignedPutUrl(files[i].filename);
        }
      }
      console.log(`fileAttachments (2)`, fileAttachments);

      res.send(fileAttachments);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = MessageController;
