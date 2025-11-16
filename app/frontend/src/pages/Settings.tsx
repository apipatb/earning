import { useState, useEffect } from 'react';
import { User, Lock, Trash2, Save, Bell, Settings2, Eye, Database, Palette, Download, Upload, Calendar, DollarSign, Globe, Monitor, Zap, RefreshCw, ChevronDown, ChevronUp, LucideIcon } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { SUPPORTED_CURRENCIES } from '../lib/currency';
import { notify, requestNotificationPermission } from '../store/notification.store';
import { getErrorMessage, isApiError } from '../lib/error';
import { getStorageJSON } from '../lib/storage';
import { FormValidation } from '../lib/validation';
import ThemeCustomizer from '../components/ThemeCustomizer';
import NotificationPreferences from '../components/NotificationPreferences';

// User Profile Types
interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileFormData {
  name: string;
  timezone: string;
  currency: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// App Preferences Types
type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
type TimeFormat = '12h' | '24h';
type WeekStartDay = 'sunday' | 'monday';
type ChartType = 'bar' | 'line' | 'area';
type NumberSeparator = ',' | '.' | ' ';
type DecimalSeparator = ',' | '.';

interface AppPreferences {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStartDay: WeekStartDay;
  fiscalYearStart: number; // 1-12
  compactView: boolean;
  animationsEnabled: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  chartType: ChartType;
  showDecimals: boolean;
  thousandSeparator: NumberSeparator;
  decimalSeparator: DecimalSeparator;
}

// Settings Category Types
interface SettingsSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  iconColor: string;
  children: React.ReactNode;
  borderColor?: string;
}

interface ExpandedSections {
  profile: boolean;
  preferences: boolean;
  display: boolean;
  themes: boolean;
  dataPrivacy: boolean;
  backup: boolean;
  notifications: boolean;
  advanced: boolean;
  danger: boolean;
}

// Month Selection Type
interface MonthOption {
  value: number;
  label: string;
}

// Backup/Export Data Types
interface BackupEarning {
  id: string;
  amount: number;
  date: string;
  platformId?: string;
  description?: string;
  [key: string]: unknown;
}

interface BackupPlatform {
  id: string;
  name: string;
  color?: string;
  [key: string]: unknown;
}

interface BackupGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  [key: string]: unknown;
}

interface BackupClient {
  id: string;
  name: string;
  email?: string;
  [key: string]: unknown;
}

interface BackupTimeEntry {
  id: string;
  duration: number;
  date: string;
  [key: string]: unknown;
}

interface BackupBudget {
  id: string;
  name: string;
  amount: number;
  [key: string]: unknown;
}

interface ExportData {
  earnings: BackupEarning[];
  platforms: BackupPlatform[];
  goals: BackupGoal[];
  clients: BackupClient[];
  timeEntries: BackupTimeEntry[];
  budgets: BackupBudget[];
  preferences: AppPreferences;
  exportedAt: string;
  version: string;
}

interface ImportData {
  earnings?: BackupEarning[];
  platforms?: BackupPlatform[];
  goals?: BackupGoal[];
  clients?: BackupClient[];
  timeEntries?: BackupTimeEntry[];
  budgets?: BackupBudget[];
  preferences?: AppPreferences;
  exportedAt?: string;
  version?: string;
}

export default function Settings() {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const { user, logout } = useAuthStore();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    profile: true,
    preferences: false,
    display: false,
    themes: false,
    dataPrivacy: false,
    backup: false,
    notifications: false,
    advanced: false,
    danger: false,
  });

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState<AppPreferences>({
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    weekStartDay: 'monday',
    fiscalYearStart: 1,
    compactView: false,
    animationsEnabled: true,
    autoSave: true,
    autoSaveInterval: 5,
    chartType: 'bar',
    showDecimals: true,
    thousandSeparator: ',',
    decimalSeparator: '.',
  });

  useEffect(() => {
    loadProfile();
    loadPreferences();
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
      notify.error('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = () => {
    const stored = localStorage.getItem('app_preferences');
    if (stored) {
      setPreferences({ ...preferences, ...JSON.parse(stored) });
    }
  };

  const savePreferences = () => {
    localStorage.setItem('app_preferences', JSON.stringify(preferences));
    notify.success('Preferences Saved', 'Your preferences have been updated!');
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/user/profile', profileData);
      notify.success('Profile Updated', 'Your profile has been updated successfully!');
    } catch (error) {
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
    } catch (error) {
      const apiError = getErrorMessage(error);
      if (isApiError(error, 'Current password is incorrect')) {
        notify.error('Incorrect Password', 'Current password is incorrect');
      } else {
        notify.error('Error', apiError.message);
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

  const handleExportData = () => {
    const data: ExportData = {
      earnings: getStorageJSON<BackupEarning[]>('earnings', []),
      platforms: getStorageJSON<BackupPlatform[]>('platforms', []),
      goals: getStorageJSON<BackupGoal[]>('savings_goals', []),
      clients: getStorageJSON<BackupClient[]>('clients', []),
      timeEntries: getStorageJSON<BackupTimeEntry[]>('time_entries', []),
      budgets: getStorageJSON<BackupBudget[]>('budgets', []),
      preferences: preferences,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earntrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notify.success('Export Complete', 'Your data has been downloaded successfully!');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          notify.error('Import Failed', 'Could not read file contents.');
          return;
        }

        const data: ImportData = JSON.parse(result);

        if (!confirm('This will replace all your current data. Are you sure you want to continue?')) {
          return;
        }

        // Restore all data
        if (data.earnings) localStorage.setItem('earnings', JSON.stringify(data.earnings));
        if (data.platforms) localStorage.setItem('platforms', JSON.stringify(data.platforms));
        if (data.goals) localStorage.setItem('savings_goals', JSON.stringify(data.goals));
        if (data.clients) localStorage.setItem('clients', JSON.stringify(data.clients));
        if (data.timeEntries) localStorage.setItem('time_entries', JSON.stringify(data.timeEntries));
        if (data.budgets) localStorage.setItem('budgets', JSON.stringify(data.budgets));
        if (data.preferences) {
          localStorage.setItem('app_preferences', JSON.stringify(data.preferences));
          setPreferences(data.preferences);
        }

        notify.success('Import Complete', 'Your data has been restored successfully! Refreshing page...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        notify.error('Import Failed', 'The file format is invalid. Please check your backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    if (!confirm('This will clear all cached data and reload the page. Continue?')) {
      return;
    }

    // Clear all caches except auth token
    const token = localStorage.getItem('auth_token');
    const preferences = localStorage.getItem('app_preferences');

    localStorage.clear();

    if (token) localStorage.setItem('auth_token', token);
    if (preferences) localStorage.setItem('app_preferences', preferences);

    notify.success('Cache Cleared', 'Cache cleared successfully. Refreshing...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const timezones: string[] = [
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

  const months: MonthOption[] = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  const SettingsSection = ({
    id,
    title,
    icon: Icon,
    iconColor,
    children,
    borderColor
  }: SettingsSectionProps) => (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${borderColor || ''}`}>
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${iconColor}`} />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        {expandedSections[id] ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expandedSections[id] && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <SettingsSection id="profile" title="Profile Settings" icon={User} iconColor="text-blue-600">
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
      </SettingsSection>

      {/* App Preferences */}
      <SettingsSection id="preferences" title="App Preferences" icon={Settings2} iconColor="text-purple-600">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date Format
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => setPreferences({ ...preferences, dateFormat: FormValidation.parseDateFormat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2023)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2023)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2023-12-31)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Time Format
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => setPreferences({ ...preferences, timeFormat: FormValidation.parseTimeFormat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="12h">12-hour (3:00 PM)</option>
                <option value="24h">24-hour (15:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Week Start Day
              </label>
              <select
                value={preferences.weekStartDay}
                onChange={(e) => setPreferences({ ...preferences, weekStartDay: FormValidation.parseWeekStartDay(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="monday">Monday</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fiscal Year Start
              </label>
              <select
                value={preferences.fiscalYearStart}
                onChange={(e) => setPreferences({ ...preferences, fiscalYearStart: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Thousand Separator
              </label>
              <select
                value={preferences.thousandSeparator}
                onChange={(e) => setPreferences({ ...preferences, thousandSeparator: FormValidation.parseNumberSeparator(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value=",">Comma (1,000,000)</option>
                <option value=".">Period (1.000.000)</option>
                <option value=" ">Space (1 000 000)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Decimal Separator
              </label>
              <select
                value={preferences.decimalSeparator}
                onChange={(e) => setPreferences({ ...preferences, decimalSeparator: FormValidation.parseDecimalSeparator(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value=".">Period (1.50)</option>
                <option value=",">Comma (1,50)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Show Decimals</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Display decimal places in amounts</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, showDecimals: !preferences.showDecimals })}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.showDecimals ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.showDecimals ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <button
            onClick={savePreferences}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </SettingsSection>

      {/* Display Options */}
      <SettingsSection id="display" title="Display Options" icon={Monitor} iconColor="text-indigo-600">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Compact View</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Use condensed layout for tables and lists</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, compactView: !preferences.compactView })}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.compactView ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.compactView ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Animations</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Enable smooth transitions and animations</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, animationsEnabled: !preferences.animationsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.animationsEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.animationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Chart Type
            </label>
            <select
              value={preferences.chartType}
              onChange={(e) => setPreferences({ ...preferences, chartType: FormValidation.parseChartType(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>

          <button
            onClick={savePreferences}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Display Options
          </button>
        </div>
      </SettingsSection>

      {/* Custom Themes */}
      <SettingsSection id="themes" title="Custom Themes" icon={Palette} iconColor="text-pink-600">
        <ThemeCustomizer />
      </SettingsSection>

      {/* Data & Privacy */}
      <SettingsSection id="dataPrivacy" title="Data & Privacy" icon={Database} iconColor="text-green-600">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Auto-Save</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Automatically save changes as you work</p>
            </div>
            <button
              onClick={() => setPreferences({ ...preferences, autoSave: !preferences.autoSave })}
              className={`w-12 h-6 rounded-full transition-colors ${preferences.autoSave ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${preferences.autoSave ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {preferences.autoSave && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-Save Interval (minutes)
              </label>
              <select
                value={preferences.autoSaveInterval}
                onChange={(e) => setPreferences({ ...preferences, autoSaveInterval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Every minute</option>
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={30}>Every 30 minutes</option>
              </select>
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Data Storage</h4>
            <p className="text-xs text-blue-800 dark:text-blue-300">
              All your data is stored locally in your browser. No data is sent to external servers except for authentication.
            </p>
          </div>

          <button
            onClick={savePreferences}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Data Settings
          </button>
        </div>
      </SettingsSection>

      {/* Backup & Restore */}
      <SettingsSection id="backup" title="Backup & Restore" icon={Database} iconColor="text-cyan-600">
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Export your data to keep a backup, or import a previously exported backup file.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Export All Data</span>
            </button>

            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Import Data</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200 mb-1">Important</h4>
            <ul className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1 list-disc list-inside">
              <li>Exports include all earnings, platforms, goals, clients, and time entries</li>
              <li>Import will replace all current data - export first if needed</li>
              <li>Keep your backup files secure as they contain sensitive data</li>
            </ul>
          </div>
        </div>
      </SettingsSection>

      {/* Notification Settings */}
      <SettingsSection id="notifications" title="Notification Settings" icon={Bell} iconColor="text-blue-600">
        <div className="space-y-4">
          {/* Browser Permission Check */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
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
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                To enable notifications, you'll need to allow them in your browser settings.
              </p>
            </div>
          )}

          {/* Notification Preferences */}
          {notificationPermission === 'granted' && <NotificationPreferences />}
        </div>
      </SettingsSection>

      {/* Advanced Settings */}
      <SettingsSection id="advanced" title="Advanced" icon={Zap} iconColor="text-yellow-600">
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Cache Management</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Clear cached data to free up space or resolve issues. Your account data will not be affected.
            </p>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Clear Cache
            </button>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Application Info</h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>Version: 1.0.0</p>
              <p>Build: {new Date().toISOString().split('T')[0]}</p>
              <p>Browser: {navigator.userAgent.split(' ').slice(-1)[0]}</p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Password Settings */}
      <SettingsSection id="password" title="Change Password" icon={Lock} iconColor="text-yellow-600">
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
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection
        id="danger"
        title="Danger Zone"
        icon={Trash2}
        iconColor="text-red-600"
        borderColor="border-2 border-red-200 dark:border-red-900"
      >
        <div className="space-y-4">
          <div>
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
      </SettingsSection>
    </div>
  );
}
