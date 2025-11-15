import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  backgroundDark: string;
  surface: string;
  surfaceDark: string;
  text: string;
  textDark: string;
  border: string;
  borderDark: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  isBuiltIn: boolean;
}

interface CustomThemeState {
  activeThemeId: string;
  themes: CustomTheme[];
  isCustomThemeEnabled: boolean;
  setActiveTheme: (themeId: string) => void;
  addTheme: (theme: CustomTheme) => void;
  updateTheme: (themeId: string, colors: ThemeColors) => void;
  deleteTheme: (themeId: string) => void;
  toggleCustomTheme: (enabled: boolean) => void;
  applyTheme: (colors: ThemeColors) => void;
  resetToDefault: () => void;
}

// Built-in theme presets
const builtInThemes: CustomTheme[] = [
  {
    id: 'default',
    name: 'Default Blue',
    isBuiltIn: true,
    colors: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#f9fafb',
      backgroundDark: '#111827',
      surface: '#ffffff',
      surfaceDark: '#1f2937',
      text: '#111827',
      textDark: '#f9fafb',
      border: '#e5e7eb',
      borderDark: '#374151',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    isBuiltIn: true,
    colors: {
      primary: '#0891b2',
      primaryDark: '#0e7490',
      secondary: '#06b6d4',
      accent: '#14b8a6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0891b2',
      background: '#ecfeff',
      backgroundDark: '#164e63',
      surface: '#ffffff',
      surfaceDark: '#155e75',
      text: '#164e63',
      textDark: '#ecfeff',
      border: '#a5f3fc',
      borderDark: '#0e7490',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    isBuiltIn: true,
    colors: {
      primary: '#f97316',
      primaryDark: '#ea580c',
      secondary: '#f59e0b',
      accent: '#eab308',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#fff7ed',
      backgroundDark: '#7c2d12',
      surface: '#ffffff',
      surfaceDark: '#9a3412',
      text: '#7c2d12',
      textDark: '#fff7ed',
      border: '#fed7aa',
      borderDark: '#ea580c',
    },
  },
  {
    id: 'forest',
    name: 'Forest Green',
    isBuiltIn: true,
    colors: {
      primary: '#059669',
      primaryDark: '#047857',
      secondary: '#10b981',
      accent: '#14b8a6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#ecfdf5',
      backgroundDark: '#064e3b',
      surface: '#ffffff',
      surfaceDark: '#065f46',
      text: '#064e3b',
      textDark: '#ecfdf5',
      border: '#a7f3d0',
      borderDark: '#047857',
    },
  },
  {
    id: 'purple',
    name: 'Purple Haze',
    isBuiltIn: true,
    colors: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      secondary: '#a78bfa',
      accent: '#c084fc',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#faf5ff',
      backgroundDark: '#581c87',
      surface: '#ffffff',
      surfaceDark: '#6b21a8',
      text: '#581c87',
      textDark: '#faf5ff',
      border: '#e9d5ff',
      borderDark: '#7c3aed',
    },
  },
  {
    id: 'rose',
    name: 'Rose Garden',
    isBuiltIn: true,
    colors: {
      primary: '#f43f5e',
      primaryDark: '#e11d48',
      secondary: '#fb7185',
      accent: '#fda4af',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#fff1f2',
      backgroundDark: '#881337',
      surface: '#ffffff',
      surfaceDark: '#9f1239',
      text: '#881337',
      textDark: '#fff1f2',
      border: '#fecdd3',
      borderDark: '#e11d48',
    },
  },
  {
    id: 'slate',
    name: 'Slate Gray',
    isBuiltIn: true,
    colors: {
      primary: '#64748b',
      primaryDark: '#475569',
      secondary: '#94a3b8',
      accent: '#cbd5e1',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#f8fafc',
      backgroundDark: '#0f172a',
      surface: '#ffffff',
      surfaceDark: '#1e293b',
      text: '#0f172a',
      textDark: '#f8fafc',
      border: '#e2e8f0',
      borderDark: '#334155',
    },
  },
  {
    id: 'amber',
    name: 'Amber Warmth',
    isBuiltIn: true,
    colors: {
      primary: '#d97706',
      primaryDark: '#b45309',
      secondary: '#f59e0b',
      accent: '#fbbf24',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      background: '#fffbeb',
      backgroundDark: '#78350f',
      surface: '#ffffff',
      surfaceDark: '#92400e',
      text: '#78350f',
      textDark: '#fffbeb',
      border: '#fde68a',
      borderDark: '#b45309',
    },
  },
];

export const useCustomThemeStore = create<CustomThemeState>()(
  persist(
    (set, get) => ({
      activeThemeId: 'default',
      themes: builtInThemes,
      isCustomThemeEnabled: false,

      setActiveTheme: (themeId: string) => {
        const theme = get().themes.find(t => t.id === themeId);
        if (theme) {
          set({ activeThemeId: themeId });
          if (get().isCustomThemeEnabled) {
            get().applyTheme(theme.colors);
          }
        }
      },

      addTheme: (theme: CustomTheme) => {
        set(state => ({
          themes: [...state.themes, theme],
        }));
      },

      updateTheme: (themeId: string, colors: ThemeColors) => {
        set(state => ({
          themes: state.themes.map(t =>
            t.id === themeId ? { ...t, colors } : t
          ),
        }));
        if (get().activeThemeId === themeId && get().isCustomThemeEnabled) {
          get().applyTheme(colors);
        }
      },

      deleteTheme: (themeId: string) => {
        const theme = get().themes.find(t => t.id === themeId);
        if (theme?.isBuiltIn) return; // Can't delete built-in themes

        set(state => ({
          themes: state.themes.filter(t => t.id !== themeId),
          activeThemeId: state.activeThemeId === themeId ? 'default' : state.activeThemeId,
        }));
      },

      toggleCustomTheme: (enabled: boolean) => {
        set({ isCustomThemeEnabled: enabled });
        if (enabled) {
          const theme = get().themes.find(t => t.id === get().activeThemeId);
          if (theme) {
            get().applyTheme(theme.colors);
          }
        } else {
          // Reset to defaults
          document.documentElement.style.removeProperty('--color-primary');
          document.documentElement.style.removeProperty('--color-primary-dark');
          // ... remove all custom properties
        }
      },

      applyTheme: (colors: ThemeColors) => {
        // Apply CSS custom properties
        document.documentElement.style.setProperty('--color-primary', colors.primary);
        document.documentElement.style.setProperty('--color-primary-dark', colors.primaryDark);
        document.documentElement.style.setProperty('--color-secondary', colors.secondary);
        document.documentElement.style.setProperty('--color-accent', colors.accent);
        document.documentElement.style.setProperty('--color-success', colors.success);
        document.documentElement.style.setProperty('--color-warning', colors.warning);
        document.documentElement.style.setProperty('--color-error', colors.error);
        document.documentElement.style.setProperty('--color-info', colors.info);
        document.documentElement.style.setProperty('--color-background', colors.background);
        document.documentElement.style.setProperty('--color-background-dark', colors.backgroundDark);
        document.documentElement.style.setProperty('--color-surface', colors.surface);
        document.documentElement.style.setProperty('--color-surface-dark', colors.surfaceDark);
        document.documentElement.style.setProperty('--color-text', colors.text);
        document.documentElement.style.setProperty('--color-text-dark', colors.textDark);
        document.documentElement.style.setProperty('--color-border', colors.border);
        document.documentElement.style.setProperty('--color-border-dark', colors.borderDark);
      },

      resetToDefault: () => {
        set({
          activeThemeId: 'default',
          isCustomThemeEnabled: false,
          themes: builtInThemes,
        });
        // Remove all custom properties
        document.documentElement.style.removeProperty('--color-primary');
        document.documentElement.style.removeProperty('--color-primary-dark');
        document.documentElement.style.removeProperty('--color-secondary');
        document.documentElement.style.removeProperty('--color-accent');
        document.documentElement.style.removeProperty('--color-success');
        document.documentElement.style.removeProperty('--color-warning');
        document.documentElement.style.removeProperty('--color-error');
        document.documentElement.style.removeProperty('--color-info');
        document.documentElement.style.removeProperty('--color-background');
        document.documentElement.style.removeProperty('--color-background-dark');
        document.documentElement.style.removeProperty('--color-surface');
        document.documentElement.style.removeProperty('--color-surface-dark');
        document.documentElement.style.removeProperty('--color-text');
        document.documentElement.style.removeProperty('--color-text-dark');
        document.documentElement.style.removeProperty('--color-border');
        document.documentElement.style.removeProperty('--color-border-dark');
      },
    }),
    {
      name: 'custom-theme-storage',
    }
  )
);
