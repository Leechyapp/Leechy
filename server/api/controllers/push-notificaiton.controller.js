const PushNotificationCodeEnum = require('../enums/push-notification-code.enum');
const FcmTokenService = require('../services/fcm-token.service');
const PushNotificationService = require('../services/push-notification.service');
const SharetribeService = require('../services/sharetribe.service');
const UserSyncService = require('../services/user-sync.service');
const UserService = require('../services/user.service');
const PushNotificationUtil = require('../utils/push-notification.util');
const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;

class PushNotificationController {
  static async sendPushNotification(req, res, next) {
    try {
      const { currentUser } = req;
      const { pushNotificationCode, transactionId, params } = req.body;

      const sharetribeTransactionRes = await SharetribeService.transactionsShow(req, res, {
        id: new UUID(transactionId),
        include: ['customer', 'provider'],
      });
      const transaction = sharetribeTransactionRes.data.data;
      const { provider, customer } = transaction.relationships;

      const providerUUID = provider.data.id.uuid;
      const customerUUID = customer.data.id.uuid;

      let sendToUserId;
      const customerId = await UserService.searchIdWithUUID(customerUUID);
      const providerId = await UserService.searchIdWithUUID(providerUUID);
      if (req.userUUID === providerUUID) {
        sendToUserId = customerId;
      } else if (req.userUUID === customerUUID) {
        sendToUserId = providerId;
      } else {
        return res.status(401).send('Could not set sendToUserId.');
      }

      const fcmToken = await FcmTokenService.getUserFcmToken(sendToUserId);
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
        case PushNotificationCodeEnum.BookingPayoutDetails:
          // const { displayName: customerDisplayName } = customer.data.attributes.profile;
          const providerFcmToken = await FcmTokenService.getUserFcmToken(providerId);
          if (!providerFcmToken) {
            return res.status(400).send('No FCM token found for provider.');
          }

          messageBody = PushNotificationUtil.getFirebasePayload(
            providerFcmToken,
            `Your payout is on the way!`,
            `Your payout should reach your bank account within 3 to 14 days.`,
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
