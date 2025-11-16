import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import ApiService from './api.service';
import { StorageService } from './storage.service';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'earntrack-mobile',
      });
      const token = tokenData.data;

      // Store token locally
      await StorageService.setPushToken(token);

      // Register device with backend
      const deviceId = await this.getDeviceId();
      const deviceName = await this.getDeviceName();
      await ApiService.registerDevice(
        deviceId,
        deviceName,
        token,
        Platform.OS as 'ios' | 'android'
      );

      return token;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  static async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    delaySeconds: number = 0
  ): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: delaySeconds > 0 ? { seconds: delaySeconds } : null,
    });
  }

  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  private static async getDeviceId(): Promise<string> {
    return `${Platform.OS}-${Date.now()}`;
  }

  private static async getDeviceName(): Promise<string> {
    return `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} Device`;
  }
}
