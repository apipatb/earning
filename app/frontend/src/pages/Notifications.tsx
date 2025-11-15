import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  conditionType: string;
  threshold: number;
  channels: string[];
  isActive: boolean;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  channels: string[];
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface NotificationPreference {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  notifyOnEarnings: boolean;
  notifyOnGoals: boolean;
  notifyOnMilestones: boolean;
}

const CONDITION_TYPES = [
  { value: 'daily_earnings', label: 'Daily Earnings Threshold' },
  { value: 'milestone', label: 'Earning Milestone' },
  { value: 'threshold', label: 'Custom Threshold' },
  { value: 'inactivity', label: 'Inactivity Alert' },
];

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'push', label: 'Push Notification' },
  { value: 'sms', label: 'SMS' },
  { value: 'in_app', label: 'In-App' },
];

export default function Notifications() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state for new rule
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    conditionType: 'daily_earnings',
    threshold: 0,
    channels: ['in_app'],
    isActive: true,
  });

  // Preferences form state
  const [preferencesForm, setPreferencesForm] = useState<NotificationPreference | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'notifications') {
        const notifRes = await axios.get('/api/v1/notifications?limit=50');
        setNotifications(notifRes.data.notifications);

        const statsRes = await axios.get('/api/v1/notifications/stats');
        setStats(statsRes.data);
      } else if (activeTab === 'rules') {
        const rulesRes = await axios.get('/api/v1/notifications/rules');
        setRules(rulesRes.data);
      } else if (activeTab === 'preferences') {
        const prefRes = await axios.get('/api/v1/notifications/preferences');
        setPreferences(prefRes.data);
        setPreferencesForm(prefRes.data);
      }
    } catch (error) {
      console.error('Error fetching notifications data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    try {
      if (!newRule.name.trim()) {
        alert('Please enter a rule name');
        return;
      }

      await axios.post('/api/v1/notifications/rules', newRule);
      setNewRule({
        name: '',
        description: '',
        conditionType: 'daily_earnings',
        threshold: 0,
        channels: ['in_app'],
        isActive: true,
      });
      fetchData();
    } catch (error) {
      console.error('Error creating rule:', error);
      alert('Failed to create alert rule');
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<NotificationRule>) => {
    try {
      await axios.put(`/api/v1/notifications/rules/${ruleId}`, updates);
      fetchData();
    } catch (error) {
      console.error('Error updating rule:', error);
      alert('Failed to update rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      await axios.delete(`/api/v1/notifications/rules/${ruleId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await axios.put(`/api/v1/notifications/${notificationId}/read`);
      fetchData();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('/api/v1/notifications/read-all');
      fetchData();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await axios.delete(`/api/v1/notifications/${notificationId}`);
      fetchData();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const updatePreferences = async () => {
    try {
      if (!preferencesForm) return;

      await axios.put('/api/v1/notifications/preferences', preferencesForm);
      setPreferences(preferencesForm);
      alert('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert('Failed to update preferences');
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-8">
          {[
            { id: 'notifications', label: 'Notifications' },
            { id: 'rules', label: 'Alert Rules' },
            { id: 'preferences', label: 'Preferences' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Unread</div>
                <div className="text-2xl font-bold text-orange-600">{stats.unread}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">Last 7 Days</div>
                <div className="text-2xl font-bold text-blue-600">{stats.last7Days}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">By Type</div>
                <div className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {stats.byType.map((item: any) => (
                    <div key={item.type} className="text-xs">{item.type}: {item.count}</div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Mark All as Read
            </button>
          )}

          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 border rounded-lg ${
                    notif.isRead
                      ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{notif.title}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            notif.type === 'error'
                              ? 'bg-red-100 text-red-800'
                              : notif.type === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : notif.type === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {notif.type}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">{notif.message}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(notif.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Mark as Read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Alert Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Alert Rule</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Daily Earning Alert"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Condition Type
                  </label>
                  <select
                    value={newRule.conditionType}
                    onChange={(e) => setNewRule({ ...newRule, conditionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {CONDITION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Threshold Amount
                  </label>
                  <input
                    type="number"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notification Channels
                </label>
                <div className="space-y-2">
                  {CHANNELS.map((channel) => (
                    <label key={channel.value} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newRule.channels.includes(channel.value)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...newRule.channels, channel.value]
                            : newRule.channels.filter((c) => c !== channel.value);
                          setNewRule({ ...newRule, channels: updated });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{channel.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={createRule}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Create Alert Rule
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Active Alert Rules</h2>
            {rules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No alert rules created yet</div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{rule.name}</h3>
                      {rule.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                      )}
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={(e) =>
                          updateRule(rule.id, { ...rule, isActive: e.target.checked })
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Type:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        {CONDITION_TYPES.find((t) => t.value === rule.conditionType)?.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Threshold:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        ${rule.threshold.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {rule.channels.map((channel) => (
                      <span
                        key={channel}
                        className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded"
                      >
                        {CHANNELS.find((c) => c.value === channel)?.label}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete Rule
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && preferencesForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 max-w-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notification Preferences</h2>

          <div className="space-y-6">
            {/* Notification Channels */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Enabled Channels</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesForm.emailNotifications}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, emailNotifications: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Email Notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesForm.pushNotifications}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, pushNotifications: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Push Notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesForm.smsNotifications}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, smsNotifications: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">SMS Notifications</span>
                </label>
              </div>
            </div>

            {/* Quiet Hours */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quiet Hours</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Notifications will not be sent during these hours
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferencesForm.quietHoursStart}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, quietHoursStart: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferencesForm.quietHoursEnd}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, quietHoursEnd: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Notification Types */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notify On Events</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesForm.notifyOnEarnings}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, notifyOnEarnings: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Earnings Activity</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesForm.notifyOnGoals}
                    onChange={(e) =>
                      setPreferencesForm({ ...preferencesForm, notifyOnGoals: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Goal Updates</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferencesForm.notifyOnMilestones}
                    onChange={(e) =>
                      setPreferencesForm({
                        ...preferencesForm,
                        notifyOnMilestones: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Milestone Achievements</span>
                </label>
              </div>
            </div>

            <button
              onClick={updatePreferences}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
