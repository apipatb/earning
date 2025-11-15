import { useState, useEffect } from 'react';
import {
  Globe,
  Download,
  Upload,
  Settings,
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import { localizationAPI } from '../lib/api';
import { notify } from '../store/notification.store';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

interface Translation {
  id: string;
  language: string;
  key: string;
  value: string;
  context?: string;
  namespace: string;
}

interface RegionalSetting {
  languageCode: string;
  country: string;
  dateFormat: string;
  timeFormat: string;
  decimalSeparator: string;
  thousandsSeparator: string;
  currencySymbol: string;
  currencyPosition: string;
  weekStartDay: number;
}

interface LanguageStat {
  language: string;
  translationsUsed: number;
  stringsCached: number;
  accessCount: number;
  lastAccessed: string;
}

export default function Localization() {
  const [activeTab, setActiveTab] = useState<'languages' | 'preferences' | 'translations' | 'stats'>('languages');
  const [loading, setLoading] = useState(false);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [userPreference, setUserPreference] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [regionalSettings, setRegionalSettings] = useState<RegionalSetting[]>([]);
  const [languageStats, setLanguageStats] = useState<LanguageStat[]>([]);
  const [showTranslationForm, setShowTranslationForm] = useState(false);
  const [newTranslation, setNewTranslation] = useState({ key: '', value: '', context: '', namespace: 'common' });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'languages') {
        const data = await localizationAPI.getSupportedLanguages();
        setLanguages(data);
      } else if (activeTab === 'preferences') {
        const pref = await localizationAPI.getUserLanguagePreference();
        setUserPreference(pref);
        setSelectedLanguage(pref?.language || 'en');
      } else if (activeTab === 'translations') {
        const trans = await localizationAPI.getTranslations();
        setTranslations(trans);
      } else if (activeTab === 'stats') {
        const stats = await localizationAPI.getLanguageStats();
        setLanguageStats(stats);
      }
    } catch (error) {
      console.error('Failed to load localization data:', error);
      notify.error('Error', 'Failed to load localization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreference = async () => {
    try {
      await localizationAPI.setUserLanguagePreference({
        language: selectedLanguage,
        dateFormat: userPreference?.dateFormat || 'MM/DD/YYYY',
        timeFormat: userPreference?.timeFormat || '12h',
        timezone: userPreference?.timezone || 'UTC',
        currency: userPreference?.currency || 'USD',
      });
      notify.success('Success', 'Language preferences updated');
    } catch (error) {
      notify.error('Error', 'Failed to update preferences');
    }
  };

  const handleAddTranslation = async () => {
    if (!newTranslation.key || !newTranslation.value) {
      notify.error('Error', 'Key and value are required');
      return;
    }

    try {
      await localizationAPI.addTranslation({
        language: selectedLanguage,
        ...newTranslation,
      });
      notify.success('Success', 'Translation added');
      setNewTranslation({ key: '', value: '', context: '', namespace: 'common' });
      setShowTranslationForm(false);
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to add translation');
    }
  };

  const handleExportTranslations = async () => {
    try {
      const data = await localizationAPI.exportTranslations();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `translations-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify.success('Success', 'Translations exported');
    } catch (error) {
      notify.error('Error', 'Failed to export translations');
    }
  };

  const handleImportTranslations = async (file: File) => {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      await localizationAPI.importTranslations(data);
      notify.success('Success', 'Translations imported');
      loadData();
    } catch (error) {
      notify.error('Error', 'Failed to import translations');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Localization & Multi-language</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage languages, translations, and regional settings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'translations' && (
            <>
              <button
                onClick={handleExportTranslations}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => e.target.files?.[0] && handleImportTranslations(e.target.files[0])}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['languages', 'preferences', 'translations', 'stats'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'languages' && <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Languages</span>}
            {tab === 'preferences' && <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Preferences</span>}
            {tab === 'translations' && <span className="flex items-center gap-2"><Copy className="w-4 h-4" /> Translations</span>}
            {tab === 'stats' && <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Statistics</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500 dark:text-gray-400 animate-pulse">Loading...</div>
        </div>
      ) : (
        <>
          {/* Languages Tab */}
          {activeTab === 'languages' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl">{lang.flag}</span>
                    {lang.rtl && <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">RTL</span>}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{lang.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{lang.nativeName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {lang.code}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && userPreference && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={userPreference?.timezone || 'UTC'}
                    onChange={(e) => setUserPreference({ ...userPreference, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <select
                    value={userPreference?.dateFormat || 'MM/DD/YYYY'}
                    onChange={(e) => setUserPreference({ ...userPreference, dateFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (USA)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Europe)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Format
                  </label>
                  <select
                    value={userPreference?.timeFormat || '12h'}
                    onChange={(e) => setUserPreference({ ...userPreference, timeFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="12h">12 Hour (AM/PM)</option>
                    <option value="24h">24 Hour</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={userPreference?.currency || 'USD'}
                    onChange={(e) => setUserPreference({ ...userPreference, currency: e.target.value })}
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                  />
                </div>
              </div>
              <button
                onClick={handleSavePreference}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          )}

          {/* Translations Tab */}
          {activeTab === 'translations' && (
            <div className="space-y-4">
              {!showTranslationForm ? (
                <button
                  onClick={() => setShowTranslationForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Translation
                </button>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Translation Key"
                      value={newTranslation.key}
                      onChange={(e) => setNewTranslation({ ...newTranslation, key: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder="Namespace"
                      value={newTranslation.namespace}
                      onChange={(e) => setNewTranslation({ ...newTranslation, namespace: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <textarea
                    placeholder="Translation Value"
                    value={newTranslation.value}
                    onChange={(e) => setNewTranslation({ ...newTranslation, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                  />
                  <textarea
                    placeholder="Context (optional)"
                    value={newTranslation.context}
                    onChange={(e) => setNewTranslation({ ...newTranslation, context: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddTranslation}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowTranslationForm(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Translations List */}
              {translations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Key</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Language</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Namespace</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {translations.map((trans) => (
                          <tr key={trans.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 text-sm font-mono text-gray-900 dark:text-white">{trans.key}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate">{trans.value}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{trans.language}</td>
                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{trans.namespace}</td>
                            <td className="px-6 py-4 text-sm flex gap-2">
                              <button
                                onClick={() => copyToClipboard(trans.value, trans.id)}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {copiedId === trans.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {languageStats.map((stat) => (
                <div key={stat.language} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{stat.language.toUpperCase()}</h3>
                    <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Translations Used</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stat.translationsUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Strings Cached</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stat.stringsCached}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Access Count</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{stat.accessCount}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Last accessed: {new Date(stat.lastAccessed).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
