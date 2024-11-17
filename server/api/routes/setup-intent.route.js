const SetupIntentController = require('../controllers/setup-intent.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class SetupIntentRoute extends BaseRoute {
  constructor(router) {
    super('setup-intent');
    router.post(
      this.ROOT_PATH + '/get-client-secret',
      authMiddleware,
      SetupIntentController.getSetupIntent
    );
  }
}

module.exports = SetupIntentRoute;
