const PushNotificationController = require('../controllers/push-notificaiton.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const BaseRoute = require('./base.route');

class PushNotificationRoute extends BaseRoute {
  constructor(router) {
    super('push-notification');
    router.post(
      this.ROOT_PATH + '/send-push-notification',
      authMiddleware,
      PushNotificationController.sendPushNotification
    );
  }
}

module.exports = PushNotificationRoute;
