const CurrentUserController = require('../controllers/current-user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const BaseRoute = require('./base.route');

class CurrentUserRoute extends BaseRoute {
  constructor(router) {
    super('current-user');
    router.post(this.ROOT_PATH + '/delete', authMiddleware, CurrentUserController.delete);
    router.post(this.ROOT_PATH + '/block-user', authMiddleware, CurrentUserController.blockUser);
    router.post(
      this.ROOT_PATH + '/unblock-user',
      authMiddleware,
      CurrentUserController.UnblockUser
    );
    router.post(
      this.ROOT_PATH + '/get-blocked-users-list',
      authMiddleware,
      CurrentUserController.getBlockedUsersList
    );
  }
}

module.exports = CurrentUserRoute;
