import { Request, Response, NextFunction } from 'express';
import {
  getLanguageFromHeader,
  validateLanguage,
  translate,
  DEFAULT_LANGUAGE,
  SupportedLanguage,
} from '../services/i18n.service';
import { logger } from '../utils/logger';

// Extend Express Request to include i18n properties
declare global {
  namespace Express {
    interface Request {
      language: SupportedLanguage;
      t: (key: string, options?: Record<string, string | number>) => string;
    }
  }
}

/**
 * Middleware to detect and set language for the request
 * Priority:
 * 1. User's saved language preference (from database)
 * 2. Query parameter (?lang=es)
 * 3. Accept-Language header
 * 4. Default language (en)
 */
export const i18nMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let language: SupportedLanguage = DEFAULT_LANGUAGE;

    // 1. Check query parameter
    if (req.query.lang && typeof req.query.lang === 'string') {
      language = validateLanguage(req.query.lang);
      logger.debug('Language set from query parameter', { language });
    }
    // 2. Check user preference (if user is authenticated)
    else if (req.user && 'language' in req.user && typeof req.user.language === 'string') {
      language = validateLanguage(req.user.language);
      logger.debug('Language set from user preference', { language, userId: req.user.id });
    }
    // 3. Check Accept-Language header
    else if (req.headers['accept-language']) {
      language = getLanguageFromHeader(req.headers['accept-language']);
      logger.debug('Language set from Accept-Language header', { language });
    }

    // Attach language to request
    req.language = language;

    // Attach translation function to request
    req.t = (key: string, options?: Record<string, string | number>) => {
      return translate(key, language, options);
    };

    // Set Content-Language response header
    res.setHeader('Content-Language', language);

    next();
  } catch (error) {
    logger.error('Error in i18n middleware', { error });
    // Continue with default language if there's an error
    req.language = DEFAULT_LANGUAGE;
    req.t = (key: string, options?: Record<string, string | number>) => {
      return translate(key, DEFAULT_LANGUAGE, options);
    };
    next();
  }
};

/**
 * Middleware to validate language parameter in request body
 * Use this in routes that accept language in the request body
 */
export const validateLanguageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body.language) {
    req.body.language = validateLanguage(req.body.language);
  }
  next();
};

export default i18nMiddleware;
