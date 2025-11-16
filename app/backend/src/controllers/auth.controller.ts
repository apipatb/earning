import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { TwoFactorService } from '../services/2fa.service';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string(),
});

export const register = async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Validate password strength
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Invalid Password',
        message: passwordValidation.message,
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User Exists',
        message: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Registration failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

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

    // Check if 2FA is enabled
    const twoFactorStatus = await TwoFactorService.getStatus(user.id);

    if (twoFactorStatus.enabled) {
      // Generate a temporary token for 2FA verification
      const tempToken = generateToken(user.id, user.email, '15m');

      // Send OTP for SMS/Email methods if enabled
      const enabledMethods = twoFactorStatus.methods.filter((m: any) => m.isEnabled);
      const smsMethod = enabledMethods.find((m: any) => m.type === 'SMS');
      const emailMethod = enabledMethods.find((m: any) => m.type === 'EMAIL');

      if (smsMethod) {
        await TwoFactorService.sendLoginCode(user.id, 'SMS');
      }
      if (emailMethod) {
        await TwoFactorService.sendLoginCode(user.id, 'EMAIL');
      }

      return res.status(200).json({
        requiresTwoFactor: true,
        tempToken,
        methods: twoFactorStatus.methods
          .filter((m: any) => m.isEnabled)
          .map((m: any) => ({
            type: m.type,
            phoneNumber: m.phoneNumber,
          })),
        message: '2FA verification required',
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Login failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
};
