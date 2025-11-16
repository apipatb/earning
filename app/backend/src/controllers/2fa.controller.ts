import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { TwoFactorService } from '../services/2fa.service';
import { logger } from '../utils/logger';

const setupTOTPSchema = z.object({
  email: z.string().email(),
});

const setupSMSSchema = z.object({
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)'),
});

const setupEmailSchema = z.object({
  email: z.string().email(),
});

const verifyEnableSchema = z.object({
  type: z.enum(['TOTP', 'SMS', 'EMAIL']),
  code: z.string().length(6, 'Code must be 6 digits'),
});

const verifySchema = z.object({
  code: z.string().min(6, 'Code must be at least 6 characters'),
});

const disableSchema = z.object({
  type: z.enum(['TOTP', 'SMS', 'EMAIL']),
  code: z.string().min(6, 'Code must be at least 6 characters'),
});

const regenerateBackupCodesSchema = z.object({
  type: z.enum(['TOTP', 'SMS', 'EMAIL']),
});

const sendCodeSchema = z.object({
  type: z.enum(['SMS', 'EMAIL']),
});

/**
 * Setup TOTP (Authenticator App) 2FA
 * POST /api/v1/auth/2fa/setup/totp
 */
export const setupTOTP = async (req: AuthRequest, res: Response) => {
  try {
    const data = setupTOTPSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const result = await TwoFactorService.setupTOTP(userId, data.email);

    res.json({
      message: 'TOTP setup successful',
      qrCode: result.qrCode,
      secret: result.secret,
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('TOTP setup error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to setup TOTP',
    });
  }
};

/**
 * Setup SMS 2FA
 * POST /api/v1/auth/2fa/setup/sms
 */
export const setupSMS = async (req: AuthRequest, res: Response) => {
  try {
    const data = setupSMSSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const result = await TwoFactorService.setupSMS(userId, data.phoneNumber);

    res.json({
      message: result.message,
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('SMS setup error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to setup SMS',
    });
  }
};

/**
 * Setup Email 2FA
 * POST /api/v1/auth/2fa/setup/email
 */
export const setupEmail = async (req: AuthRequest, res: Response) => {
  try {
    const data = setupEmailSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const result = await TwoFactorService.setupEmail(userId, data.email);

    res.json({
      message: result.message,
      backupCodes: result.backupCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Email setup error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to setup Email 2FA',
    });
  }
};

/**
 * Verify and enable 2FA
 * POST /api/v1/auth/2fa/enable
 */
export const verifyAndEnable = async (req: AuthRequest, res: Response) => {
  try {
    const data = verifyEnableSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const result = await TwoFactorService.verifyAndEnable(userId, data.type, data.code);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('2FA enable error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to enable 2FA',
    });
  }
};

/**
 * Verify 2FA code during login
 * POST /api/v1/auth/2fa/verify
 */
export const verify = async (req: AuthRequest, res: Response) => {
  try {
    const data = verifySchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await TwoFactorService.verify(
      userId,
      data.code,
      ipAddress,
      userAgent
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        usedBackupCode: result.usedBackupCode,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('2FA verify error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Verification failed',
    });
  }
};

/**
 * Send 2FA code for login (SMS/Email only)
 * POST /api/v1/auth/2fa/send-code
 */
export const sendCode = async (req: AuthRequest, res: Response) => {
  try {
    const data = sendCodeSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const sent = await TwoFactorService.sendLoginCode(userId, data.type);

    if (sent) {
      res.json({
        success: true,
        message: 'Verification code sent',
      });
    } else {
      res.status(400).json({
        success: false,
        message: '2FA not enabled for this method',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Send code error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send code',
    });
  }
};

/**
 * Disable 2FA
 * POST /api/v1/auth/2fa/disable
 */
export const disable = async (req: AuthRequest, res: Response) => {
  try {
    const data = disableSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const disabled = await TwoFactorService.disable(userId, data.type, data.code);

    if (disabled) {
      res.json({
        success: true,
        message: '2FA disabled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to disable 2FA. Invalid code.',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('2FA disable error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disable 2FA',
    });
  }
};

/**
 * Get 2FA status
 * GET /api/v1/auth/2fa/status
 */
export const getStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const status = await TwoFactorService.getStatus(userId);

    res.json(status);
  } catch (error) {
    logger.error('Get 2FA status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get 2FA status',
    });
  }
};

/**
 * Regenerate backup codes
 * POST /api/v1/auth/2fa/backup-codes
 */
export const regenerateBackupCodes = async (req: AuthRequest, res: Response) => {
  try {
    const data = regenerateBackupCodesSchema.parse(req.body);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const backupCodes = await TwoFactorService.regenerateBackupCodes(userId, data.type);

    res.json({
      success: true,
      backupCodes,
      message: 'Backup codes regenerated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Regenerate backup codes error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to regenerate backup codes',
    });
  }
};

/**
 * Get 2FA logs
 * GET /api/v1/auth/2fa/logs
 */
export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await TwoFactorService.getLogs(userId, limit, offset);

    res.json(logs);
  } catch (error) {
    logger.error('Get 2FA logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get 2FA logs',
    });
  }
};
