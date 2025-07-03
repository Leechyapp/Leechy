const SecurityDepositController = require('../controllers/security-deposit.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authTrxMiddleware } = require('../middlewares/authTrx.middleware');
const { verifyCaptcha, verifyCaptchaStrict } = require('../middlewares/captcha.middleware');
const { rateLimitPayments, emergencyIPBlock } = require('../middlewares/rate-limit.middleware');
const BaseRoute = require('./base.route');

class SecurityDepositRoute extends BaseRoute {
  constructor(router) {
    super('security-deposit');
    router.post(
      this.ROOT_PATH + '/charge',
      emergencyIPBlock,
      rateLimitPayments(2, 60000), // Max 2 security deposit charges per minute
      authMiddleware,
      verifyCaptcha,
      SecurityDepositController.chargeSecurityDeposit
    );
    router.post(
      this.ROOT_PATH + '/save',
      authMiddleware,
      verifyCaptcha,
      SecurityDepositController.saveSecurityDepositData
    );
    router.post(
      this.ROOT_PATH + '/refund',
      authTrxMiddleware,
      SecurityDepositController.refundSecurityDeposit
    );
  }
}

module.exports = SecurityDepositRoute;
