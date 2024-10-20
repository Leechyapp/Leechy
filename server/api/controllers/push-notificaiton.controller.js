class PushNotificationController {
  static async sendPushNotification(req, res, next) {
    try {
      // res.send(data);
    } catch (error) {
      next(error);
    }
  }
}
module.exports = PushNotificationController;
