const SharetribeService = require('../services/sharetribe.service');
const HttpException = require('../classes/http-exception.class');
const UserService = require('../services/user.service');
const UserSyncService = require('../services/user-sync.service');

exports.authDynamicMiddleware = async (req, res, next) => {
  try {
    const sharetribeRes = await SharetribeService.getCurrentUserFull(req, res);
    if (sharetribeRes?.data?.data?.id?.uuid) {
      req.userUUID = sharetribeRes.data.data.id.uuid;
      const userId = await UserService.searchIdWithUUID(req.userUUID);
      if (userId) {
        req.userId = userId;
      } else {
        const currentUser = sharetribeRes?.data?.data;
        const newUser = await UserSyncService.insert(currentUser, req.userUUID);
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
