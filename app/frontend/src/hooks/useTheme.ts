import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface ThemeFonts {
  body: string;
  heading: string;
  mono: string;
}

export interface CSSVariables {
  [key: string]: string;
}

export interface Theme {
  id: string;
  userId: string;
  name: string;
  cssVariables: CSSVariables;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isDark: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  cssVariables: CSSVariables;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isDark: boolean;
}

export interface ThemeTemplate {
  id: string;
  name: string;
  description?: string;
  cssVariables: CSSVariables;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isDark: boolean;
  category?: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FontPairing {
  heading: string;
  body: string;
  description: string;
  category: string;
}

export interface ContrastIssue {
  foreground: string;
  background: string;
  ratio: number;
  level: 'AA' | 'AAA';
  passes: boolean;
}

export interface ThemeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contrastIssues: ContrastIssue[];
}

export interface CreateThemeData {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isDark: boolean;
  isDefault?: boolean;
}

export interface UpdateThemeData {
  name?: string;
  colors?: ThemeColors;
  fonts?: ThemeFonts;
  isDark?: boolean;
  isDefault?: boolean;
}

// ============================================
// API UTILITIES
// ============================================

const API_BASE = '/api/v1/themes';

const themeAPI = {
  getAll: async (): Promise<Theme[]> => {
    const response = await axios.get(API_BASE);
    return response.data.themes;
  },

  getById: async (id: string): Promise<Theme> => {
    const response = await axios.get(`${API_BASE}/${id}`);
    return response.data.theme;
  },

  create: async (data: CreateThemeData): Promise<Theme> => {
    const response = await axios.post(API_BASE, data);
    return response.data.theme;
  },

  update: async (id: string, data: UpdateThemeData): Promise<Theme> => {
    const response = await axios.put(`${API_BASE}/${id}`, data);
    return response.data.theme;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_BASE}/${id}`);
  },

  exportCSS: async (id: string): Promise<string> => {
    const response = await axios.get(`${API_BASE}/${id}/css`, {
      responseType: 'text',
    });
    return response.data;
  },

  exportTailwind: async (id: string): Promise<string> => {
    const response = await axios.get(`${API_BASE}/${id}/tailwind`, {
      responseType: 'text',
    });
    return response.data;
  },

  getPresets: async (): Promise<ThemePreset[]> => {
    const response = await axios.get(`${API_BASE}/presets`);
    return response.data.presets;
  },

  getTemplates: async (category?: string): Promise<ThemeTemplate[]> => {
    const params = category ? { category } : {};
    const response = await axios.get(`${API_BASE}/templates`, { params });
    return response.data.templates;
  },

  getFontPairings: async (category?: string): Promise<FontPairing[]> => {
    const params = category ? { category } : {};
    const response = await axios.get(`${API_BASE}/font-pairings`, { params });
    return response.data.pairings;
  },

  validate: async (data: CreateThemeData): Promise<ThemeValidation> => {
    const response = await axios.post(`${API_BASE}/validate`, data);
    return response.data.validation;
  },
};

// ============================================
// THEME APPLICATION UTILITIES
// ============================================

/**
 * Apply CSS variables to the document root
 */
function applyThemeVariables(variables: CSSVariables): void {
  const root = document.documentElement;
  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Remove CSS variables from the document root
 */
function removeThemeVariables(variables: CSSVariables): void {
  const root = document.documentElement;
  Object.keys(variables).forEach((key) => {
    root.style.removeProperty(key);
  });
}

/**
 * Save active theme ID to localStorage
 */
function saveActiveThemeId(themeId: string | null): void {
  if (themeId) {
    localStorage.setItem('activeThemeId', themeId);
  } else {
    localStorage.removeItem('activeThemeId');
  }
}

/**
 * Get active theme ID from localStorage
 */
function getActiveThemeId(): string | null {
  return localStorage.getItem('activeThemeId');
}

// ============================================
// CUSTOM HOOK
// ============================================

export function useTheme() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [presets, setPresets] = useState<ThemePreset[]>([]);
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);
  const [fontPairings, setFontPairings] = useState<FontPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all themes for the user
   */
  const loadThemes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userThemes = await themeAPI.getAll();
      setThemes(userThemes);

      // Set active theme from localStorage or default theme
      const savedThemeId = getActiveThemeId();
      if (savedThemeId) {
        const savedTheme = userThemes.find((t) => t.id === savedThemeId);
        if (savedTheme) {
          setActiveTheme(savedTheme);
          applyThemeVariables(savedTheme.cssVariables);
        }
      } else {
        const defaultTheme = userThemes.find((t) => t.isDefault);
        if (defaultTheme) {
          setActiveTheme(defaultTheme);
          applyThemeVariables(defaultTheme.cssVariables);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load themes');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load theme presets
   */
  const loadPresets = useCallback(async () => {
    try {
      const themePresets = await themeAPI.getPresets();
      setPresets(themePresets);
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  }, []);

  /**
   * Load theme templates
   */
  const loadTemplates = useCallback(async (category?: string) => {
    try {
      const themeTemplates = await themeAPI.getTemplates(category);
      setTemplates(themeTemplates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  }, []);

  /**
   * Load font pairings
   */
  const loadFontPairings = useCallback(async (category?: string) => {
    try {
      const pairings = await themeAPI.getFontPairings(category);
      setFontPairings(pairings);
    } catch (err) {
      console.error('Failed to load font pairings:', err);
    }
  }, []);

  /**
   * Apply a theme
   */
  const applyTheme = useCallback((theme: Theme | ThemePreset) => {
    if (activeTheme) {
      removeThemeVariables(activeTheme.cssVariables);
    }
    applyThemeVariables(theme.cssVariables);

    if ('userId' in theme) {
      setActiveTheme(theme as Theme);
      saveActiveThemeId(theme.id);
    }
  }, [activeTheme]);

  /**
   * Create a new theme
   */
  const createTheme = useCallback(async (data: CreateThemeData): Promise<Theme> => {
    const newTheme = await themeAPI.create(data);
    setThemes((prev) => [newTheme, ...prev]);
    return newTheme;
  }, []);

  /**
   * Update an existing theme
   */
  const updateTheme = useCallback(async (id: string, data: UpdateThemeData): Promise<Theme> => {
    const updatedTheme = await themeAPI.update(id, data);
    setThemes((prev) => prev.map((t) => (t.id === id ? updatedTheme : t)));

    if (activeTheme?.id === id) {
      setActiveTheme(updatedTheme);
      applyThemeVariables(updatedTheme.cssVariables);
    }

    return updatedTheme;
  }, [activeTheme]);

  /**
   * Delete a theme
   */
  const deleteTheme = useCallback(async (id: string): Promise<void> => {
    await themeAPI.delete(id);
    setThemes((prev) => prev.filter((t) => t.id !== id));

    if (activeTheme?.id === id) {
      setActiveTheme(null);
      saveActiveThemeId(null);
    }
  }, [activeTheme]);

  /**
   * Export theme to CSS
   */
  const exportCSS = useCallback(async (id: string): Promise<string> => {
    return await themeAPI.exportCSS(id);
  }, []);

  /**
   * Export theme to Tailwind config
   */
  const exportTailwind = useCallback(async (id: string): Promise<string> => {
    return await themeAPI.exportTailwind(id);
  }, []);

  /**
   * Validate theme data
   */
  const validateTheme = useCallback(async (data: CreateThemeData): Promise<ThemeValidation> => {
    return await themeAPI.validate(data);
  }, []);

  /**
   * Download CSS file
   */
  const downloadCSS = useCallback(async (id: string, filename: string) => {
    const css = await exportCSS(id);
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `theme-${id}.css`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportCSS]);

  /**
   * Download Tailwind config file
   */
  const downloadTailwind = useCallback(async (id: string, filename: string) => {
    const config = await exportTailwind(id);
    const blob = new Blob([config], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'tailwind.config.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportTailwind]);

  /**
   * Create theme from preset
   */
  const createFromPreset = useCallback(async (preset: ThemePreset, name: string): Promise<Theme> => {
    return await createTheme({
      name,
      colors: preset.colors,
      fonts: preset.fonts,
      isDark: preset.isDark,
      isDefault: false,
    });
  }, [createTheme]);

  /**
   * Create theme from template
   */
  const createFromTemplate = useCallback(async (template: ThemeTemplate, name: string): Promise<Theme> => {
    return await createTheme({
      name,
      colors: template.colors,
      fonts: template.fonts,
      isDark: template.isDark,
      isDefault: false,
    });
  }, [createTheme]);

  // Initialize themes on mount
  useEffect(() => {
    loadThemes();
    loadPresets();
    loadFontPairings();
  }, [loadThemes, loadPresets, loadFontPairings]);

  return {
    // State
    themes,
    activeTheme,
    presets,
    templates,
    fontPairings,
    loading,
    error,

    // Actions
    loadThemes,
    loadPresets,
    loadTemplates,
    loadFontPairings,
    applyTheme,
    createTheme,
    updateTheme,
    deleteTheme,
    exportCSS,
    exportTailwind,
    validateTheme,
    downloadCSS,
    downloadTailwind,
    createFromPreset,
    createFromTemplate,
  };
}

export default useTheme;
