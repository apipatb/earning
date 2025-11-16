import { create } from 'zustand';
import { generateRandomId } from '../lib/random';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = generateRandomId(12);
    const newNotification = { id, ...notification };

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }));

    // Auto remove after duration
    if (notification.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, notification.duration || 5000);
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      });
    }
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));

// Helper functions
export const notify = {
  success: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      duration,
    });
  },

  error: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration,
    });
  },

  warning: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      duration,
    });
  },

  info: (title: string, message: string, duration?: number) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
      duration,
    });
  },
};

// Request browser notification permission
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};
