const SharetribeService = require('../services/sharetribe.service');
const HttpException = require('../classes/http-exception.class');

exports.authMiddleware = async (req, res, next) => {
  try {
    const currentUser = await SharetribeService.getCurrentUser(req, res);
    if (currentUser?.data?.id?.uuid) {
      req.userUUID = currentUser.data.id.uuid;
      next();
    } else {
      next(new HttpException(401, 'Not authorized'));
    }
  } catch (error) {
    next(new HttpException(401, error));
  }
};
