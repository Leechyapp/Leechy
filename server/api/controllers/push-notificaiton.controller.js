const PushNotificationCodeEnum = require('../enums/push-notification-code.enum');
const FcmTokenService = require('../services/fcm-token.service');
const PushNotificationService = require('../services/push-notification.service');
const PushNotificationUtil = require('../utils/push-notification.util');

class PushNotificationController {
  static async sendPushNotification(req, res, next) {
    try {
      const { userId } = req;
      const { pushNotificationCode, transactionId, params } = req.body;

      const fcmToken = await FcmTokenService.getUserFcmToken(userId);
      if (!fcmToken) {
        return res.status(400).send('No FCM token found.');
      }

      let messageBody;

      switch (pushNotificationCode) {
        case PushNotificationCodeEnum.Message:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `John D. sent you a message`,
            params.message,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.BookingAccepted:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `John D. accepted your booking request`,
            ``,
            {
              transactionId,
            }
          );
        case PushNotificationCodeEnum.BookingDeclined:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `John D. declined your booking request`,
            ``,
            {
              transactionId,
            }
          );
        case PushNotificationCodeEnum.BookingRequested:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `John D. sent you a booking request`,
            ``,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.ReviewByCustomer:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `John D. left a review on your listing`,
            ``,
            {
              transactionId,
            }
          );
        case PushNotificationCodeEnum.ReviewByProvider:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `John D. left a review`,
            ``,
            {
              transactionId,
            }
          );
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

  static async updateFCMToken(req, res, next) {
    try {
      const { fcmToken } = req.body;

      const insertUserWithFcmToken = async () => {
        await FcmTokenService.insertUserFcmToken(fcmToken, req.userId);
      };

      const tokenCount = await FcmTokenService.getFcmTokenCount(fcmToken);
      if (tokenCount === 0) {
        await insertUserWithFcmToken();
      } else {
        const userFcmTokenMatch = await FcmTokenService.getUserFcmTokenMatch(fcmToken, req.userId);
        if (userFcmTokenMatch) {
          await FcmTokenService.updateLastActiveUserFcmToken(fcmToken, req.userId);
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
