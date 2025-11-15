import { Router } from 'express';
import {
  getSupportedLanguages,
  getUserLanguagePreference,
  setUserLanguagePreference,
  getTranslations,
  getTranslation,
  addTranslation,
  getLanguageStats,
  getRegionalSettings,
  exportTranslations,
  importTranslations,
  getPluralRules,
  formatNumber,
  formatDate,
} from '../controllers/localization.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Languages
router.get('/languages', getSupportedLanguages);

// User Language Preferences
router.get('/preferences', auth, getUserLanguagePreference);
router.put('/preferences', auth, setUserLanguagePreference);

// Translations
router.get('/translations', getTranslations);
router.get('/translations/:language/:key', getTranslation);
router.post('/translations', auth, addTranslation);

// Language Stats
router.get('/stats', auth, getLanguageStats);

// Regional Settings
router.get('/regional/:language', getRegionalSettings);

// Import/Export
router.get('/export', auth, exportTranslations);
router.post('/import', auth, importTranslations);

// Pluralization Rules
router.get('/plurals', getPluralRules);

// Formatting
router.get('/format/number', formatNumber);
router.get('/format/date', formatDate);

export default router;
