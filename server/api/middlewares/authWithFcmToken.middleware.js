const SharetribeService = require('../services/sharetribe.service');
const HttpException = require('../classes/http-exception.class');
const UserService = require('../services/user.service');
const UserSyncService = require('../services/user-sync.service');

exports.authWithFcmToken = async (req, res, next) => {
  try {
    const fcmToken = req.body.fcmToken;
    console.log(`fcmToken`, fcmToken);
    // delete req.body['fcmToken'];
    req.body = {};
    console.log(`req.body`, req.body);
    const currentUser = await SharetribeService.getCurrentUser(req, res);
    console.log(`currentUser`, currentUser);
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
      req.body.fcmToken = fcmToken;
      next();
    } else {
      next(new HttpException(401, 'Not authorized'));
    }
  } catch (error) {
    next(new HttpException(401, error));
  }
};
