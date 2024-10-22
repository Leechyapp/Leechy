class PushNotificationUtil {
  static getFirebaseTokenMessagePayload(token, title, body, data) {
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
