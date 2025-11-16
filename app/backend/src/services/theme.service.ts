import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

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

export interface ThemeData {
  name: string;
  cssVariables: CSSVariables;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isDark: boolean;
  isDefault?: boolean;
}

export interface ThemeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  contrastIssues: ContrastIssue[];
}

export interface ContrastIssue {
  foreground: string;
  background: string;
  ratio: number;
  level: 'AA' | 'AAA';
  passes: boolean;
}

export interface FontPairing {
  heading: string;
  body: string;
  description: string;
  category: string;
}

// ============================================
// CONSTANTS
// ============================================

// WCAG 2.1 Contrast Requirements
const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
};

// Popular font pairings
const FONT_PAIRINGS: FontPairing[] = [
  {
    heading: 'Playfair Display',
    body: 'Source Sans Pro',
    description: 'Classic serif with modern sans-serif',
    category: 'Professional',
  },
  {
    heading: 'Montserrat',
    body: 'Open Sans',
    description: 'Clean geometric pairing',
    category: 'Modern',
  },
  {
    heading: 'Raleway',
    body: 'Lato',
    description: 'Elegant and readable',
    category: 'Elegant',
  },
  {
    heading: 'Roboto Slab',
    body: 'Roboto',
    description: 'Cohesive family pairing',
    category: 'Tech',
  },
  {
    heading: 'Merriweather',
    body: 'Merriweather Sans',
    description: 'Traditional with excellent readability',
    category: 'Classic',
  },
  {
    heading: 'Oswald',
    body: 'Nunito',
    description: 'Bold headlines with friendly body',
    category: 'Creative',
  },
  {
    heading: 'Poppins',
    body: 'Inter',
    description: 'Modern geometric sans',
    category: 'Minimal',
  },
  {
    heading: 'Bebas Neue',
    body: 'Quicksand',
    description: 'Strong impact with soft body',
    category: 'Bold',
  },
];

// Default theme presets
const THEME_PRESETS: Record<string, Partial<ThemeData>> = {
  professional: {
    name: 'Professional Blue',
    colors: {
      primary: '#2563eb',
      secondary: '#64748b',
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
    },
    fonts: {
      body: 'Inter, system-ui, sans-serif',
      heading: 'Poppins, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    isDark: false,
  },
  creative: {
    name: 'Creative Purple',
    colors: {
      primary: '#9333ea',
      secondary: '#ec4899',
      accent: '#f97316',
      background: '#fafafa',
      surface: '#ffffff',
      text: '#18181b',
      textSecondary: '#71717a',
      border: '#e4e4e7',
      error: '#ef4444',
      warning: '#eab308',
      success: '#22c55e',
      info: '#8b5cf6',
    },
    fonts: {
      body: 'Quicksand, sans-serif',
      heading: 'Bebas Neue, sans-serif',
      mono: 'Fira Code, monospace',
    },
    isDark: false,
  },
  dark: {
    name: 'Dark Mode',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      border: '#334155',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#4ade80',
      info: '#60a5fa',
    },
    fonts: {
      body: 'Inter, system-ui, sans-serif',
      heading: 'Poppins, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    isDark: true,
  },
  minimal: {
    name: 'Minimal Monochrome',
    colors: {
      primary: '#18181b',
      secondary: '#52525b',
      accent: '#71717a',
      background: '#ffffff',
      surface: '#fafafa',
      text: '#09090b',
      textSecondary: '#71717a',
      border: '#e4e4e7',
      error: '#991b1b',
      warning: '#92400e',
      success: '#166534',
      info: '#1e3a8a',
    },
    fonts: {
      body: 'System-ui, sans-serif',
      heading: 'System-ui, sans-serif',
      mono: 'ui-monospace, monospace',
    },
    isDark: false,
  },
};

// ============================================
// COLOR UTILITIES
// ============================================

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate relative luminance
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(foreground: string, background: string): number {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast passes WCAG standards
 */
function checkContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): ContrastIssue {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = level === 'AA' ? CONTRAST_RATIOS.AA_NORMAL : CONTRAST_RATIOS.AAA_NORMAL;

  return {
    foreground,
    background,
    ratio: Math.round(ratio * 100) / 100,
    level,
    passes: ratio >= requiredRatio,
  };
}

/**
 * Lighten or darken a color
 */
function adjustColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const adjust = (value: number) => {
    const adjusted = Math.round(value + (255 - value) * (percent / 100));
    return Math.min(255, Math.max(0, adjusted));
  };

  const r = adjust(rgb.r).toString(16).padStart(2, '0');
  const g = adjust(rgb.g).toString(16).padStart(2, '0');
  const b = adjust(rgb.b).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

// ============================================
// CSS GENERATION
// ============================================

/**
 * Generate CSS variables from theme colors and fonts
 */
export function generateCSSVariables(colors: ThemeColors, fonts: ThemeFonts): CSSVariables {
  const variables: CSSVariables = {
    // Colors
    '--color-primary': colors.primary,
    '--color-secondary': colors.secondary,
    '--color-accent': colors.accent,
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-text': colors.text,
    '--color-text-secondary': colors.textSecondary,
    '--color-border': colors.border,
    '--color-error': colors.error,
    '--color-warning': colors.warning,
    '--color-success': colors.success,
    '--color-info': colors.info,

    // Color variations
    '--color-primary-light': adjustColor(colors.primary, 20),
    '--color-primary-dark': adjustColor(colors.primary, -20),
    '--color-secondary-light': adjustColor(colors.secondary, 20),
    '--color-secondary-dark': adjustColor(colors.secondary, -20),

    // Fonts
    '--font-body': fonts.body,
    '--font-heading': fonts.heading,
    '--font-mono': fonts.mono,

    // Typography scale
    '--text-xs': '0.75rem',
    '--text-sm': '0.875rem',
    '--text-base': '1rem',
    '--text-lg': '1.125rem',
    '--text-xl': '1.25rem',
    '--text-2xl': '1.5rem',
    '--text-3xl': '1.875rem',
    '--text-4xl': '2.25rem',

    // Spacing scale
    '--spacing-1': '0.25rem',
    '--spacing-2': '0.5rem',
    '--spacing-3': '0.75rem',
    '--spacing-4': '1rem',
    '--spacing-5': '1.25rem',
    '--spacing-6': '1.5rem',
    '--spacing-8': '2rem',
    '--spacing-10': '2.5rem',
    '--spacing-12': '3rem',

    // Border radius
    '--radius-sm': '0.25rem',
    '--radius-md': '0.375rem',
    '--radius-lg': '0.5rem',
    '--radius-xl': '0.75rem',

    // Shadows
    '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  };

  return variables;
}

/**
 * Export theme to CSS string
 */
export function exportToCSS(theme: ThemeData): string {
  const variables = theme.cssVariables;
  let css = `:root {\n`;

  Object.entries(variables).forEach(([key, value]) => {
    css += `  ${key}: ${value};\n`;
  });

  css += `}\n\n`;

  // Add dark mode specific overrides if theme is dark
  if (theme.isDark) {
    css += `@media (prefers-color-scheme: dark) {\n`;
    css += `  :root {\n`;
    Object.entries(variables).forEach(([key, value]) => {
      if (key.startsWith('--color-')) {
        css += `    ${key}: ${value};\n`;
      }
    });
    css += `  }\n`;
    css += `}\n`;
  }

  return css;
}

/**
 * Export theme to Tailwind config format
 */
export function exportToTailwindConfig(theme: ThemeData): string {
  const colors = theme.colors;
  const fonts = theme.fonts;

  const config = {
    theme: {
      extend: {
        colors: {
          primary: colors.primary,
          secondary: colors.secondary,
          accent: colors.accent,
          background: colors.background,
          surface: colors.surface,
          border: colors.border,
        },
        fontFamily: {
          body: fonts.body.split(',').map((f) => f.trim()),
          heading: fonts.heading.split(',').map((f) => f.trim()),
          mono: fonts.mono.split(',').map((f) => f.trim()),
        },
      },
    },
  };

  return `module.exports = ${JSON.stringify(config, null, 2)};`;
}

// ============================================
// THEME VALIDATION
// ============================================

/**
 * Validate theme data
 */
export function validateTheme(theme: Partial<ThemeData>): ThemeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contrastIssues: ContrastIssue[] = [];

  // Validate name
  if (!theme.name || theme.name.trim().length === 0) {
    errors.push('Theme name is required');
  }

  // Validate colors
  if (!theme.colors) {
    errors.push('Theme colors are required');
  } else {
    const requiredColors: (keyof ThemeColors)[] = [
      'primary',
      'secondary',
      'accent',
      'background',
      'surface',
      'text',
      'textSecondary',
      'border',
      'error',
      'warning',
      'success',
      'info',
    ];

    requiredColors.forEach((colorKey) => {
      const color = theme.colors![colorKey];
      if (!color) {
        errors.push(`Color '${colorKey}' is required`);
      } else if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        errors.push(`Color '${colorKey}' must be a valid hex color (e.g., #FF0000)`);
      }
    });

    // Check contrast ratios
    if (theme.colors.text && theme.colors.background) {
      const textContrast = checkContrast(theme.colors.text, theme.colors.background);
      contrastIssues.push(textContrast);
      if (!textContrast.passes) {
        warnings.push(
          `Text/background contrast ratio (${textContrast.ratio}) does not meet WCAG AA standards`
        );
      }
    }

    if (theme.colors.primary && theme.colors.background) {
      const primaryContrast = checkContrast(theme.colors.primary, theme.colors.background);
      contrastIssues.push(primaryContrast);
      if (!primaryContrast.passes) {
        warnings.push(
          `Primary/background contrast ratio (${primaryContrast.ratio}) does not meet WCAG AA standards`
        );
      }
    }
  }

  // Validate fonts
  if (!theme.fonts) {
    errors.push('Theme fonts are required');
  } else {
    if (!theme.fonts.body || theme.fonts.body.trim().length === 0) {
      errors.push('Body font is required');
    }
    if (!theme.fonts.heading || theme.fonts.heading.trim().length === 0) {
      errors.push('Heading font is required');
    }
    if (!theme.fonts.mono || theme.fonts.mono.trim().length === 0) {
      errors.push('Monospace font is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    contrastIssues,
  };
}

// ============================================
// THEME SERVICE
// ============================================

export class ThemeService {
  /**
   * Create a new user theme
   */
  static async createTheme(userId: string, themeData: ThemeData) {
    // Validate theme
    const validation = validateTheme(themeData);
    if (!validation.isValid) {
      throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
    }

    // Generate CSS variables
    const cssVariables = generateCSSVariables(themeData.colors, themeData.fonts);

    // If this is set as default, unset other defaults
    if (themeData.isDefault) {
      await prisma.userTheme.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create theme
    const theme = await prisma.userTheme.create({
      data: {
        userId,
        name: themeData.name,
        cssVariables: JSON.stringify(cssVariables),
        colors: JSON.stringify(themeData.colors),
        fonts: JSON.stringify(themeData.fonts),
        isDark: themeData.isDark,
        isDefault: themeData.isDefault || false,
      },
    });

    logger.info(`Theme created: ${theme.id} for user ${userId}`);
    return theme;
  }

  /**
   * Get all themes for a user
   */
  static async getUserThemes(userId: string) {
    const themes = await prisma.userTheme.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return themes.map((theme) => ({
      ...theme,
      cssVariables: JSON.parse(theme.cssVariables),
      colors: JSON.parse(theme.colors),
      fonts: JSON.parse(theme.fonts),
    }));
  }

  /**
   * Get a specific theme
   */
  static async getTheme(userId: string, themeId: string) {
    const theme = await prisma.userTheme.findFirst({
      where: { id: themeId, userId },
    });

    if (!theme) {
      return null;
    }

    return {
      ...theme,
      cssVariables: JSON.parse(theme.cssVariables),
      colors: JSON.parse(theme.colors),
      fonts: JSON.parse(theme.fonts),
    };
  }

  /**
   * Update a theme
   */
  static async updateTheme(userId: string, themeId: string, updates: Partial<ThemeData>) {
    // Get existing theme
    const existingTheme = await this.getTheme(userId, themeId);
    if (!existingTheme) {
      throw new Error('Theme not found');
    }

    // Merge updates
    const updatedData = {
      name: updates.name || existingTheme.name,
      colors: updates.colors || existingTheme.colors,
      fonts: updates.fonts || existingTheme.fonts,
      isDark: updates.isDark !== undefined ? updates.isDark : existingTheme.isDark,
      isDefault: updates.isDefault !== undefined ? updates.isDefault : existingTheme.isDefault,
    };

    // Validate merged data
    const validation = validateTheme(updatedData);
    if (!validation.isValid) {
      throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
    }

    // Generate CSS variables
    const cssVariables = generateCSSVariables(updatedData.colors, updatedData.fonts);

    // If this is set as default, unset other defaults
    if (updatedData.isDefault) {
      await prisma.userTheme.updateMany({
        where: { userId, isDefault: true, id: { not: themeId } },
        data: { isDefault: false },
      });
    }

    // Update theme
    const theme = await prisma.userTheme.update({
      where: { id: themeId },
      data: {
        name: updatedData.name,
        cssVariables: JSON.stringify(cssVariables),
        colors: JSON.stringify(updatedData.colors),
        fonts: JSON.stringify(updatedData.fonts),
        isDark: updatedData.isDark,
        isDefault: updatedData.isDefault,
      },
    });

    logger.info(`Theme updated: ${theme.id}`);
    return {
      ...theme,
      cssVariables,
      colors: updatedData.colors,
      fonts: updatedData.fonts,
    };
  }

  /**
   * Delete a theme
   */
  static async deleteTheme(userId: string, themeId: string) {
    const theme = await prisma.userTheme.findFirst({
      where: { id: themeId, userId },
    });

    if (!theme) {
      throw new Error('Theme not found');
    }

    await prisma.userTheme.delete({
      where: { id: themeId },
    });

    logger.info(`Theme deleted: ${themeId}`);
  }

  /**
   * Get theme presets
   */
  static getPresets() {
    return Object.entries(THEME_PRESETS).map(([key, preset]) => ({
      id: key,
      ...preset,
      cssVariables: generateCSSVariables(preset.colors!, preset.fonts!),
    }));
  }

  /**
   * Get font pairing suggestions
   */
  static getFontPairings(category?: string) {
    if (category) {
      return FONT_PAIRINGS.filter((p) => p.category === category);
    }
    return FONT_PAIRINGS;
  }

  /**
   * Get all theme templates
   */
  static async getTemplates(category?: string) {
    const where = category ? { category } : {};
    const templates = await prisma.themeTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((template) => ({
      ...template,
      cssVariables: JSON.parse(template.cssVariables),
      colors: JSON.parse(template.colors),
      fonts: JSON.parse(template.fonts),
    }));
  }

  /**
   * Export theme to CSS
   */
  static async exportThemeCSS(userId: string, themeId: string) {
    const theme = await this.getTheme(userId, themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    return exportToCSS({
      name: theme.name,
      cssVariables: theme.cssVariables,
      colors: theme.colors,
      fonts: theme.fonts,
      isDark: theme.isDark,
    });
  }

  /**
   * Export theme to Tailwind config
   */
  static async exportThemeTailwind(userId: string, themeId: string) {
    const theme = await this.getTheme(userId, themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    return exportToTailwindConfig({
      name: theme.name,
      cssVariables: theme.cssVariables,
      colors: theme.colors,
      fonts: theme.fonts,
      isDark: theme.isDark,
    });
  }

  /**
   * Validate theme and get contrast report
   */
  static validateThemeData(themeData: Partial<ThemeData>) {
    return validateTheme(themeData);
  }
}
