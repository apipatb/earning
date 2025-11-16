import { api } from './api';

export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  sentAt: string;
  readAt?: string;
}

export interface NotificationPreferences {
  emailNotifs: boolean;
  pushNotifs: boolean;
  smsNotifs: boolean;
  preferences?: {
    newTickets?: boolean;
    newMessages?: boolean;
    slaBreaches?: boolean;
    assignedTasks?: boolean;
    ticketUpdates?: boolean;
    systemAlerts?: boolean;
  };
}

/**
 * Convert base64 string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if permission is granted
 */
export function hasNotificationPermission(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Get VAPID public key from server
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const response = await api.get('/notifications/vapid-key');
    return response.data.data.publicKey;
  } catch (error) {
    console.error('Failed to get VAPID public key:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription> {
  try {
    // Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    // Register service worker
    const registration = await registerServiceWorker();

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });

    // Convert subscription to plain object
    const subscriptionData: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))),
        p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
      },
    };

    // Send subscription to server
    await api.post('/notifications/subscribe', { subscription: subscriptionData });

    console.log('Successfully subscribed to push notifications');
    return subscriptionData;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await api.delete('/notifications/unsubscribe', {
        data: { endpoint: subscription.endpoint },
      });
      console.log('Successfully unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!)))),
        p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!)))),
      },
    };
  } catch (error) {
    console.error('Failed to get current subscription:', error);
    return null;
  }
}

/**
 * Fetch notifications from server
 */
export async function fetchNotifications(options: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
} = {}): Promise<{
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}> {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.unreadOnly) params.append('unreadOnly', 'true');

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const response = await api.get('/notifications/unread-count');
    return response.data.data.count;
  } catch (error) {
    console.error('Failed to get unread count:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await api.put(`/notifications/${notificationId}/read`);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    await api.put('/notifications/read-all');
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const response = await api.get('/notifications/preferences');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get notification preferences:', error);
    throw error;
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  try {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data.data;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
}

/**
 * Get notification statistics
 */
export async function getNotificationStatistics(): Promise<{
  total: number;
  unread: number;
  todayCount: number;
  subscriptionCount: number;
}> {
  try {
    const response = await api.get('/notifications/statistics');
    return response.data.data;
  } catch (error) {
    console.error('Failed to get notification statistics:', error);
    throw error;
  }
}

/**
 * Show browser notification
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (!isPushNotificationSupported()) {
    console.warn('Push notifications are not supported');
    return;
  }

  if (!hasNotificationPermission()) {
    console.warn('Notification permission not granted');
    return;
  }

  new Notification(title, options);
}

/**
 * Send test notification
 */
export async function sendTestNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    await api.post('/notifications/send', {
      title,
      body,
      icon: '/icons/notification.png',
      badge: '/icons/badge.png',
      data,
    });
  } catch (error) {
    console.error('Failed to send test notification:', error);
    throw error;
  }
}
