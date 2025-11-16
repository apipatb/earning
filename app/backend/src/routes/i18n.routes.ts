import { Router } from 'express';
import { getLanguages, getStrings } from '../controllers/i18n.controller';

const router = Router();

/**
 * @route GET /api/v1/i18n/languages
 * @desc Get list of available languages
 * @access Public
 */
router.get('/languages', getLanguages);

/**
 * @route GET /api/v1/i18n/strings
 * @desc Get all translation strings for a language
 * @access Public
 */
router.get('/strings', getStrings);

export default router;
