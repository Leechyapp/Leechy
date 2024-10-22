const FollowsController = require('../controllers/follows.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authPublicMiddleware } = require('../middlewares/authPublic.middleware');
const BaseRoute = require('./base.route');

class FollowsRoute extends BaseRoute {
  constructor(router) {
    super('follows');
    router.post(
      this.ROOT_PATH + '/search-initial-follows-data',
      authPublicMiddleware,
      FollowsController.searchInitialFollowsData
    );
    router.post(
      this.ROOT_PATH + '/follow-unfollow-user',
      authMiddleware,
      FollowsController.followUnfollowUser
    );
    router.post(
      this.ROOT_PATH + '/get-followers-list',
      authPublicMiddleware,
      FollowsController.getFollowersList
    );
    router.post(
      this.ROOT_PATH + '/get-following-list',
      authPublicMiddleware,
      FollowsController.getFollowingList
    );
  }
}

module.exports = FollowsRoute;
