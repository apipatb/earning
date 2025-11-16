import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { logger } from '../utils/logger';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja', 'th'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Language metadata
export const LANGUAGE_METADATA: Record<SupportedLanguage, { name: string; nativeName: string; flag: string }> = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  zh: { name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  ja: { name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  th: { name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
};

/**
 * Initialize i18next for the backend
 */
export const initializeI18n = async (): Promise<void> => {
  try {
    await i18next
      .use(Backend)
      .init({
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        preload: [...SUPPORTED_LANGUAGES],
        ns: ['translation'],
        defaultNS: 'translation',
        backend: {
          loadPath: path.join(__dirname, '../i18n/{{lng}}.json'),
        },
        interpolation: {
          escapeValue: false, // Not needed for server-side
        },
        saveMissing: false,
        debug: process.env.NODE_ENV === 'development',
      });

    logger.info('i18next initialized successfully', {
      supportedLanguages: SUPPORTED_LANGUAGES,
      defaultLanguage: DEFAULT_LANGUAGE,
    });
  } catch (error) {
    logger.error('Failed to initialize i18next', { error });
    throw error;
  }
};

/**
 * Get translation for a key in a specific language
 * @param key Translation key (e.g., 'auth.loginSuccess')
 * @param language Language code
 * @param options Interpolation options (e.g., { name: 'John' })
 */
export const translate = (
  key: string,
  language: SupportedLanguage = DEFAULT_LANGUAGE,
  options?: Record<string, string | number>
): string => {
  try {
    return i18next.t(key, { lng: language, ...options });
  } catch (error) {
    logger.warn('Translation failed, returning key', { key, language, error });
    return key;
  }
};

/**
 * Get all translations for a specific language
 * @param language Language code
 */
export const getTranslations = (language: SupportedLanguage = DEFAULT_LANGUAGE): Record<string, any> => {
  try {
    const store = i18next.getResourceBundle(language, 'translation');
    return store || {};
  } catch (error) {
    logger.error('Failed to get translations', { language, error });
    return {};
  }
};

/**
 * Check if a language is supported
 * @param language Language code to check
 */
export const isSupportedLanguage = (language: string): language is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
};

/**
 * Get language from Accept-Language header
 * @param acceptLanguage Accept-Language header value
 */
export const getLanguageFromHeader = (acceptLanguage?: string): SupportedLanguage => {
  if (!acceptLanguage) {
    return DEFAULT_LANGUAGE;
  }

  // Parse Accept-Language header (e.g., 'en-US,en;q=0.9,es;q=0.8')
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';');
      const q = qValue ? parseFloat(qValue.split('=')[1]) : 1.0;
      // Extract base language code (e.g., 'en' from 'en-US')
      const baseCode = code.split('-')[0].toLowerCase();
      return { code: baseCode, q };
    })
    .sort((a, b) => b.q - a.q);

  // Find first supported language
  for (const { code } of languages) {
    if (isSupportedLanguage(code)) {
      return code;
    }
  }

  return DEFAULT_LANGUAGE;
};

/**
 * Get list of available languages with metadata
 */
export const getAvailableLanguages = (): Array<{
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}> => {
  return SUPPORTED_LANGUAGES.map(code => ({
    code,
    ...LANGUAGE_METADATA[code],
  }));
};

/**
 * Validate and sanitize language code
 * @param language Language code to validate
 */
export const validateLanguage = (language: string): SupportedLanguage => {
  const sanitized = language.toLowerCase().trim().substring(0, 5);
  return isSupportedLanguage(sanitized) ? sanitized : DEFAULT_LANGUAGE;
};

export default {
  initializeI18n,
  translate,
  getTranslations,
  isSupportedLanguage,
  getLanguageFromHeader,
  getAvailableLanguages,
  validateLanguage,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_METADATA,
};
