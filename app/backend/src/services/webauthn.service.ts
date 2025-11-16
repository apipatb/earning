import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/typescript-types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// Configuration
const RP_NAME = process.env.WEBAUTHN_RP_NAME || 'EarnTrack';
const RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost';
const ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
const CHALLENGE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface GenerateRegistrationOptionsParams {
  userId: string;
  userName: string;
  userDisplayName: string;
}

interface VerifyRegistrationParams {
  userId: string;
  response: RegistrationResponseJSON;
  expectedChallenge: string;
  nickname?: string;
}

interface GenerateAuthenticationOptionsParams {
  userId?: string;
}

interface VerifyAuthenticationParams {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
}

/**
 * Generate registration options for WebAuthn credential creation
 */
export async function generateRegistrationOptionsService(
  params: GenerateRegistrationOptionsParams
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { userId, userName, userDisplayName } = params;

  try {
    // Get existing credentials for this user to exclude them
    const existingCredentials = await prisma.webAuthnCredential.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        credentialId: true,
      },
    });

    const excludeCredentials = existingCredentials.map((cred) => ({
      id: cred.credentialId,
      type: 'public-key' as const,
      transports: ['usb', 'nfc', 'ble', 'internal'] as AuthenticatorTransport[],
    }));

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userId,
      userName,
      userDisplayName,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    // Store challenge in database
    const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT);
    await prisma.webAuthnChallenge.create({
      data: {
        userId,
        challenge: options.challenge,
        expiresAt,
        used: false,
      },
    });

    logger.info(`WebAuthn registration options generated for user ${userId}`);
    return options;
  } catch (error) {
    logger.error('Failed to generate registration options', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to generate registration options');
  }
}

/**
 * Verify registration response and store credential
 */
export async function verifyRegistrationResponseService(
  params: VerifyRegistrationParams
): Promise<{ verified: boolean; credentialId?: string }> {
  const { userId, response, expectedChallenge, nickname } = params;

  try {
    // Verify the challenge exists and is not used
    const challengeRecord = await prisma.webAuthnChallenge.findFirst({
      where: {
        challenge: expectedChallenge,
        userId,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!challengeRecord) {
      logger.warn(`Invalid or expired challenge for user ${userId}`);
      return { verified: false };
    }

    // Verify the registration response
    let verification: VerifiedRegistrationResponse;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
      });
    } catch (error) {
      logger.error('Registration verification failed', error instanceof Error ? error : new Error(String(error)));
      return { verified: false };
    }

    const { verified, registrationInfo } = verification;

    if (!verified || !registrationInfo) {
      return { verified: false };
    }

    // Store the credential
    const { credentialPublicKey, credentialID, counter } = registrationInfo;

    const credential = await prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter: BigInt(counter),
        transports: response.response.transports || [],
        nickname: nickname || 'Security Key',
        isActive: true,
      },
    });

    // Mark challenge as used
    await prisma.webAuthnChallenge.update({
      where: { id: challengeRecord.id },
      data: { used: true },
    });

    logger.info(`WebAuthn credential registered for user ${userId}`);
    return { verified: true, credentialId: credential.id };
  } catch (error) {
    logger.error('Failed to verify registration response', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to verify registration response');
  }
}

/**
 * Generate authentication options for WebAuthn login
 */
export async function generateAuthenticationOptionsService(
  params: GenerateAuthenticationOptionsParams
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { userId } = params;

  try {
    let allowCredentials: { id: string; type: 'public-key'; transports?: AuthenticatorTransport[] }[] = [];

    // If userId is provided, get their credentials
    if (userId) {
      const userCredentials = await prisma.webAuthnCredential.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: {
          credentialId: true,
          transports: true,
        },
      });

      allowCredentials = userCredentials.map((cred) => ({
        id: cred.credentialId,
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransport[],
      }));
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
    });

    // Store challenge in database
    const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT);
    await prisma.webAuthnChallenge.create({
      data: {
        userId: userId || null,
        challenge: options.challenge,
        expiresAt,
        used: false,
      },
    });

    logger.info(`WebAuthn authentication options generated${userId ? ` for user ${userId}` : ''}`);
    return options;
  } catch (error) {
    logger.error('Failed to generate authentication options', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to generate authentication options');
  }
}

/**
 * Verify authentication response and return user
 */
export async function verifyAuthenticationResponseService(
  params: VerifyAuthenticationParams
): Promise<{ verified: boolean; userId?: string; credentialId?: string }> {
  const { response, expectedChallenge } = params;

  try {
    // Verify the challenge exists and is not used
    const challengeRecord = await prisma.webAuthnChallenge.findFirst({
      where: {
        challenge: expectedChallenge,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!challengeRecord) {
      logger.warn('Invalid or expired authentication challenge');
      return { verified: false };
    }

    // Find the credential
    const credentialIdBase64 = Buffer.from(response.rawId, 'base64').toString('base64url');
    const credential = await prisma.webAuthnCredential.findUnique({
      where: {
        credentialId: credentialIdBase64,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    if (!credential) {
      logger.warn('Credential not found');
      return { verified: false };
    }

    // Verify the authentication response
    let verification: VerifiedAuthenticationResponse;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
          credentialID: Buffer.from(credential.credentialId, 'base64url'),
          credentialPublicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: Number(credential.counter),
        },
      });
    } catch (error) {
      logger.error('Authentication verification failed', error instanceof Error ? error : new Error(String(error)));
      return { verified: false };
    }

    const { verified, authenticationInfo } = verification;

    if (!verified) {
      return { verified: false };
    }

    // Update credential counter and last used timestamp
    await prisma.webAuthnCredential.update({
      where: { id: credential.id },
      data: {
        counter: BigInt(authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Mark challenge as used
    await prisma.webAuthnChallenge.update({
      where: { id: challengeRecord.id },
      data: { used: true },
    });

    logger.info(`WebAuthn authentication successful for user ${credential.userId}`);
    return {
      verified: true,
      userId: credential.userId,
      credentialId: credential.id,
    };
  } catch (error) {
    logger.error('Failed to verify authentication response', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to verify authentication response');
  }
}

/**
 * Get user's WebAuthn credentials
 */
export async function getCredentialsService(userId: string) {
  try {
    const credentials = await prisma.webAuthnCredential.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        nickname: true,
        transports: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return credentials;
  } catch (error) {
    logger.error('Failed to get credentials', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to get credentials');
  }
}

/**
 * Delete a WebAuthn credential
 */
export async function deleteCredentialService(userId: string, credentialId: string) {
  try {
    // Verify the credential belongs to the user
    const credential = await prisma.webAuthnCredential.findFirst({
      where: {
        id: credentialId,
        userId,
      },
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    // Soft delete by setting isActive to false
    await prisma.webAuthnCredential.update({
      where: { id: credentialId },
      data: { isActive: false },
    });

    logger.info(`WebAuthn credential ${credentialId} deleted for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to delete credential', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to delete credential');
  }
}

/**
 * Clean up expired challenges (should be run periodically)
 */
export async function cleanupExpiredChallenges() {
  try {
    const result = await prisma.webAuthnChallenge.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired WebAuthn challenges`);
    return result.count;
  } catch (error) {
    logger.error('Failed to cleanup expired challenges', error instanceof Error ? error : new Error(String(error)));
    throw new Error('Failed to cleanup expired challenges');
  }
}
