const FirebaseAdmin = require('../modules/firebase-admin');

class PushNotificationService {
  static async sendPushNotification(messageBody) {
    FirebaseAdmin.messaging()
      .send(messageBody)
      .then(result => {
        console.log(`Success: Message Push Notification Sent:`, result);
      })
      .catch(error => {
        console.log(`Error: Push Notification Not Sent:`, error);
      });
  }
}

module.exports = PushNotificationService;
