import { useState, useEffect } from 'react';
import { Bell, TrendingUp, Target, Calendar, DollarSign, Clock, Zap, Save } from 'lucide-react';
import { notify } from '../store/notification.store';

interface NotificationRule {
  id: string;
  category: 'earnings' | 'goals' | 'reminders' | 'insights' | 'milestones';
  event: string;
  enabled: boolean;
  channels: {
    browser: boolean;
    email: boolean;
  };
  conditions?: {
    threshold?: number;
    timeOfDay?: string;
    frequency?: 'immediate' | 'daily' | 'weekly';
  };
}

export default function NotificationPreferences() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    const stored = localStorage.getItem('notification_preferences');
    if (stored) {
      const prefs = JSON.parse(stored);
      setRules(prefs.rules || getDefaultRules());
      setQuietHours(prefs.quietHours || quietHours);
    } else {
      setRules(getDefaultRules());
    }
  };

  const getDefaultRules = (): NotificationRule[] => [
    // Earnings notifications
    {
      id: 'earning-added',
      category: 'earnings',
      event: 'New earning added',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { threshold: 0, frequency: 'immediate' },
    },
    {
      id: 'earning-milestone',
      category: 'earnings',
      event: 'Earning milestone reached (e.g., $1000)',
      enabled: true,
      channels: { browser: true, email: true },
      conditions: { frequency: 'immediate' },
    },
    {
      id: 'daily-earnings-summary',
      category: 'earnings',
      event: 'Daily earnings summary',
      enabled: false,
      channels: { browser: true, email: false },
      conditions: { timeOfDay: '20:00', frequency: 'daily' },
    },

    // Goal notifications
    {
      id: 'goal-progress',
      category: 'goals',
      event: 'Goal progress update (every 25%)',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { frequency: 'immediate' },
    },
    {
      id: 'goal-completed',
      category: 'goals',
      event: 'Goal completed',
      enabled: true,
      channels: { browser: true, email: true },
      conditions: { frequency: 'immediate' },
    },
    {
      id: 'goal-deadline-approaching',
      category: 'goals',
      event: 'Goal deadline approaching (7 days)',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { frequency: 'daily' },
    },

    // Reminder notifications
    {
      id: 'daily-logging-reminder',
      category: 'reminders',
      event: 'Daily logging reminder',
      enabled: false,
      channels: { browser: true, email: false },
      conditions: { timeOfDay: '18:00', frequency: 'daily' },
    },
    {
      id: 'weekly-review',
      category: 'reminders',
      event: 'Weekly performance review',
      enabled: false,
      channels: { browser: true, email: false },
      conditions: { frequency: 'weekly' },
    },
    {
      id: 'inactive-warning',
      category: 'reminders',
      event: 'Inactive for 7 days',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { frequency: 'immediate' },
    },

    // Insights notifications
    {
      id: 'weekly-insights',
      category: 'insights',
      event: 'Weekly insights report',
      enabled: false,
      channels: { browser: true, email: false },
      conditions: { frequency: 'weekly' },
    },
    {
      id: 'performance-alert',
      category: 'insights',
      event: 'Performance change alert (±20%)',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { threshold: 20, frequency: 'immediate' },
    },

    // Milestone notifications
    {
      id: 'achievement-unlocked',
      category: 'milestones',
      event: 'New achievement unlocked',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { frequency: 'immediate' },
    },
    {
      id: 'streak-milestone',
      category: 'milestones',
      event: 'Streak milestone (7, 30, 100 days)',
      enabled: true,
      channels: { browser: true, email: false },
      conditions: { frequency: 'immediate' },
    },
  ];

  const savePreferences = () => {
    const prefs = {
      rules,
      quietHours,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem('notification_preferences', JSON.stringify(prefs));
    notify.success('Saved', 'Notification preferences updated successfully!');
  };

  const toggleRule = (ruleId: string) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleChannel = (ruleId: string, channel: 'browser' | 'email') => {
    setRules(rules.map(r =>
      r.id === ruleId
        ? { ...r, channels: { ...r.channels, [channel]: !r.channels[channel] } }
        : r
    ));
  };

  const updateCondition = (ruleId: string, key: string, value: any) => {
    setRules(rules.map(r =>
      r.id === ruleId
        ? { ...r, conditions: { ...r.conditions, [key]: value } }
        : r
    ));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'earnings':
        return DollarSign;
      case 'goals':
        return Target;
      case 'reminders':
        return Clock;
      case 'insights':
        return Zap;
      case 'milestones':
        return TrendingUp;
      default:
        return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'earnings':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'goals':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case 'reminders':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900';
      case 'insights':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900';
      case 'milestones':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900';
    }
  };

  const categories = ['earnings', 'goals', 'reminders', 'insights', 'milestones'] as const;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Customize when and how you receive notifications
            </p>
          </div>
        </div>
        <button
          onClick={savePreferences}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>

      {/* Quiet Hours */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quiet Hours</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Pause notifications during specific hours
            </p>
          </div>
          <button
            onClick={() => setQuietHours({ ...quietHours, enabled: !quietHours.enabled })}
            className={`w-12 h-6 rounded-full transition-colors ${
              quietHours.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
              quietHours.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {quietHours.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={quietHours.start}
                onChange={(e) => setQuietHours({ ...quietHours, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={quietHours.end}
                onChange={(e) => setQuietHours({ ...quietHours, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notification Rules by Category */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryRules = rules.filter(r => r.category === category);
          if (categoryRules.length === 0) return null;

          const Icon = getCategoryIcon(category);
          const colorClass = getCategoryColor(category);

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                  {category}
                </h3>
              </div>

              <div className="space-y-2">
                {categoryRules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            onClick={() => toggleRule(rule.id)}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              rule.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              rule.enabled ? 'translate-x-4' : 'translate-x-0.5'
                            }`} />
                          </button>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {rule.event}
                          </span>
                        </div>

                        {rule.enabled && (
                          <div className="ml-13 space-y-2">
                            {/* Channels */}
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <input
                                  type="checkbox"
                                  checked={rule.channels.browser}
                                  onChange={() => toggleChannel(rule.id, 'browser')}
                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                />
                                Browser
                              </label>
                              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                <input
                                  type="checkbox"
                                  checked={rule.channels.email}
                                  onChange={() => toggleChannel(rule.id, 'email')}
                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                  disabled
                                  title="Email notifications coming soon"
                                />
                                Email
                              </label>
                            </div>

                            {/* Conditions */}
                            {rule.conditions && (
                              <div className="flex flex-wrap gap-2">
                                {rule.conditions.timeOfDay !== undefined && (
                                  <input
                                    type="time"
                                    value={rule.conditions.timeOfDay}
                                    onChange={(e) => updateCondition(rule.id, 'timeOfDay', e.target.value)}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                  />
                                )}
                                {rule.conditions.threshold !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Threshold:</span>
                                    <input
                                      type="number"
                                      value={rule.conditions.threshold}
                                      onChange={(e) => updateCondition(rule.id, 'threshold', parseFloat(e.target.value))}
                                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                    />
                                  </div>
                                )}
                                {rule.conditions.frequency && (
                                  <select
                                    value={rule.conditions.frequency}
                                    onChange={(e) => updateCondition(rule.id, 'frequency', e.target.value)}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
                                  >
                                    <option value="immediate">Immediate</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
          About Notifications
        </h4>
        <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Browser notifications require permission - enable them in your browser settings</li>
          <li>Email notifications are coming soon</li>
          <li>Quiet hours will pause all notifications during the specified time range</li>
          <li>Changes are saved locally and persist across sessions</li>
        </ul>
      </div>
    </div>
  );
}
