import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentSubscription,
  fetchNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationStatistics,
  isPushNotificationSupported,
  hasNotificationPermission,
  type Notification,
  type NotificationPreferences,
} from '../lib/push-notifications';

interface NotificationStats {
  total: number;
  unread: number;
  todayCount: number;
  subscriptionCount: number;
}

interface UsePushNotificationsReturn {
  // State
  isSupported: boolean;
  hasPermission: boolean;
  isSubscribed: boolean;
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  statistics: NotificationStats | null;
  loading: boolean;
  error: string | null;

  // Actions
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  loadMore: () => Promise<void>;

  // WebSocket connection
  isConnected: boolean;
}

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function usePushNotifications(): UsePushNotificationsReturn {
  // State
  const [isSupported] = useState(isPushNotificationSupported());
  const [hasPermission, setHasPermission] = useState(hasNotificationPermission());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [statistics, setStatistics] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 50;

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      return;
    }

    const socketInstance = io(`${BACKEND_URL}/notifications`, {
      auth: {
        token,
        userId,
        email: localStorage.getItem('userEmail') || '',
      },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to notification WebSocket');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Disconnected from notification WebSocket:', reason);
      setIsConnected(false);
    });

    socketInstance.on('notification_received', (notification: Notification) => {
      console.log('Notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show browser notification if supported and permitted
      if (isPushNotificationSupported() && hasNotificationPermission()) {
        new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/icons/notification.png',
          badge: notification.badge || '/icons/badge.png',
          data: notification.data,
        });
      }
    });

    socketInstance.on('unread_count', (data: { count: number }) => {
      console.log('Unread count update:', data.count);
      setUnreadCount(data.count);
    });

    socketInstance.on('notification_read', (data: { notificationId: string }) => {
      console.log('Notification marked as read:', data.notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === data.notificationId ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    });

    socketInstance.on('all_notifications_read', () => {
      console.log('All notifications marked as read');
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    });

    socketInstance.on('error', (err: { message: string }) => {
      console.error('WebSocket error:', err);
      setError(err.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const subscription = await getCurrentSubscription();
        setIsSubscribed(!!subscription);
        setHasPermission(hasNotificationPermission());
      } catch (err) {
        console.error('Failed to check subscription:', err);
      }
    };

    checkSubscription();
  }, []);

  // Load initial data
  useEffect(() => {
    if (isConnected) {
      refresh();
    }
  }, [isConnected]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await subscribeToPushNotifications();
      setIsSubscribed(true);
      setHasPermission(true);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe to push notifications');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await unsubscribeFromPushNotifications();
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe from push notifications');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh all data
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [notifData, count, prefs, stats] = await Promise.all([
        fetchNotifications({ limit: LIMIT, offset: 0 }),
        getUnreadCount(),
        getNotificationPreferences(),
        getNotificationStatistics(),
      ]);

      setNotifications(notifData.notifications);
      setUnreadCount(count);
      setPreferences(prefs);
      setStatistics(stats);
      setOffset(LIMIT);
      setHasMore(notifData.notifications.length === LIMIT);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more notifications
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const notifData = await fetchNotifications({ limit: LIMIT, offset });
      setNotifications((prev) => [...prev, ...notifData.notifications]);
      setOffset((prev) => prev + LIMIT);
      setHasMore(notifData.notifications.length === LIMIT);
    } catch (err: any) {
      setError(err.message || 'Failed to load more notifications');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, offset]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
        )
      );

      // WebSocket will update unread count
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read');
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to mark all notifications as read');
      throw err;
    }
  }, []);

  // Update preferences
  const updatePrefs = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    setLoading(true);
    setError(null);

    try {
      const updated = await updateNotificationPreferences(prefs);
      setPreferences(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update preferences');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    isSupported,
    hasPermission,
    isSubscribed,
    notifications,
    unreadCount,
    preferences,
    statistics,
    loading,
    error,

    // Actions
    subscribe,
    unsubscribe,
    refresh,
    markAsRead,
    markAllAsRead,
    updatePreferences: updatePrefs,
    loadMore,

    // WebSocket
    isConnected,
  };
}
