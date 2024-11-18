const HttpException = require('../classes/http-exception.class');
const SharetribeService = require('../services/sharetribe.service');

exports.authTrxMiddleware = async (req, res, next) => {
  try {
    let transactionId;
    if (req.body.transactionId?.uuid) {
      transactionId = req.body.transactionId.uuid;
    } else {
      transactionId = req.body.transactionId;
    }
    const transaction = await SharetribeService.showTransaction(req, res, transactionId);
    if (transaction?.data?.id?.uuid) {
      req.transactionId = transaction.data.id.uuid;
      next();
    } else {
      next(new HttpException(401, 'You are not authorized to view this transaction.'));
    }
  } catch (error) {
    next(new HttpException(401, error));
  }
};
