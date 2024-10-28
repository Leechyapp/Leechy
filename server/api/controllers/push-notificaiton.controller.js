const PushNotificationCodeEnum = require('../enums/push-notification-code.enum');
const FcmTokenService = require('../services/fcm-token.service');
const PushNotificationService = require('../services/push-notification.service');
const UserSyncService = require('../services/user-sync.service');
const UserService = require('../services/user.service');
const PushNotificationUtil = require('../utils/push-notification.util');

class PushNotificationController {
  static async sendPushNotification(req, res, next) {
    try {
      const { userId, currentUser } = req;
      const { pushNotificationCode, transactionId, params } = req.body;

      const fcmToken = await FcmTokenService.getUserFcmToken(userId);
      if (!fcmToken) {
        return res.status(400).send('No FCM token found.');
      }

      const { displayName } = currentUser.attributes.profile;

      let messageBody;

      switch (pushNotificationCode) {
        case PushNotificationCodeEnum.Message:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `${displayName} sent you a message`,
            params.message,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.BookingAccepted:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `${displayName} accepted your booking request`,
            ``,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.BookingDeclined:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `${displayName} declined your booking request`,
            ``,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.BookingRequested:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `${displayName} sent you a booking request`,
            ``,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.ReviewByCustomer:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `${displayName} left a review on your listing`,
            ``,
            {
              transactionId,
            }
          );
          break;
        case PushNotificationCodeEnum.ReviewByProvider:
          messageBody = PushNotificationUtil.getFirebasePayload(
            fcmToken,
            `${displayName} left a review`,
            ``,
            {
              transactionId,
            }
          );
          break;
      }

      if (messageBody) {
        const pushNotification = await PushNotificationService.sendPushNotification(messageBody);
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
      const { fcmToken, userUUID } = req.body;

      const userId = await UserService.searchIdWithUUID(userUUID);
      if (userId) {
        req.userId = userId;
      } else {
        const newUser = await UserSyncService.insert({}, userUUID);
        req.userId = newUser[0];
      }

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
