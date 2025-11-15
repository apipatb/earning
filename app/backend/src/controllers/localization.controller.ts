import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Supported Languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
];

// Get Supported Languages
export const getSupportedLanguages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(SUPPORTED_LANGUAGES);
  } catch (error) {
    next(error);
  }
};

// Get User Language Preference
export const getUserLanguagePreference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;

    const preference = await prisma.languagePreference.findUnique({
      where: { userId },
    });

    res.json({
      language: preference?.language || 'en',
      dateFormat: preference?.dateFormat || 'MM/DD/YYYY',
      timeFormat: preference?.timeFormat || '12h',
      timezone: preference?.timezone || 'UTC',
      currency: preference?.currency || 'USD',
    });
  } catch (error) {
    next(error);
  }
};

// Set User Language Preference
export const setUserLanguagePreference = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const { language, dateFormat, timeFormat, timezone, currency } = req.body;

    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    // Verify language is supported
    if (!SUPPORTED_LANGUAGES.find((l) => l.code === language)) {
      return res.status(400).json({ error: 'Unsupported language' });
    }

    const preference = await prisma.languagePreference.upsert({
      where: { userId },
      update: {
        language,
        dateFormat: dateFormat || undefined,
        timeFormat: timeFormat || undefined,
        timezone: timezone || undefined,
        currency: currency || undefined,
        updatedAt: new Date(),
      },
      create: {
        userId,
        language,
        dateFormat: dateFormat || 'MM/DD/YYYY',
        timeFormat: timeFormat || '12h',
        timezone: timezone || 'UTC',
        currency: currency || 'USD',
      },
    });

    res.json(preference);
  } catch (error) {
    next(error);
  }
};

// Get Translations
export const getTranslations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language = 'en' } = req.query;

    const translations = await prisma.translation.findMany({
      where: { language: language as string },
    });

    // Format as key-value object
    const translationMap: { [key: string]: string } = {};
    translations.forEach((t) => {
      translationMap[t.key] = t.value;
    });

    res.json(translationMap);
  } catch (error) {
    next(error);
  }
};

// Get Specific Translation
export const getTranslation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language, key } = req.params;

    const translation = await prisma.translation.findUnique({
      where: {
        language_key: {
          language,
          key,
        },
      },
    });

    res.json({
      key,
      value: translation?.value || key,
    });
  } catch (error) {
    next(error);
  }
};

// Add Translation
export const addTranslation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language, key, value, context } = req.body;

    if (!language || !key || !value) {
      return res.status(400).json({ error: 'Language, key, and value are required' });
    }

    const translation = await prisma.translation.upsert({
      where: {
        language_key: {
          language,
          key,
        },
      },
      update: {
        value,
        context: context || undefined,
        updatedAt: new Date(),
      },
      create: {
        language,
        key,
        value,
        context: context || undefined,
      },
    });

    res.status(201).json(translation);
  } catch (error) {
    next(error);
  }
};

// Get Language Statistics
export const getLanguageStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await Promise.all(
      SUPPORTED_LANGUAGES.map(async (lang) => {
        const count = await prisma.translation.count({
          where: { language: lang.code },
        });

        const userCount = await prisma.languagePreference.count({
          where: { language: lang.code },
        });

        return {
          language: lang.code,
          name: lang.name,
          translationCount: count,
          userCount,
          completeness: count > 0 ? (count / 100) * 100 : 0, // Assuming 100 keys needed
        };
      })
    );

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Get Regional Settings
export const getRegionalSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language } = req.query;

    const settings = await prisma.regionalSetting.findUnique({
      where: { languageCode: language as string },
    });

    if (!settings) {
      return res.json(getDefaultRegionalSettings(language as string));
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Helper function for default regional settings
function getDefaultRegionalSettings(language: string) {
  const defaults: { [key: string]: any } = {
    en: {
      languageCode: 'en',
      country: 'US',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencySymbol: '$',
      currencyPosition: 'prefix',
      weekStartDay: 0, // Sunday
    },
    es: {
      languageCode: 'es',
      country: 'ES',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      decimalSeparator: ',',
      thousandsSeparator: '.',
      currencySymbol: '€',
      currencyPosition: 'suffix',
      weekStartDay: 1,
    },
    fr: {
      languageCode: 'fr',
      country: 'FR',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      decimalSeparator: ',',
      thousandsSeparator: ' ',
      currencySymbol: '€',
      currencyPosition: 'suffix',
      weekStartDay: 1,
    },
    de: {
      languageCode: 'de',
      country: 'DE',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
      decimalSeparator: ',',
      thousandsSeparator: '.',
      currencySymbol: '€',
      currencyPosition: 'suffix',
      weekStartDay: 1,
    },
    ja: {
      languageCode: 'ja',
      country: 'JP',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencySymbol: '¥',
      currencyPosition: 'prefix',
      weekStartDay: 0,
    },
    zh: {
      languageCode: 'zh',
      country: 'CN',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      currencySymbol: '¥',
      currencyPosition: 'prefix',
      weekStartDay: 0,
    },
  };

  return defaults[language] || defaults['en'];
}

// Export Translations for All Languages
export const exportTranslations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { format = 'json' } = req.query;

    const allTranslations = await prisma.translation.findMany({
      orderBy: [{ language: 'asc' }, { key: 'asc' }],
    });

    const grouped: { [key: string]: { [key: string]: string } } = {};
    allTranslations.forEach((t) => {
      if (!grouped[t.language]) {
        grouped[t.language] = {};
      }
      grouped[t.language][t.key] = t.value;
    });

    if (format === 'json') {
      res.json(grouped);
    } else if (format === 'csv') {
      let csv = 'Language,Key,Value\n';
      allTranslations.forEach((t) => {
        csv += `${t.language},"${t.key}","${t.value.replace(/"/g, '""')}"\n`;
      });
      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', 'attachment; filename="translations.csv"');
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
};

// Import Translations
export const importTranslations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { translations } = req.body;

    if (!translations || typeof translations !== 'object') {
      return res.status(400).json({ error: 'Translations object is required' });
    }

    let importedCount = 0;

    for (const language in translations) {
      const languageTranslations = translations[language];

      for (const key in languageTranslations) {
        await prisma.translation.upsert({
          where: {
            language_key: {
              language,
              key,
            },
          },
          update: {
            value: languageTranslations[key],
          },
          create: {
            language,
            key,
            value: languageTranslations[key],
          },
        });
        importedCount++;
      }
    }

    res.json({
      message: `Imported ${importedCount} translations`,
      count: importedCount,
    });
  } catch (error) {
    next(error);
  }
};

// Pluralization Rules
export const getPluralRules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language = 'en' } = req.query;

    const pluralRules: { [key: string]: any } = {
      en: {
        rule: (n: number) => (n === 1 ? 'singular' : 'plural'),
        forms: ['singular', 'plural'],
      },
      es: {
        rule: (n: number) => (n === 1 ? 'singular' : 'plural'),
        forms: ['singular', 'plural'],
      },
      fr: {
        rule: (n: number) => (n === 0 || n === 1 ? 'singular' : 'plural'),
        forms: ['singular', 'plural'],
      },
      ja: {
        rule: (n: number) => 'singular', // Japanese doesn't have plurals
        forms: ['singular'],
      },
      ru: {
        rule: (n: number) => {
          const mod10 = n % 10;
          const mod100 = n % 100;
          if (mod10 === 1 && mod100 !== 11) return 'one';
          if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'few';
          return 'other';
        },
        forms: ['one', 'few', 'other'],
      },
    };

    const rules = pluralRules[language as string] || pluralRules['en'];

    res.json({
      language,
      forms: rules.forms,
      description: `Pluralization rules for ${language}`,
    });
  } catch (error) {
    next(error);
  }
};

// Format Number Localized
export const formatNumber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language, number } = req.query;

    if (!language || !number) {
      return res.status(400).json({ error: 'Language and number are required' });
    }

    const settings = getDefaultRegionalSettings(language as string);
    const num = parseFloat(number as string);

    const formatted = new Intl.NumberFormat(language as string, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);

    res.json({
      original: num,
      formatted,
      language,
    });
  } catch (error) {
    next(error);
  }
};

// Format Date Localized
export const formatDate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { language, date } = req.query;

    if (!language || !date) {
      return res.status(400).json({ error: 'Language and date are required' });
    }

    const dateObj = new Date(date as string);

    const formatted = new Intl.DateTimeFormat(language as string, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);

    res.json({
      original: date,
      formatted,
      language,
    });
  } catch (error) {
    next(error);
  }
};
