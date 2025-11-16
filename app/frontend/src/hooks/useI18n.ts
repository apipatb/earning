import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import axios from 'axios';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '../i18n/config';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useI18n = () => {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language as SupportedLanguage;

  /**
   * Change the application language
   * @param language Language code to switch to
   * @param persist Whether to save to backend (requires authentication)
   */
  const changeLanguage = useCallback(async (language: SupportedLanguage, persist: boolean = true) => {
    try {
      // Change language in i18next
      await i18n.changeLanguage(language);

      // Persist to backend if user is authenticated
      if (persist) {
        const token = localStorage.getItem('token');
        if (token) {
          await axios.post(
            `${API_URL}/api/v1/user/language`,
            { language },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to change language:', error);
      return false;
    }
  }, [i18n]);

  /**
   * Get all available languages with metadata
   */
  const getAvailableLanguages = useCallback(() => {
    return SUPPORTED_LANGUAGES.map(code => ({
      code,
      ...LANGUAGE_NAMES[code],
      isCurrent: code === currentLanguage,
    }));
  }, [currentLanguage]);

  /**
   * Get current language metadata
   */
  const getCurrentLanguage = useCallback(() => {
    return {
      code: currentLanguage,
      ...LANGUAGE_NAMES[currentLanguage],
    };
  }, [currentLanguage]);

  /**
   * Check if a language is supported
   */
  const isSupported = useCallback((language: string): language is SupportedLanguage => {
    return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
  }, []);

  /**
   * Translate with interpolation support
   */
  const translate = useCallback((key: string, options?: Record<string, string | number>) => {
    return t(key, options);
  }, [t]);

  return {
    // Translation function
    t: translate,

    // Current language
    currentLanguage,
    language: currentLanguage,

    // Language operations
    changeLanguage,
    setLanguage: changeLanguage,

    // Language metadata
    getAvailableLanguages,
    getCurrentLanguage,
    isSupported,

    // Available languages
    languages: SUPPORTED_LANGUAGES,
    languageNames: LANGUAGE_NAMES,

    // i18n instance (for advanced usage)
    i18n,
  };
};

export default useI18n;
