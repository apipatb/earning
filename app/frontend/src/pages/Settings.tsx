import { useState, useEffect } from 'react';
import { User, Lock, Trash2, Save, Bell } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { SUPPORTED_CURRENCIES } from '../lib/currency';
import { notify, requestNotificationPermission } from '../store/notification.store';

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, logout } = useAuthStore();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const [profileData, setProfileData] = useState({
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/profile');
      const data: ProfileData = response.data;
      setProfileData({
        name: data.name || '',
        timezone: data.timezone,
        currency: data.currency,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      notify.error('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/user/profile', profileData);
      notify.success('Profile Updated', 'Your profile has been updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      notify.error('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify.warning('Password Mismatch', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      notify.warning('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      await api.post('/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      notify.success('Password Changed', 'Your password has been changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      if (error.response?.data?.error === 'Current password is incorrect') {
        notify.error('Incorrect Password', 'Current password is incorrect');
      } else {
        notify.error('Error', 'Failed to change password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.')) {
      return;
    }

    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      notify.info('Cancelled', 'Account deletion cancelled');
      return;
    }

    try {
      setSaving(true);
      await api.delete('/user/account');
      notify.success('Account Deleted', 'Your account has been deleted.');
      logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to delete account:', error);
      notify.error('Error', 'Failed to delete account. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission('granted');
      notify.success('Notifications Enabled', 'You will now receive browser notifications!');
    } else {
      notify.warning('Notifications Denied', 'Browser notifications have been blocked. You can still use the app normally.');
    }
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Bangkok',
    'Australia/Sydney',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timezone
              </label>
              <select
                value={profileData.timezone}
                onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Currency
              </label>
              <select
                value={profileData.currency}
                onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Enable browser notifications to get real-time updates when you add earnings, achieve goals, and more.
            </p>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Browser Notifications</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {notificationPermission === 'granted' && 'Notifications are enabled'}
                  {notificationPermission === 'denied' && 'Notifications are blocked by your browser'}
                  {notificationPermission === 'default' && 'Click to enable notifications'}
                </p>
              </div>

              {notificationPermission === 'granted' && (
                <span className="text-green-600 dark:text-green-400 text-sm font-medium">Enabled</span>
              )}

              {notificationPermission === 'denied' && (
                <span className="text-red-600 dark:text-red-400 text-sm font-medium">Blocked</span>
              )}

              {notificationPermission === 'default' && (
                <button
                  onClick={handleEnableNotifications}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Enable
                </button>
              )}
            </div>

            {notificationPermission === 'denied' && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  To enable notifications, you'll need to allow them in your browser settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-2 border-red-200 dark:border-red-900">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Danger Zone</h2>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>All your earnings data will be permanently deleted</li>
            <li>All your platforms will be removed</li>
            <li>All your goals will be deleted</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>

        <button
          onClick={handleDeleteAccount}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          {saving ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}
