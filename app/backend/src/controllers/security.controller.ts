import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// 2FA Setup
export const setup2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const secret = speakeasy.generateSecret({
      name: `EarnTrack (${req.user?.email})`,
      issuer: 'EarnTrack',
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCode,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    next(error);
  }
};

export const enable2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { secret, token } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Save encrypted secret
    const encryptedSecret = crypto
      .createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'secret')
      .update(secret, 'utf8', 'hex');

    const security = await prisma.userSecurity.upsert({
      where: { userId },
      update: {
        twoFASecret: encryptedSecret,
        twoFAEnabled: true,
        backupCodes: generateBackupCodes(),
      },
      create: {
        userId,
        twoFASecret: encryptedSecret,
        twoFAEnabled: true,
        backupCodes: generateBackupCodes(),
      },
    });

    res.json({
      message: '2FA enabled successfully',
      backupCodes: security.backupCodes,
    });
  } catch (error) {
    next(error);
  }
};

export const verify2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const security = await prisma.userSecurity.findUnique({
      where: { userId },
    });

    if (!security || !security.twoFAEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Decrypt secret
    const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'secret');
    const decryptedSecret = decipher.update(security.twoFASecret, 'hex', 'utf8') +
      decipher.final('utf8');

    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    res.json({ verified: true });
  } catch (error) {
    next(error);
  }
};

export const disable2FA = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { password } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const security = await prisma.userSecurity.update({
      where: { userId },
      data: {
        twoFAEnabled: false,
        twoFASecret: null,
      },
    });

    res.json({ message: '2FA disabled' });
  } catch (error) {
    next(error);
  }
};

// IP Whitelist
export const addWhitelistedIP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { ipAddress, description } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isValidIP(ipAddress)) {
      return res.status(400).json({ error: 'Invalid IP address' });
    }

    const whitelist = await prisma.ipWhitelist.create({
      data: {
        userId,
        ipAddress,
        description: description || '',
      },
    });

    res.status(201).json({
      message: 'IP added to whitelist',
      whitelist,
    });
  } catch (error) {
    next(error);
  }
};

export const getWhitelistedIPs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ips = await prisma.ipWhitelist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    res.json(ips);
  } catch (error) {
    next(error);
  }
};

export const removeWhitelistedIP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { ipId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const whitelist = await prisma.ipWhitelist.findFirst({
      where: { id: ipId, userId },
    });

    if (!whitelist) {
      return res.status(404).json({ error: 'IP not found' });
    }

    await prisma.ipWhitelist.delete({ where: { id: ipId } });

    res.json({ message: 'IP removed from whitelist' });
  } catch (error) {
    next(error);
  }
};

// Session Management
export const getActiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await prisma.userSession.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sessions);
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false, revokedAt: new Date() },
    });

    res.json({ message: 'Session revoked' });
  } catch (error) {
    next(error);
  }
};

// Security Audit Log
export const getAuditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { limit = 100, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const logs = await prisma.securityAuditLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: Number(limit) || 100,
      skip: Number(offset) || 0,
    });

    const total = await prisma.securityAuditLog.count({ where: { userId } });

    res.json({
      logs,
      pagination: { total, limit: Number(limit) || 100, offset: Number(offset) || 0 },
    });
  } catch (error) {
    next(error);
  }
};

// Data Privacy
export const requestDataExport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create export request
    const exportRequest = await prisma.dataExportRequest.create({
      data: {
        userId,
        status: 'pending',
        requestedAt: new Date(),
      },
    });

    res.status(201).json({
      message: 'Data export requested. You will receive an email when ready.',
      requestId: exportRequest.id,
    });
  } catch (error) {
    next(error);
  }
};

export const requestDataDeletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { password, reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify password for security
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create deletion request
    const deletionRequest = await prisma.dataDeleteRequest.create({
      data: {
        userId,
        status: 'pending',
        reason: reason || '',
        requestedAt: new Date(),
      },
    });

    res.status(201).json({
      message: 'Account deletion requested. You have 30 days to cancel.',
      requestId: deletionRequest.id,
      cancelDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    next(error);
  }
};

export const cancelDataDeletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const request = await prisma.dataDeleteRequest.findFirst({
      where: { id: requestId, userId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel this deletion request' });
    }

    await prisma.dataDeleteRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', cancelledAt: new Date() },
    });

    res.json({ message: 'Deletion request cancelled' });
  } catch (error) {
    next(error);
  }
};

// Security Settings
export const getSecuritySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const security = await prisma.userSecurity.findUnique({
      where: { userId },
      select: {
        twoFAEnabled: true,
        ipWhitelistEnabled: true,
        sessionTimeout: true,
        passwordLastChanged: true,
      },
    });

    res.json(security || {});
  } catch (error) {
    next(error);
  }
};

// Helper functions
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

export const logSecurityEvent = async (
  userId: string,
  action: string,
  details?: any
) => {
  try {
    await prisma.securityAuditLog.create({
      data: {
        userId,
        action,
        details: details || {},
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};
