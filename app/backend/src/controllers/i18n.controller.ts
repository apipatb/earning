import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getAvailableLanguages,
  getTranslations,
  validateLanguage,
  isSupportedLanguage,
} from '../services/i18n.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/i18n/languages:
 *   get:
 *     summary: Get list of available languages
 *     tags: [I18n]
 *     responses:
 *       200:
 *         description: List of available languages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       nativeName:
 *                         type: string
 *                       flag:
 *                         type: string
 */
export const getLanguages = async (req: Request, res: Response): Promise<void> => {
  try {
    const languages = getAvailableLanguages();

    res.json({
      success: true,
      data: languages,
    });
  } catch (error) {
    logger.error('Error getting languages', { error });
    res.status(500).json({
      success: false,
      error: req.t('common.internalError'),
    });
  }
};

/**
 * @swagger
 * /api/v1/i18n/strings:
 *   get:
 *     summary: Get all translation strings for a language
 *     tags: [I18n]
 *     parameters:
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *         description: Language code (defaults to user's language or Accept-Language header)
 *     responses:
 *       200:
 *         description: Translation strings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 language:
 *                   type: string
 *                 data:
 *                   type: object
 */
export const getStrings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Use language from middleware (already handles query param, user pref, and header)
    const language = req.language;
    const translations = getTranslations(language);

    res.json({
      success: true,
      language,
      data: translations,
    });
  } catch (error) {
    logger.error('Error getting translation strings', { error });
    res.status(500).json({
      success: false,
      error: req.t('common.internalError'),
    });
  }
};

/**
 * @swagger
 * /api/v1/user/language:
 *   post:
 *     summary: Update user's language preference
 *     tags: [I18n, User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [en, es, fr, de, zh, ja, th]
 *     responses:
 *       200:
 *         description: Language preference updated
 *       400:
 *         description: Invalid language code
 *       401:
 *         description: Unauthorized
 */
export const updateUserLanguage = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        error: req.t('auth.unauthorized'),
      });
      return;
    }

    const { language } = req.body;

    // Validate language
    if (!language) {
      res.status(400).json({
        success: false,
        error: req.t('validation.required', { field: 'language' }),
      });
      return;
    }

    if (!isSupportedLanguage(language)) {
      res.status(400).json({
        success: false,
        error: 'Invalid language code. Supported languages: en, es, fr, de, zh, ja, th',
      });
      return;
    }

    // Update user's language preference
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { language: validateLanguage(language) },
      select: {
        id: true,
        email: true,
        name: true,
        language: true,
        timezone: true,
        currency: true,
      },
    });

    logger.info('User language preference updated', {
      userId: req.user.id,
      language: updatedUser.language,
    });

    res.json({
      success: true,
      message: req.t('user.languageUpdated'),
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating user language', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: req.t('common.internalError'),
    });
  }
};

export default {
  getLanguages,
  getStrings,
  updateUserLanguage,
};
