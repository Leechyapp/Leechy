const SharetribeService = require('../services/sharetribe.service');
const HttpException = require('../classes/http-exception.class');
const UserService = require('../services/user.service');
const UserSyncService = require('../services/user-sync.service');

exports.authMiddleware = async (req, res, next) => {
  try {
    const currentUser = await SharetribeService.getCurrentUser(req, res);
    if (currentUser?.data?.id?.uuid) {
      req.currentUser = currentUser.data;
      req.userUUID = currentUser.data.id.uuid;
      const userId = await UserService.searchIdWithUUID(req.userUUID);
      if (userId) {
        req.userId = userId;
      } else {
        const newUser = await UserSyncService.insert(req.currentUser, req.userUUID);
        req.userId = newUser[0];
      }
      next();
    } else {
      next(new HttpException(401, 'Not authorized'));
    }
  } catch (error) {
    next(new HttpException(401, error));
  }
};
