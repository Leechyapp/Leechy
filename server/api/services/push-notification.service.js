const FirebaseAdmin = require('../modules/firebase-admin');

class PushNotificationService {
  static async sendPushNotification(messageBody) {
    return FirebaseAdmin.messaging()
      .send(messageBody)
      .then(result => {
        console.log(`Success: Message Push Notification Sent:`, result);
        return result;
      })
      .catch(error => {
        console.log(`Error: Push Notification Not Sent:`, error);
        return error;
      });
  }
}

module.exports = PushNotificationService;
