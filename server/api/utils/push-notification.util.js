class PushNotificationUtil {
  static getFirebasePayload(token, title, body, data) {
    return {
      token,
      notification: {
        title,
        body,
      },
      data,
    };
  }
}
module.exports = PushNotificationUtil;
