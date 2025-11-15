import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, Language } from '../i18n/translations';

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set, get) => ({
      language: 'en',
      setLanguage: (lang: Language) => set({ language: lang }),
      t: (key: string) => {
        const { language } = get();
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
          value = value?.[k];
          if (value === undefined) {
            console.warn(`Translation key not found: ${key}`);
            return key;
          }
        }

        return value as string;
      },
    }),
    {
      name: 'earntrack-language',
    }
  )
);
