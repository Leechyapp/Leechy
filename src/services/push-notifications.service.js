import { PushNotifications } from '@capacitor/push-notifications';

export default class PushNotificationService {
  static registerPushNotifications = (setNotifications, showToast, onUpdateFCMToken) => {
    console.log('registerPushNotifications');

    // Register with Apple / Google to receive push via APNS/FCM
    PushNotifications.register();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', fcmToken => {
      showToast('Push registration success');
      console.log(`fcmToken`, fcmToken);
      onUpdateFCMToken(fcmToken.value);
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', error => {
      alert('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', notification => {
      setNotifications(notifications => [
        ...notifications,
        {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          type: 'foreground',
        },
      ]);
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      setNotifications(notifications => [
        ...notifications,
        {
          id: notification.notification.data.id,
          title: notification.notification.data.title,
          body: notification.notification.data.body,
          type: 'action',
        },
      ]);
    });
  };
}
