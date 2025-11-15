import { useState } from 'react';
import { Palette, Plus, Trash2, Save, Download, Upload, Check, X, Eye, RotateCcw } from 'lucide-react';
import { useCustomThemeStore, type CustomTheme, type ThemeColors } from '../store/customTheme.store';
import { notify } from '../store/notification.store';
import { useThemeStore } from '../store/theme.store';

export default function ThemeCustomizer() {
  const {
    themes,
    activeThemeId,
    isCustomThemeEnabled,
    setActiveTheme,
    addTheme,
    updateTheme,
    deleteTheme,
    toggleCustomTheme,
    resetToDefault
  } = useCustomThemeStore();

  const { isDarkMode } = useThemeStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState('');

  const activeTheme = themes.find(t => t.id === activeThemeId);
  const [customColors, setCustomColors] = useState<ThemeColors>(
    activeTheme?.colors || themes[0].colors
  );

  const handleCreateTheme = () => {
    if (!newThemeName.trim()) {
      notify.warning('Name Required', 'Please enter a theme name');
      return;
    }

    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: newThemeName,
      colors: customColors,
      isBuiltIn: false,
    };

    addTheme(newTheme);
    setActiveTheme(newTheme.id);
    setIsCreating(false);
    setNewThemeName('');
    notify.success('Theme Created', `"${newThemeName}" has been created!`);
  };

  const handleUpdateTheme = (themeId: string) => {
    updateTheme(themeId, customColors);
    setEditingThemeId(null);
    notify.success('Theme Updated', 'Your theme has been updated!');
  };

  const handleDeleteTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (!theme) return;

    if (theme.isBuiltIn) {
      notify.warning('Cannot Delete', 'Built-in themes cannot be deleted');
      return;
    }

    if (confirm(`Are you sure you want to delete "${theme.name}"?`)) {
      deleteTheme(themeId);
      notify.success('Theme Deleted', `"${theme.name}" has been deleted`);
    }
  };

  const handleExportTheme = (theme: CustomTheme) => {
    const data = {
      name: theme.name,
      colors: theme.colors,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notify.success('Theme Exported', `"${theme.name}" has been exported!`);
  };

  const handleImportTheme = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);

        const newTheme: CustomTheme = {
          id: `custom-${Date.now()}`,
          name: data.name || 'Imported Theme',
          colors: data.colors,
          isBuiltIn: false,
        };

        addTheme(newTheme);
        setActiveTheme(newTheme.id);
        notify.success('Theme Imported', `"${newTheme.name}" has been imported!`);
      } catch (error) {
        console.error('Failed to import theme:', error);
        notify.error('Import Failed', 'The file format is invalid');
      }
    };
    reader.readAsText(file);

    // Reset input
    e.target.value = '';
  };

  const handleToggleCustomTheme = () => {
    const newState = !isCustomThemeEnabled;
    toggleCustomTheme(newState);
    if (newState) {
      notify.success('Custom Themes Enabled', 'Your custom theme has been applied!');
    } else {
      notify.info('Custom Themes Disabled', 'Reverted to default theme');
    }
  };

  const handleReset = () => {
    if (confirm('This will reset all themes to default. Continue?')) {
      resetToDefault();
      notify.success('Reset Complete', 'Themes have been reset to default');
    }
  };

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) => (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-16 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
            placeholder="#000000"
          />
        </div>
      </div>
      <div
        className="w-10 h-10 rounded-lg border-2 border-gray-300 dark:border-gray-600 mt-6"
        style={{ backgroundColor: value }}
      />
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 shadow-soft rounded-lg p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Theme Customizer</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              Personalize your experience with custom colors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCustomTheme}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCustomThemeEnabled
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {isCustomThemeEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Theme Presets */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Theme Presets</h3>
          <div className="flex gap-2">
            <label className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors cursor-pointer text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportTheme}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                setIsCreating(true);
                setCustomColors(activeTheme?.colors || themes[0].colors);
              }}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(theme.id)}
              className={`relative p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                activeThemeId === theme.id
                  ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {theme.name}
                </span>
                {activeThemeId === theme.id && (
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
              </div>

              {/* Color Preview */}
              <div className="flex gap-1 mb-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.primary }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.secondary }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.accent }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.success }} />
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingThemeId(theme.id);
                    setCustomColors(theme.colors);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  title="Edit"
                >
                  <Eye className="w-3 h-3 mx-auto" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportTheme(theme);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors"
                  title="Export"
                >
                  <Download className="w-3 h-3 mx-auto" />
                </button>
                {!theme.isBuiltIn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTheme(theme.id);
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3 mx-auto" />
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Theme */}
      {(isCreating || editingThemeId) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isCreating ? 'Create New Theme' : 'Edit Theme'}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingThemeId(null);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isCreating && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Name
              </label>
              <input
                type="text"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
                placeholder="My Custom Theme"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ColorPicker
              label="Primary Color"
              value={customColors.primary}
              onChange={(color) => setCustomColors({ ...customColors, primary: color })}
            />
            <ColorPicker
              label="Primary Dark"
              value={customColors.primaryDark}
              onChange={(color) => setCustomColors({ ...customColors, primaryDark: color })}
            />
            <ColorPicker
              label="Secondary Color"
              value={customColors.secondary}
              onChange={(color) => setCustomColors({ ...customColors, secondary: color })}
            />
            <ColorPicker
              label="Accent Color"
              value={customColors.accent}
              onChange={(color) => setCustomColors({ ...customColors, accent: color })}
            />
            <ColorPicker
              label="Success Color"
              value={customColors.success}
              onChange={(color) => setCustomColors({ ...customColors, success: color })}
            />
            <ColorPicker
              label="Warning Color"
              value={customColors.warning}
              onChange={(color) => setCustomColors({ ...customColors, warning: color })}
            />
            <ColorPicker
              label="Error Color"
              value={customColors.error}
              onChange={(color) => setCustomColors({ ...customColors, error: color })}
            />
            <ColorPicker
              label="Info Color"
              value={customColors.info}
              onChange={(color) => setCustomColors({ ...customColors, info: color })}
            />
          </div>

          <div className="flex gap-2">
            {isCreating ? (
              <button
                onClick={handleCreateTheme}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Create Theme
              </button>
            ) : editingThemeId && (
              <button
                onClick={() => handleUpdateTheme(editingThemeId)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={themes.find(t => t.id === editingThemeId)?.isBuiltIn}
              >
                <Save className="w-4 h-4" />
                {themes.find(t => t.id === editingThemeId)?.isBuiltIn ? 'Cannot Edit Built-in' : 'Save Changes'}
              </button>
            )}
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingThemeId(null);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      {!isCreating && !editingThemeId && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
            How to use custom themes
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Select a preset theme or create your own custom theme</li>
            <li>Click "Edit" to customize colors for any theme</li>
            <li>Export your themes to share or backup</li>
            <li>Import themes created by others or from backups</li>
            <li>Toggle the switch to enable/disable custom themes</li>
          </ul>
        </div>
      )}
    </div>
  );
}
