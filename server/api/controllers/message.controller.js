const AwsService = require('../services/aws.service');
const SharetribeIntegrationService = require('../services/sharetribe-integration.service');

class MessageController {
  static async saveFiles(req, res, next) {
    try {
      const { files, userUUID } = req;
      const { transactionId, messageId } = req.body;

      const fileAttachments = {};
      if (messageId) {
        for (let i = 0; i < files.length; i++) {
          filesToSave[messageId] = {
            transactionId,
            userId: userUUID,
            filename: files[i].key,
            mimetype: files[i].mimetype,
          };
        }
      }

      const updatedTransaction = await SharetribeIntegrationService.updateMetadata({
        id: new UUID(transactionId.uuid),
        metadata: {
          fileAttachments,
        },
      });

      for (const [key, value] of Object.entries(fileAttachments)) {
        console.log(`${key} -> ${value}`);
        fileAttachments[j].url = await AwsService.generatePreSignedPutUrl(
          fileAttachments[j].filename
        );
      }

      return { fileAttachments };
    } catch (error) {
      next(error);
    }
  }

  static async fetchFiles(req, res, next) {
    try {
      const { transactionId } = req.body;

      const transactionRes = await SharetribeService.showTransaction(req, res, transactionId.uuid);
      const transaction = await transactionRes.data;
      const fileAttachments = await transaction?.attributes?.metadata?.fileAttachments;

      for (const [key, value] of Object.entries(fileAttachments)) {
        console.log(`${key} -> ${value}`);
        fileAttachments[j].url = await AwsService.generatePreSignedPutUrl(
          fileAttachments[j].filename
        );
      }

      return { fileAttachments };
    } catch (error) {
      next(error);
    }
  }
}
module.exports = MessageController;
