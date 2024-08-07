const SecurityDepositController = require('../controllers/security-deposit.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { authTrxMiddleware } = require('../middlewares/authTrx.middleware');
const BaseRoute = require('./base.route');

class SecurityDepositRoute extends BaseRoute {
  constructor(router) {
    super('security-deposit');
    router.post(
      this.ROOT_PATH + '/charge',
      authMiddleware,
      SecurityDepositController.chargeSecurityDeposit
    );
    router.post(
      this.ROOT_PATH + '/save',
      authMiddleware,
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
