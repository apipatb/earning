import React, { useState } from 'react';
import { useI18n } from '../hooks/useI18n';
import type { SupportedLanguage } from '../i18n/config';

interface LanguageSwitcherProps {
  className?: string;
  showFlags?: boolean;
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  showFlags = true,
  compact = false,
}) => {
  const { currentLanguage, getAvailableLanguages, changeLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const languages = getAvailableLanguages();

  const handleLanguageChange = async (languageCode: SupportedLanguage) => {
    setIsLoading(true);
    try {
      const success = await changeLanguage(languageCode);
      if (success) {
        setIsOpen(false);
        // Show success notification if you have a notification system
        console.log(t('notifications.languageChanged'));
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <div className={`relative ${className}`}>
      {/* Language Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {showFlags && currentLang && (
          <span className="text-xl" role="img" aria-label={currentLang.name}>
            {currentLang.flag}
          </span>
        )}
        {!compact && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentLang?.nativeName || currentLanguage.toUpperCase()}
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-80 overflow-y-auto">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    language.isCurrent
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {showFlags && (
                    <span className="text-2xl" role="img" aria-label={language.name}>
                      {language.flag}
                    </span>
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{language.nativeName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {language.name}
                    </div>
                  </div>
                  {language.isCurrent && (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
