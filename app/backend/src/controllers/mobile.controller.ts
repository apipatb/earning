import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { comparePassword } from '../utils/password';
import { generateToken, verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

const mobileLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  pushToken: z.string().optional(),
});

/**
 * Mobile-specific login endpoint
 * Supports device registration and push notifications
 */
export const mobileLogin = async (req: Request, res: Response) => {
  try {
    const data = mobileLoginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password incorrect',
      });
    }

    // Verify password
    const isValid = await comparePassword(data.password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password incorrect',
      });
    }

    // Generate token with longer expiration for mobile
    const token = generateToken(user.id, user.email, '30d');

    // Store device information if provided
    if (data.deviceId) {
      try {
        await prisma.$executeRaw`
          INSERT INTO user_devices (user_id, device_id, device_name, push_token, last_active)
          VALUES (${user.id}, ${data.deviceId}, ${data.deviceName || 'Mobile Device'}, ${data.pushToken}, NOW())
          ON CONFLICT (user_id, device_id)
          DO UPDATE SET
            device_name = ${data.deviceName || 'Mobile Device'},
            push_token = ${data.pushToken},
            last_active = NOW()
        `;
      } catch (error) {
        // Log error but don't fail the login
        logger.warn('Failed to store device information', { error, userId: user.id });
      }
    }

    logger.info('Mobile login successful', {
      userId: user.id,
      deviceId: data.deviceId,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      expiresIn: '30d',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Mobile login failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
};

/**
 * Deep link handler for magic link authentication
 * Allows users to log in via deep links from emails
 */
export const handleDeepLink = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        error: 'Invalid Request',
        message: 'Token is required',
      });
    }

    // Verify the deep link token
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Deep link token is invalid or expired',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User does not exist',
      });
    }

    // Generate a new long-lived token for mobile
    const newToken = generateToken(user.id, user.email, '30d');

    logger.info('Deep link authentication successful', {
      userId: user.id,
    });

    res.json({
      user,
      token: newToken,
      expiresIn: '30d',
    });
  } catch (error) {
    logger.error('Deep link authentication failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

/**
 * Get mobile app configuration
 * Returns app settings, feature flags, and API version
 */
export const getMobileConfig = async (req: Request, res: Response) => {
  try {
    const config = {
      apiVersion: 'v1',
      minAppVersion: '1.0.0',
      features: {
        biometricAuth: true,
        pushNotifications: true,
        offlineMode: true,
        cameraUpload: true,
        chatSupport: true,
        ticketManagement: true,
      },
      endpoints: {
        api: process.env.API_URL || 'http://localhost:3001/api/v1',
        websocket: process.env.WS_URL || 'ws://localhost:3001',
      },
      settings: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        offlineSyncInterval: 300000, // 5 minutes
      },
      theme: {
        primaryColor: '#007AFF',
        secondaryColor: '#5856D6',
        accentColor: '#FF9500',
      },
    };

    res.json(config);
  } catch (error) {
    logger.error('Failed to get mobile config', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve configuration',
    });
  }
};

/**
 * Register device for push notifications
 */
export const registerDevice = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      deviceId: z.string(),
      deviceName: z.string(),
      pushToken: z.string(),
      platform: z.enum(['ios', 'android']),
    });

    const data = schema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    await prisma.$executeRaw`
      INSERT INTO user_devices (user_id, device_id, device_name, push_token, platform, last_active)
      VALUES (${userId}, ${data.deviceId}, ${data.deviceName}, ${data.pushToken}, ${data.platform}, NOW())
      ON CONFLICT (user_id, device_id)
      DO UPDATE SET
        device_name = ${data.deviceName},
        push_token = ${data.pushToken},
        platform = ${data.platform},
        last_active = NOW()
    `;

    logger.info('Device registered successfully', {
      userId,
      deviceId: data.deviceId,
      platform: data.platform,
    });

    res.json({
      message: 'Device registered successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Device registration failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Device registration failed',
    });
  }
};
