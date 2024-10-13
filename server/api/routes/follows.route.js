const FollowsController = require('../controllers/follows.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class FollowsRoute extends BaseRoute {
  constructor(router) {
    super('follows');
    router.post(this.ROOT_PATH + '/search-follows-count', FollowsController.searchFollowsCount);
    router.post(
      this.ROOT_PATH + '/follow-unfollow-user',
      authMiddleware,
      FollowsController.followUnfollowUser
    );
    router.post(this.ROOT_PATH + '/get-followers-list', FollowsController.getFollowersList);
    router.post(this.ROOT_PATH + '/get-following-list', FollowsController.getFollowingList);
  }
}

module.exports = FollowsRoute;
