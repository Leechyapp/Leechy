const CurrentUserController = require('../controllers/current-user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const BaseRoute = require('./base.route');

class CurrentUserRoute extends BaseRoute {
  constructor(router) {
    super('current-user');
    router.post(this.ROOT_PATH + '/delete', authMiddleware, CurrentUserController.delete);
  }
}

module.exports = CurrentUserRoute;
