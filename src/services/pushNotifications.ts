import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  try {
    let token: string;

    if (Platform.OS === 'ios') {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
    } else {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
    }

    console.log('Device push token:', token);

    await api.post('/notifications/push-token', { pushToken: token });
    console.log('Push token registered with server');

    return token;
  } catch (error) {
    console.error('Error registering push notifications:', error);
    return null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    await api.delete('/notifications/push-token');
    console.log('Push token unregistered from server');
  } catch (error) {
    console.error('Error unregistering push notifications:', error);
  }
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Silently fail on platforms that don't support badge counts (e.g., some Android devices)
  }
}
