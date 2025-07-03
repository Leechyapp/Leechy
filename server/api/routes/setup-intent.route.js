const SetupIntentController = require('../controllers/setup-intent.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { verifyCaptchaStrict } = require('../middlewares/captcha.middleware');
const { rateLimitPayments, emergencyIPBlock } = require('../middlewares/rate-limit.middleware');
const BaseRoute = require('./base.route');

class SetupIntentRoute extends BaseRoute {
  constructor(router) {
    super('setup-intent');
    router.post(
      this.ROOT_PATH + '/get-client-secret',
      emergencyIPBlock,
      rateLimitPayments(3, 300000), // Max 3 setup intents per 5 minutes
      authMiddleware,
      verifyCaptchaStrict, // Use strict CAPTCHA validation
      SetupIntentController.getSetupIntent
    );
  }
}

module.exports = SetupIntentRoute;
