import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import twilio from 'twilio';
import { TwoFactorType, TwoFactorLogStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { EmailService } from './email.service';
import { logger } from '../utils/logger';

// Rate limiting: Track attempts per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// OTP cache for SMS and Email (temporary storage)
const otpCache = new Map<string, { otp: string; expiresAt: number; type: TwoFactorType }>();
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes

interface TwoFactorSetupResult {
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
  message?: string;
}

interface TwoFactorVerificationResult {
  success: boolean;
  message: string;
  usedBackupCode?: boolean;
}

export class TwoFactorService {
  private static twilioClient: twilio.Twilio;

  /**
   * Initialize Twilio client
   */
  static initialize(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      logger.info('Twilio client initialized for 2FA');
    }
  }

  /**
   * Get or create Twilio client
   */
  private static getTwilioClient(): twilio.Twilio {
    if (!this.twilioClient) {
      this.initialize();
    }
    return this.twilioClient;
  }

  /**
   * Check rate limit for user
   */
  private static checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      return true;
    }

    if (userLimit.count >= MAX_ATTEMPTS) {
      logger.warn('2FA rate limit exceeded', { userId });
      return false;
    }

    userLimit.count += 1;
    return true;
  }

  /**
   * Generate 8 random backup codes
   */
  private static async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hash backup codes for storage
   */
  private static async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      hashedCodes.push(hash);
    }
    return hashedCodes;
  }

  /**
   * Setup TOTP (Time-based OTP) authentication
   */
  static async setupTOTP(
    userId: string,
    userEmail: string
  ): Promise<TwoFactorSetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `EarnTrack (${userEmail})`,
        length: 32,
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      // Store in database (not enabled yet, needs verification)
      await prisma.twoFactorAuth.upsert({
        where: {
          userId_type: {
            userId,
            type: 'TOTP',
          },
        },
        create: {
          userId,
          type: 'TOTP',
          secret: secret.base32,
          isEnabled: false,
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
        update: {
          secret: secret.base32,
          isEnabled: false,
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      logger.info('TOTP setup initiated', { userId });

      return {
        qrCode,
        secret: secret.base32,
        backupCodes,
      };
    } catch (error) {
      logger.error('TOTP setup error:', error);
      throw new Error('Failed to setup TOTP authentication');
    }
  }

  /**
   * Setup SMS authentication
   */
  static async setupSMS(
    userId: string,
    phoneNumber: string
  ): Promise<TwoFactorSetupResult> {
    try {
      // Validate phone number format (E.164)
      if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
        throw new Error('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
      }

      // Generate backup codes
      const backupCodes = await this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      // Store in database
      await prisma.twoFactorAuth.upsert({
        where: {
          userId_type: {
            userId,
            type: 'SMS',
          },
        },
        create: {
          userId,
          type: 'SMS',
          phoneNumber,
          isEnabled: false,
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
        update: {
          phoneNumber,
          isEnabled: false,
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      // Send verification SMS
      const otp = this.generateOTP();
      await this.sendSMSOTP(userId, phoneNumber, otp);

      logger.info('SMS 2FA setup initiated', { userId, phoneNumber });

      return {
        backupCodes,
        message: 'Verification code sent to your phone',
      };
    } catch (error) {
      logger.error('SMS setup error:', error);
      throw new Error('Failed to setup SMS authentication');
    }
  }

  /**
   * Setup Email authentication
   */
  static async setupEmail(userId: string, email: string): Promise<TwoFactorSetupResult> {
    try {
      // Generate backup codes
      const backupCodes = await this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      // Store in database
      await prisma.twoFactorAuth.upsert({
        where: {
          userId_type: {
            userId,
            type: 'EMAIL',
          },
        },
        create: {
          userId,
          type: 'EMAIL',
          isEnabled: false,
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
        update: {
          isEnabled: false,
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      // Send verification email
      const otp = this.generateOTP();
      await this.sendEmailOTP(userId, email, otp);

      logger.info('Email 2FA setup initiated', { userId, email });

      return {
        backupCodes,
        message: 'Verification code sent to your email',
      };
    } catch (error) {
      logger.error('Email setup error:', error);
      throw new Error('Failed to setup Email authentication');
    }
  }

  /**
   * Generate 6-digit OTP
   */
  private static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send SMS OTP via Twilio
   */
  private static async sendSMSOTP(
    userId: string,
    phoneNumber: string,
    otp: string
  ): Promise<void> {
    try {
      const client = this.getTwilioClient();
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioPhoneNumber) {
        throw new Error('Twilio phone number not configured');
      }

      await client.messages.create({
        body: `Your EarnTrack verification code is: ${otp}. Valid for 10 minutes.`,
        from: twilioPhoneNumber,
        to: phoneNumber,
      });

      // Cache OTP
      const cacheKey = `${userId}:SMS`;
      otpCache.set(cacheKey, {
        otp,
        expiresAt: Date.now() + OTP_EXPIRY,
        type: 'SMS',
      });

      logger.info('SMS OTP sent', { userId, phoneNumber });
    } catch (error) {
      logger.error('SMS send error:', error);
      throw new Error('Failed to send SMS verification code');
    }
  }

  /**
   * Send Email OTP
   */
  private static async sendEmailOTP(
    userId: string,
    email: string,
    otp: string
  ): Promise<void> {
    try {
      await EmailService.sendEmail({
        to: email,
        subject: 'EarnTrack - Two-Factor Authentication Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">EarnTrack Security Code</h2>
            <p>Your two-factor authentication code is:</p>
            <div style="background-color: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #6B7280;">This code will expire in 10 minutes.</p>
            <p style="color: #6B7280; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
        userId,
      });

      // Cache OTP
      const cacheKey = `${userId}:EMAIL`;
      otpCache.set(cacheKey, {
        otp,
        expiresAt: Date.now() + OTP_EXPIRY,
        type: 'EMAIL',
      });

      logger.info('Email OTP sent', { userId, email });
    } catch (error) {
      logger.error('Email OTP send error:', error);
      throw new Error('Failed to send email verification code');
    }
  }

  /**
   * Verify OTP and enable 2FA
   */
  static async verifyAndEnable(
    userId: string,
    type: TwoFactorType,
    code: string
  ): Promise<TwoFactorVerificationResult> {
    try {
      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        return {
          success: false,
          message: 'Too many attempts. Please try again in 15 minutes.',
        };
      }

      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
      });

      if (!twoFactorAuth) {
        return {
          success: false,
          message: '2FA not set up for this method',
        };
      }

      let isValid = false;

      if (type === 'TOTP') {
        // Verify TOTP code
        isValid = speakeasy.totp.verify({
          secret: twoFactorAuth.secret || '',
          encoding: 'base32',
          token: code,
          window: 2, // Allow 2 time steps before/after
        });
      } else {
        // Verify SMS/Email OTP
        const cacheKey = `${userId}:${type}`;
        const cached = otpCache.get(cacheKey);

        if (!cached) {
          return {
            success: false,
            message: 'Verification code expired or not found',
          };
        }

        if (Date.now() > cached.expiresAt) {
          otpCache.delete(cacheKey);
          return {
            success: false,
            message: 'Verification code expired',
          };
        }

        isValid = cached.otp === code;
        if (isValid) {
          otpCache.delete(cacheKey);
        }
      }

      if (isValid) {
        // Enable 2FA
        await prisma.twoFactorAuth.update({
          where: {
            userId_type: {
              userId,
              type,
            },
          },
          data: {
            isEnabled: true,
            verifiedAt: new Date(),
          },
        });

        logger.info('2FA enabled', { userId, type });

        return {
          success: true,
          message: 'Two-factor authentication enabled successfully',
        };
      }

      return {
        success: false,
        message: 'Invalid verification code',
      };
    } catch (error) {
      logger.error('2FA verification error:', error);
      return {
        success: false,
        message: 'Verification failed',
      };
    }
  }

  /**
   * Verify 2FA code during login
   */
  static async verify(
    userId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TwoFactorVerificationResult> {
    try {
      // Check rate limit
      if (!this.checkRateLimit(userId)) {
        await this.logAttempt(userId, 'TOTP', 'FAILED', ipAddress, userAgent);
        return {
          success: false,
          message: 'Too many attempts. Please try again in 15 minutes.',
        };
      }

      // Get all enabled 2FA methods
      const twoFactorMethods = await prisma.twoFactorAuth.findMany({
        where: {
          userId,
          isEnabled: true,
        },
      });

      if (twoFactorMethods.length === 0) {
        return {
          success: false,
          message: 'Two-factor authentication not enabled',
        };
      }

      // Try each enabled method
      for (const method of twoFactorMethods) {
        let isValid = false;

        if (method.type === 'TOTP') {
          isValid = speakeasy.totp.verify({
            secret: method.secret || '',
            encoding: 'base32',
            token: code,
            window: 2,
          });

          if (isValid) {
            await this.logAttempt(userId, method.type, 'SUCCESS', ipAddress, userAgent);
            return {
              success: true,
              message: 'Authentication successful',
            };
          }
        } else {
          // Check SMS/Email OTP cache
          const cacheKey = `${userId}:${method.type}`;
          const cached = otpCache.get(cacheKey);

          if (cached && Date.now() <= cached.expiresAt && cached.otp === code) {
            otpCache.delete(cacheKey);
            await this.logAttempt(userId, method.type, 'SUCCESS', ipAddress, userAgent);
            return {
              success: true,
              message: 'Authentication successful',
            };
          }
        }
      }

      // Check backup codes
      for (const method of twoFactorMethods) {
        if (method.backupCodes) {
          const hashedCodes = JSON.parse(method.backupCodes) as string[];

          for (let i = 0; i < hashedCodes.length; i++) {
            const isMatch = await bcrypt.compare(code, hashedCodes[i]);

            if (isMatch) {
              // Remove used backup code
              hashedCodes.splice(i, 1);
              await prisma.twoFactorAuth.update({
                where: { id: method.id },
                data: { backupCodes: JSON.stringify(hashedCodes) },
              });

              await this.logAttempt(userId, method.type, 'SUCCESS', ipAddress, userAgent);

              return {
                success: true,
                message: 'Authentication successful (backup code used)',
                usedBackupCode: true,
              };
            }
          }
        }
      }

      await this.logAttempt(userId, 'TOTP', 'FAILED', ipAddress, userAgent);
      return {
        success: false,
        message: 'Invalid authentication code',
      };
    } catch (error) {
      logger.error('2FA verification error:', error);
      return {
        success: false,
        message: 'Verification failed',
      };
    }
  }

  /**
   * Send 2FA code for login
   */
  static async sendLoginCode(userId: string, type: TwoFactorType): Promise<boolean> {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
        include: {
          user: true,
        },
      });

      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        return false;
      }

      const otp = this.generateOTP();

      if (type === 'SMS' && twoFactorAuth.phoneNumber) {
        await this.sendSMSOTP(userId, twoFactorAuth.phoneNumber, otp);
      } else if (type === 'EMAIL') {
        await this.sendEmailOTP(userId, twoFactorAuth.user.email, otp);
      } else {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Send login code error:', error);
      return false;
    }
  }

  /**
   * Disable 2FA for a method
   */
  static async disable(userId: string, type: TwoFactorType, code: string): Promise<boolean> {
    try {
      // Verify code first
      const verification = await this.verify(userId, code);

      if (!verification.success) {
        return false;
      }

      await prisma.twoFactorAuth.update({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
        data: {
          isEnabled: false,
        },
      });

      logger.info('2FA disabled', { userId, type });
      return true;
    } catch (error) {
      logger.error('2FA disable error:', error);
      return false;
    }
  }

  /**
   * Get 2FA status for user
   */
  static async getStatus(userId: string): Promise<any> {
    const methods = await prisma.twoFactorAuth.findMany({
      where: { userId },
      select: {
        type: true,
        isEnabled: true,
        verifiedAt: true,
        phoneNumber: true,
        createdAt: true,
      },
    });

    return {
      enabled: methods.some((m) => m.isEnabled),
      methods: methods.map((m) => ({
        type: m.type,
        isEnabled: m.isEnabled,
        verifiedAt: m.verifiedAt,
        phoneNumber: m.type === 'SMS' ? m.phoneNumber : undefined,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Regenerate backup codes
   */
  static async regenerateBackupCodes(
    userId: string,
    type: TwoFactorType
  ): Promise<string[]> {
    try {
      const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
      });

      if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
        throw new Error('2FA not enabled for this method');
      }

      const backupCodes = await this.generateBackupCodes();
      const hashedBackupCodes = await this.hashBackupCodes(backupCodes);

      await prisma.twoFactorAuth.update({
        where: {
          userId_type: {
            userId,
            type,
          },
        },
        data: {
          backupCodes: JSON.stringify(hashedBackupCodes),
        },
      });

      logger.info('Backup codes regenerated', { userId, type });
      return backupCodes;
    } catch (error) {
      logger.error('Backup codes regeneration error:', error);
      throw new Error('Failed to regenerate backup codes');
    }
  }

  /**
   * Get 2FA logs for user
   */
  static async getLogs(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<any> {
    const logs = await prisma.twoFactorLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.twoFactorLog.count({
      where: { userId },
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        method: log.method,
        status: log.status,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      total,
      hasMore: total > offset + limit,
    };
  }

  /**
   * Log 2FA attempt
   */
  private static async logAttempt(
    userId: string,
    method: TwoFactorType,
    status: TwoFactorLogStatus,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.twoFactorLog.create({
        data: {
          userId,
          method,
          status,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      logger.error('Failed to log 2FA attempt:', error);
    }
  }
}
