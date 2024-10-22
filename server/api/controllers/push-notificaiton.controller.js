const PushNotificationCodeEnum = require('../enums/push-notification-code.enum');
const PushNotificationService = require('../services/push-notification.service');

class PushNotificationController {
  static async sendPushNotification(req, res, next) {
    try {
      const { pushNotificationCode } = req.body;

      let messageBody;

      switch (pushNotificationCode) {
        case PushNotificationCodeEnum.Message:
          messageBody = PushNotificationUtil.getFirebaseTokenMessagePayload(
            fcmToken,
            `John D. sent you a message`,
            `message body`,
            {
              transactionId: '',
            }
          );
          break;
        case PushNotificationCodeEnum.BookingRequested:
          messageBody = PushNotificationUtil.getFirebaseTokenMessagePayload(
            fcmToken,
            `John D. sent you a booking request`,
            `message body`,
            {
              transactionId: '',
            }
          );
          break;
      }

      if (messageBody) {
        const pushNotification = await PushNotificationService.sendPushNotification(
          newMessageParams
        );
        res.send(pushNotification);
      } else {
        res.send('messageBody cannot be undefined.');
      }
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { fcmToken } = req.body;

      const insertUserWithFcmToken = async () => {
        await FcmTokenService.insertUserFcmToken(fcmToken, req.efUserId);
      };

      const tokenCount = await FcmTokenService.getFcmTokenCount(fcmToken);
      if (tokenCount === 0) {
        await insertUserWithFcmToken();
      } else {
        const userFcmTokenMatch = await FcmTokenService.getUserFcmTokenMatch(
          fcmToken,
          req.efUserId
        );
        if (userFcmTokenMatch) {
          await FcmTokenService.updateLastActiveUserFcmToken(fcmToken, req.efUserId);
        } else {
          await FcmTokenService.deleteUserWithFcmToken(fcmToken);
          await insertUserWithFcmToken();
        }
      }
      res.send('OK');
    } catch (e) {
      next(e);
    }
  }
}
module.exports = PushNotificationController;
