import { Request, Response } from 'express';
import { z } from 'zod';
import {
  generateRegistrationOptionsService,
  verifyRegistrationResponseService,
  generateAuthenticationOptionsService,
  verifyAuthenticationResponseService,
  getCredentialsService,
  deleteCredentialService,
} from '../services/webauthn.service';
import { generateToken } from '../utils/jwt';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// Validation schemas
const registrationOptionsSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string(),
  userDisplayName: z.string(),
});

const verifyRegistrationSchema = z.object({
  userId: z.string().uuid(),
  response: z.any(), // RegistrationResponseJSON from SimpleWebAuthn
  expectedChallenge: z.string(),
  nickname: z.string().optional(),
});

const authenticationOptionsSchema = z.object({
  userId: z.string().uuid().optional(),
});

const verifyAuthenticationSchema = z.object({
  response: z.any(), // AuthenticationResponseJSON from SimpleWebAuthn
  expectedChallenge: z.string(),
});

const deleteCredentialSchema = z.object({
  credentialId: z.string().uuid(),
});

/**
 * POST /api/v1/auth/webauthn/register/options
 * Generate registration options for WebAuthn credential
 */
export const getRegistrationOptions = async (req: Request, res: Response) => {
  try {
    const data = registrationOptionsSchema.parse(req.body);

    const options = await generateRegistrationOptionsService({
      userId: data.userId,
      userName: data.userName,
      userDisplayName: data.userDisplayName,
    });

    res.json({
      options,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Failed to get registration options', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate registration options',
    });
  }
};

/**
 * POST /api/v1/auth/webauthn/register/verify
 * Verify WebAuthn registration response
 */
export const verifyRegistration = async (req: Request, res: Response) => {
  try {
    const data = verifyRegistrationSchema.parse(req.body);

    const result = await verifyRegistrationResponseService({
      userId: data.userId,
      response: data.response,
      expectedChallenge: data.expectedChallenge,
      nickname: data.nickname,
    });

    if (!result.verified) {
      return res.status(400).json({
        error: 'Verification Failed',
        message: 'Failed to verify credential',
      });
    }

    res.json({
      verified: true,
      credentialId: result.credentialId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Failed to verify registration', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify registration',
    });
  }
};

/**
 * POST /api/v1/auth/webauthn/authenticate/options
 * Generate authentication options for WebAuthn login
 */
export const getAuthenticationOptions = async (req: Request, res: Response) => {
  try {
    const data = authenticationOptionsSchema.parse(req.body);

    const options = await generateAuthenticationOptionsService({
      userId: data.userId,
    });

    res.json({
      options,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Failed to get authentication options', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate authentication options',
    });
  }
};

/**
 * POST /api/v1/auth/webauthn/authenticate/verify
 * Verify WebAuthn authentication response and login user
 */
export const verifyAuthentication = async (req: Request, res: Response) => {
  try {
    const data = verifyAuthenticationSchema.parse(req.body);

    const result = await verifyAuthenticationResponseService({
      response: data.response,
      expectedChallenge: data.expectedChallenge,
    });

    if (!result.verified || !result.userId) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Failed to authenticate with credential',
      });
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User Not Found',
        message: 'User not found',
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    res.json({
      verified: true,
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
    logger.error('Failed to verify authentication', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify authentication',
    });
  }
};

/**
 * GET /api/v1/auth/webauthn/credentials
 * Get user's WebAuthn credentials
 */
export const getCredentials = async (req: Request, res: Response) => {
  try {
    // Extract userId from authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const credentials = await getCredentialsService(userId);

    res.json({
      credentials,
    });
  } catch (error) {
    logger.error('Failed to get credentials', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get credentials',
    });
  }
};

/**
 * DELETE /api/v1/auth/webauthn/credentials/:id
 * Delete a WebAuthn credential
 */
export const deleteCredential = async (req: Request, res: Response) => {
  try {
    // Extract userId from authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    }

    const { id } = req.params;

    // Validate credential ID
    if (!id) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Credential ID is required',
      });
    }

    await deleteCredentialService(userId, id);

    res.json({
      success: true,
      message: 'Credential deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete credential', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete credential',
    });
  }
};
