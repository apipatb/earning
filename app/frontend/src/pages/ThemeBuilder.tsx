import { useState, useEffect } from 'react';
import {
  Palette,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  FileCode,
  Moon,
  Sun,
} from 'lucide-react';
import useTheme, { ThemeColors, ThemeFonts, CreateThemeData } from '../hooks/useTheme';
import ColorPicker from '../components/ColorPicker';
import FontSelector from '../components/FontSelector';
import ThemePreview from '../components/ThemePreview';
import { notify } from '../store/notification.store';

const DEFAULT_COLORS: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  error: '#dc2626',
  warning: '#f59e0b',
  success: '#16a34a',
  info: '#3b82f6',
};

const DEFAULT_FONTS: ThemeFonts = {
  body: 'Inter, system-ui, sans-serif',
  heading: 'Poppins, sans-serif',
  mono: 'JetBrains Mono, monospace',
};

export default function ThemeBuilder() {
  const {
    themes,
    activeTheme,
    presets,
    templates,
    fontPairings,
    loading,
    applyTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    downloadCSS,
    downloadTailwind,
    validateTheme,
    createFromPreset,
    createFromTemplate,
    loadTemplates,
  } = useTheme();

  const [themeName, setThemeName] = useState('');
  const [colors, setColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const [fonts, setFonts] = useState<ThemeFonts>(DEFAULT_FONTS);
  const [isDark, setIsDark] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'colors' | 'fonts' | 'validation'>('colors');

  useEffect(() => {
    if (activeTheme) {
      setThemeName(activeTheme.name);
      setColors(activeTheme.colors);
      setFonts(activeTheme.fonts);
      setIsDark(activeTheme.isDark);
      setEditingThemeId(activeTheme.id);
    }
  }, [activeTheme]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleFontChange = (key: keyof ThemeFonts, value: string) => {
    setFonts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveTheme = async () => {
    if (!themeName.trim()) {
      notify.warning('Name Required', 'Please enter a theme name');
      return;
    }

    try {
      const themeData: CreateThemeData = {
        name: themeName,
        colors,
        fonts,
        isDark,
        isDefault: false,
      };

      if (editingThemeId && activeTheme) {
        await updateTheme(editingThemeId, themeData);
        notify.success('Theme Updated', `"${themeName}" has been updated successfully`);
      } else {
        const newTheme = await createTheme(themeData);
        setEditingThemeId(newTheme.id);
        notify.success('Theme Created', `"${themeName}" has been created successfully`);
      }
    } catch (error) {
      notify.error('Error', error instanceof Error ? error.message : 'Failed to save theme');
    }
  };

  const handleValidate = async () => {
    try {
      const result = await validateTheme({
        name: themeName || 'Untitled Theme',
        colors,
        fonts,
        isDark,
      });
      setValidationResult(result);
      setSelectedTab('validation');

      if (result.isValid) {
        notify.success('Validation Passed', 'Your theme meets all requirements');
      } else {
        notify.warning('Validation Issues', `Found ${result.errors.length} errors`);
      }
    } catch (error) {
      notify.error('Error', 'Failed to validate theme');
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm('Delete this theme? This action cannot be undone.')) return;

    try {
      await deleteTheme(themeId);
      notify.success('Theme Deleted', 'Theme has been removed');
      resetForm();
    } catch (error) {
      notify.error('Error', 'Failed to delete theme');
    }
  };

  const handleExportCSS = async () => {
    if (!editingThemeId) {
      notify.warning('Save First', 'Please save the theme before exporting');
      return;
    }

    try {
      await downloadCSS(editingThemeId, `${themeName.toLowerCase().replace(/\s+/g, '-')}.css`);
      notify.success('Exported', 'CSS file downloaded successfully');
    } catch (error) {
      notify.error('Error', 'Failed to export CSS');
    }
  };

  const handleExportTailwind = async () => {
    if (!editingThemeId) {
      notify.warning('Save First', 'Please save the theme before exporting');
      return;
    }

    try {
      await downloadTailwind(editingThemeId, 'tailwind.config.js');
      notify.success('Exported', 'Tailwind config downloaded successfully');
    } catch (error) {
      notify.error('Error', 'Failed to export Tailwind config');
    }
  };

  const handleApplyPreset = async (preset: any) => {
    const name = prompt('Enter a name for this theme:', preset.name);
    if (!name) return;

    try {
      const newTheme = await createFromPreset(preset, name);
      applyTheme(newTheme);
      setShowPresets(false);
      notify.success('Preset Applied', `"${name}" created from preset`);
    } catch (error) {
      notify.error('Error', 'Failed to apply preset');
    }
  };

  const handleApplyTemplate = async (template: any) => {
    const name = prompt('Enter a name for this theme:', template.name);
    if (!name) return;

    try {
      const newTheme = await createFromTemplate(template, name);
      applyTheme(newTheme);
      setShowTemplates(false);
      notify.success('Template Applied', `"${name}" created from template`);
    } catch (error) {
      notify.error('Error', 'Failed to apply template');
    }
  };

  const resetForm = () => {
    setThemeName('');
    setColors(DEFAULT_COLORS);
    setFonts(DEFAULT_FONTS);
    setIsDark(false);
    setEditingThemeId(null);
    setValidationResult(null);
  };

  const duplicateTheme = () => {
    setThemeName(`${themeName} (Copy)`);
    setEditingThemeId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading themes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Palette className="w-8 h-8 mr-3 text-blue-600" />
                Theme Builder
              </h1>
              <p className="text-gray-600 mt-1">
                Create and customize your perfect theme with live preview
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center"
              >
                {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <div className="space-y-6">
            {/* Theme Name */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Theme Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme Name
                  </label>
                  <input
                    type="text"
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="My Awesome Theme"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Dark Theme</label>
                  <button
                    onClick={() => setIsDark(!isDark)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isDark ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isDark ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowPresets(true)}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Presets
                </button>
                <button
                  onClick={() => setShowTemplates(true)}
                  className="px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center justify-center"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Templates
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </button>
                <button
                  onClick={duplicateTheme}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center"
                  disabled={!editingThemeId}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b border-gray-200">
                <div className="flex">
                  <button
                    onClick={() => setSelectedTab('colors')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      selectedTab === 'colors'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Colors
                  </button>
                  <button
                    onClick={() => setSelectedTab('fonts')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      selectedTab === 'fonts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Fonts
                  </button>
                  <button
                    onClick={() => setSelectedTab('validation')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      selectedTab === 'validation'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Validation
                  </button>
                </div>
              </div>

              <div className="p-6">
                {selectedTab === 'colors' && (
                  <div className="space-y-4">
                    <h3 className="text-md font-semibold mb-4">Brand Colors</h3>
                    <ColorPicker
                      label="Primary Color"
                      value={colors.primary}
                      onChange={(value) => handleColorChange('primary', value)}
                    />
                    <ColorPicker
                      label="Secondary Color"
                      value={colors.secondary}
                      onChange={(value) => handleColorChange('secondary', value)}
                    />
                    <ColorPicker
                      label="Accent Color"
                      value={colors.accent}
                      onChange={(value) => handleColorChange('accent', value)}
                    />

                    <h3 className="text-md font-semibold mb-4 mt-6">Surface Colors</h3>
                    <ColorPicker
                      label="Background"
                      value={colors.background}
                      onChange={(value) => handleColorChange('background', value)}
                    />
                    <ColorPicker
                      label="Surface"
                      value={colors.surface}
                      onChange={(value) => handleColorChange('surface', value)}
                    />
                    <ColorPicker
                      label="Border"
                      value={colors.border}
                      onChange={(value) => handleColorChange('border', value)}
                    />

                    <h3 className="text-md font-semibold mb-4 mt-6">Text Colors</h3>
                    <ColorPicker
                      label="Text"
                      value={colors.text}
                      onChange={(value) => handleColorChange('text', value)}
                    />
                    <ColorPicker
                      label="Text Secondary"
                      value={colors.textSecondary}
                      onChange={(value) => handleColorChange('textSecondary', value)}
                    />

                    <h3 className="text-md font-semibold mb-4 mt-6">Status Colors</h3>
                    <ColorPicker
                      label="Success"
                      value={colors.success}
                      onChange={(value) => handleColorChange('success', value)}
                    />
                    <ColorPicker
                      label="Warning"
                      value={colors.warning}
                      onChange={(value) => handleColorChange('warning', value)}
                    />
                    <ColorPicker
                      label="Error"
                      value={colors.error}
                      onChange={(value) => handleColorChange('error', value)}
                    />
                    <ColorPicker
                      label="Info"
                      value={colors.info}
                      onChange={(value) => handleColorChange('info', value)}
                    />
                  </div>
                )}

                {selectedTab === 'fonts' && (
                  <div className="space-y-4">
                    <FontSelector
                      label="Heading Font"
                      value={fonts.heading}
                      onChange={(value) => handleFontChange('heading', value)}
                      fontPairings={fontPairings}
                      type="heading"
                    />
                    <FontSelector
                      label="Body Font"
                      value={fonts.body}
                      onChange={(value) => handleFontChange('body', value)}
                      fontPairings={fontPairings}
                      type="body"
                    />
                    <FontSelector
                      label="Monospace Font"
                      value={fonts.mono}
                      onChange={(value) => handleFontChange('mono', value)}
                      type="mono"
                    />
                  </div>
                )}

                {selectedTab === 'validation' && (
                  <div className="space-y-4">
                    <button
                      onClick={handleValidate}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Validate Theme
                    </button>

                    {validationResult && (
                      <div className="space-y-4 mt-6">
                        {/* Validation Summary */}
                        <div
                          className={`p-4 rounded-lg ${
                            validationResult.isValid
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-start">
                            {validationResult.isValid ? (
                              <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                            )}
                            <div>
                              <h4
                                className={`font-medium ${
                                  validationResult.isValid ? 'text-green-800' : 'text-red-800'
                                }`}
                              >
                                {validationResult.isValid
                                  ? 'Theme is Valid'
                                  : 'Validation Failed'}
                              </h4>
                              <p
                                className={`text-sm mt-1 ${
                                  validationResult.isValid ? 'text-green-700' : 'text-red-700'
                                }`}
                              >
                                {validationResult.isValid
                                  ? 'Your theme passes all validation checks'
                                  : `Found ${validationResult.errors.length} errors and ${validationResult.warnings.length} warnings`}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Errors */}
                        {validationResult.errors.length > 0 && (
                          <div>
                            <h5 className="font-medium text-red-800 mb-2">Errors:</h5>
                            <ul className="space-y-2">
                              {validationResult.errors.map((error: string, index: number) => (
                                <li key={index} className="text-sm text-red-700 flex items-start">
                                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                  {error}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Warnings */}
                        {validationResult.warnings.length > 0 && (
                          <div>
                            <h5 className="font-medium text-yellow-800 mb-2">Warnings:</h5>
                            <ul className="space-y-2">
                              {validationResult.warnings.map((warning: string, index: number) => (
                                <li key={index} className="text-sm text-yellow-700 flex items-start">
                                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                  {warning}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Contrast Report */}
                        {validationResult.contrastIssues.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-800 mb-3">Contrast Analysis:</h5>
                            <div className="space-y-2">
                              {validationResult.contrastIssues.map((issue: any, index: number) => (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg ${
                                    issue.passes ? 'bg-green-50' : 'bg-yellow-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-6 h-6 rounded border"
                                        style={{ backgroundColor: issue.foreground }}
                                      />
                                      <span className="text-sm">on</span>
                                      <div
                                        className="w-6 h-6 rounded border"
                                        style={{ backgroundColor: issue.background }}
                                      />
                                    </div>
                                    <div className="text-right">
                                      <div
                                        className={`text-sm font-medium ${
                                          issue.passes ? 'text-green-700' : 'text-yellow-700'
                                        }`}
                                      >
                                        {issue.ratio}:1
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        WCAG {issue.level}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSaveTheme}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingThemeId ? 'Update' : 'Save'} Theme
                </button>
                <button
                  onClick={handleExportCSS}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-medium"
                  disabled={!editingThemeId}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSS
                </button>
                <button
                  onClick={handleExportTailwind}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center font-medium"
                  disabled={!editingThemeId}
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  Export Tailwind
                </button>
                {editingThemeId && (
                  <button
                    onClick={() => handleDeleteTheme(editingThemeId)}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center font-medium"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Saved Themes */}
            {themes.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Your Themes</h2>
                <div className="space-y-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => applyTheme(theme)}
                      className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                        editingThemeId === theme.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{theme.name}</div>
                          <div className="text-sm text-gray-500">
                            {theme.isDark ? 'Dark' : 'Light'} Theme
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {[
                            theme.colors.primary,
                            theme.colors.secondary,
                            theme.colors.accent,
                          ].map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="lg:sticky lg:top-8 space-y-6" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Live Preview
                </h2>
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
                  <ThemePreview colors={colors} fonts={fonts} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Presets Modal */}
      {showPresets && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Theme Presets</h2>
                <button
                  onClick={() => setShowPresets(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all text-left group"
                >
                  <div className="font-medium mb-3">{preset.name}</div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Object.entries(preset.colors)
                      .slice(0, 8)
                      .map(([key, color]) => (
                        <div
                          key={key}
                          className="h-12 rounded border border-gray-300"
                          style={{ backgroundColor: color as string }}
                          title={key}
                        />
                      ))}
                  </div>
                  <div className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                    Click to apply →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Theme Templates</h2>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleApplyTemplate(template)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.category && (
                        <div className="text-xs text-gray-500 mt-1">{template.category}</div>
                      )}
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  )}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Object.entries(template.colors)
                      .slice(0, 8)
                      .map(([key, color]) => (
                        <div
                          key={key}
                          className="h-12 rounded border border-gray-300"
                          style={{ backgroundColor: color as string }}
                          title={key}
                        />
                      ))}
                  </div>
                  <div className="text-sm text-gray-600 group-hover:text-purple-600 transition-colors">
                    Click to apply →
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add X icon for modals
function X({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
