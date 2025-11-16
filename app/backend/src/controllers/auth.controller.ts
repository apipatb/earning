import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { logInfo, logDebug, logError, logWarn } from '../lib/logger';
import { RegisterInputSchema, LoginInputSchema } from '../schemas/validation.schemas';
import { validateRequest, ValidationException } from '../utils/validate-request.util';

export const register = async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'unknown';

  try {
    // Validate request using centralized schema
    const data = await validateRequest(req.body, RegisterInputSchema);
    logDebug('Registration request received', {
      requestId,
      email: data.email,
    });

    // Validate password strength
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      logWarn('Weak password provided', {
        requestId,
        email: data.email,
        reason: passwordValidation.message,
      });
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
      logWarn('Registration attempt with existing email', {
        requestId,
        email: data.email,
        userId: existingUser.id,
      });
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

    logInfo('User registered successfully', {
      requestId,
      userId: user.id,
      email: user.email,
    });

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error during registration', {
        requestId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Registration validation failed',
        errors: error.errors,
      });
    }
    logError('Registration error', error, {
      requestId,
      email: req.body?.email,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || 'unknown';

  try {
    // Validate request using centralized schema
    const data = await validateRequest(req.body, LoginInputSchema);
    logDebug('Login request received', {
      requestId,
      email: data.email,
    });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      logWarn('Login attempt with non-existent email', {
        requestId,
        email: data.email,
      });
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password incorrect',
      });
    }

    // Verify password
    const isValid = await comparePassword(data.password, user.passwordHash);

    if (!isValid) {
      logWarn('Login attempt with incorrect password', {
        requestId,
        userId: user.id,
        email: user.email,
      });
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Email or password incorrect',
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    logInfo('User logged in successfully', {
      requestId,
      userId: user.id,
      email: user.email,
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error during login', {
        requestId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Login validation failed',
        errors: error.errors,
      });
    }
    logError('Login error', error, {
      requestId,
      email: req.body?.email,
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
    });
  }
};
