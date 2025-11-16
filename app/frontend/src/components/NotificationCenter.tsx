import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Settings, RefreshCw, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  onSettingsClick?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onSettingsClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    isSupported,
    hasPermission,
    isSubscribed,
    subscribe,
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,
  } = usePushNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notificationId: string, url?: string) => {
    try {
      await markAsRead(notificationId);
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  };

  const handleSubscribe = async () => {
    try {
      await subscribe();
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {isConnected && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500">{unreadCount} unread</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {onSettingsClick && (
                <button
                  onClick={onSettingsClick}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Push notification not supported */}
            {!isSupported && (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-500">
                  Push notifications are not supported in your browser.
                </p>
              </div>
            )}

            {/* Not subscribed */}
            {isSupported && !isSubscribed && (
              <div className="px-4 py-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-2">
                  Enable Push Notifications
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Get notified about new tickets, messages, and important updates.
                </p>
                <button
                  onClick={handleSubscribe}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Subscribing...' : 'Enable Notifications'}
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border-b border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Notifications list */}
            {isSubscribed && notifications.length === 0 && !loading && (
              <div className="px-4 py-8 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            )}

            {isSubscribed && notifications.length > 0 && (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() =>
                      handleNotificationClick(
                        notification.id,
                        notification.data?.url
                      )
                    }
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.readAt ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.icon && (
                        <img
                          src={notification.icon}
                          alt=""
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          {!notification.readAt && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 flex-shrink-0"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notification.body}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.sentAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load more button */}
            {isSubscribed && notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200">
                <button
                  onClick={loadMore}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
