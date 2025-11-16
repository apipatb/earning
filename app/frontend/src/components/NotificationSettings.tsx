import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, AlertTriangle, CheckCircle, Save, RefreshCw } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import type { NotificationPreferences } from '../lib/push-notifications';

interface NotificationSettingsProps {
  onClose?: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const {
    preferences,
    statistics,
    loading,
    error,
    isSubscribed,
    subscribe,
    unsubscribe,
    updatePreferences,
    refresh,
  } = usePushNotifications();

  const [formData, setFormData] = useState<NotificationPreferences>({
    emailNotifs: true,
    pushNotifs: true,
    smsNotifs: false,
    preferences: {
      newTickets: true,
      newMessages: true,
      slaBreaches: true,
      assignedTasks: true,
      ticketUpdates: true,
      systemAlerts: true,
    },
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData({
        emailNotifs: preferences.emailNotifs,
        pushNotifs: preferences.pushNotifs,
        smsNotifs: preferences.smsNotifs,
        preferences: preferences.preferences || {},
      });
    }
  }, [preferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePreferenceToggle = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences?.[key as keyof typeof prev.preferences],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await updatePreferences(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      await subscribe();
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  };

  const handleRefresh = async () => {
    try {
      await refresh();
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage how you receive notifications
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success */}
      {saveSuccess && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">Settings saved successfully!</p>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Notifications</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.total}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Unread</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{statistics.unread}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.todayCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Devices</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {statistics.subscriptionCount}
            </p>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
        {/* Notification Channels */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Channels
          </h3>
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emailNotifs}
                  onChange={() => handleToggle('emailNotifs')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive browser push notifications
                  </p>
                  {isSubscribed && (
                    <p className="text-xs text-green-600 mt-1">
                      Subscribed on this device
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isSubscribed && (
                  <button
                    onClick={handleSubscribe}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    disabled={loading}
                  >
                    Subscribe
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.pushNotifs}
                    onChange={() => handleToggle('pushNotifs')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive notifications via SMS
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.smsNotifs}
                  onChange={() => handleToggle('smsNotifs')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notification Types
          </h3>
          <div className="space-y-4">
            {/* New Tickets */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">New Tickets</p>
                <p className="text-sm text-gray-600">
                  When a new support ticket is created
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferences?.newTickets ?? true}
                  onChange={() => handlePreferenceToggle('newTickets')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* New Messages */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">New Messages</p>
                <p className="text-sm text-gray-600">
                  When you receive a new message on a ticket
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferences?.newMessages ?? true}
                  onChange={() => handlePreferenceToggle('newMessages')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* SLA Breaches */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">SLA Breaches</p>
                <p className="text-sm text-gray-600">
                  When a ticket breaches its SLA deadline
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferences?.slaBreaches ?? true}
                  onChange={() => handlePreferenceToggle('slaBreaches')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Assigned Tasks */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Assigned Tasks</p>
                <p className="text-sm text-gray-600">
                  When a task or ticket is assigned to you
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferences?.assignedTasks ?? true}
                  onChange={() => handlePreferenceToggle('assignedTasks')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Ticket Updates */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Ticket Updates</p>
                <p className="text-sm text-gray-600">
                  When there are updates on your tickets
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferences?.ticketUpdates ?? true}
                  onChange={() => handlePreferenceToggle('ticketUpdates')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* System Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">System Alerts</p>
                <p className="text-sm text-gray-600">
                  Important system notifications and alerts
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.preferences?.systemAlerts ?? true}
                  onChange={() => handlePreferenceToggle('systemAlerts')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Device Management */}
        {isSubscribed && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Device Management
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">This Device</p>
                <p className="text-sm text-gray-600">
                  Unsubscribe from push notifications on this device
                </p>
              </div>
              <button
                onClick={handleUnsubscribe}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                Unsubscribe
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-6">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          disabled={saving}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};
