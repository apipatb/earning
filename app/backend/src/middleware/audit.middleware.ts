import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '@prisma/client';
import { logger } from '../utils/logger';

// Resources that should not be audited (too verbose)
const EXCLUDED_RESOURCES = [
  '/api/v1/health',
  '/api/v1/ping',
  '/api/v1/metrics',
  '/favicon.ico',
];

// Sensitive fields that should not be logged
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'newPassword',
  'currentPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'secretKey',
  'privateKey',
  'creditCard',
  'cvv',
  'ssn',
];

/**
 * Middleware to automatically log API calls for audit purposes
 */
export const auditMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Skip excluded resources
  if (EXCLUDED_RESOURCES.some((path) => req.path.startsWith(path))) {
    return next();
  }

  // Get request metadata
  const userId = req.user?.id;
  const ipAddress = getClientIp(req);
  const userAgent = req.get('user-agent');
  const method = req.method;
  const path = req.path;

  // Determine audit action based on HTTP method
  let action: AuditAction | null = null;
  switch (method) {
    case 'POST':
      action = 'CREATE';
      break;
    case 'GET':
      // Only log sensitive GET requests (not all reads)
      if (isSensitiveResource(path)) {
        action = 'READ';
      }
      break;
    case 'PUT':
    case 'PATCH':
      action = 'UPDATE';
      break;
    case 'DELETE':
      action = 'DELETE';
      break;
  }

  // Skip if no action to log
  if (!action) {
    return next();
  }

  // Extract resource and resourceId from path
  const { resource, resourceId } = extractResourceFromPath(path);

  // Store original response methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  let responseBody: any = null;
  let responseStatusCode: number = 200;

  // Override res.json to capture response
  res.json = function (body: any): Response {
    responseBody = body;
    responseStatusCode = res.statusCode;
    return originalJson(body);
  };

  // Override res.send to capture response
  res.send = function (body: any): Response {
    responseBody = body;
    responseStatusCode = res.statusCode;
    return originalSend(body);
  };

  // Log after response is sent
  res.on('finish', async () => {
    try {
      // Only log if we have a userId or if it's a failed auth attempt
      if (!userId && !path.includes('/auth/')) {
        return;
      }

      // Determine if request was successful
      const isSuccess = responseStatusCode >= 200 && responseStatusCode < 400;
      const status = isSuccess ? 'SUCCESS' : 'FAILED';

      // Prepare changes data (sanitize sensitive fields)
      let changes: any = null;
      if (action === 'CREATE' || action === 'UPDATE') {
        const sanitizedBody = sanitizeSensitiveData({ ...req.body });
        changes = {
          after: sanitizedBody,
        };
      }

      // Extract error message if request failed
      let errorMsg: string | undefined;
      if (!isSuccess && responseBody) {
        if (typeof responseBody === 'string') {
          errorMsg = responseBody;
        } else if (responseBody.error) {
          errorMsg = typeof responseBody.error === 'string'
            ? responseBody.error
            : JSON.stringify(responseBody.error);
        } else if (responseBody.message) {
          errorMsg = responseBody.message;
        }
      }

      // Log the audit event
      await AuditService.logAction({
        userId,
        action,
        resource,
        resourceId,
        changes,
        ipAddress,
        userAgent,
        status,
        errorMsg,
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not break the app
      logger.error('Audit middleware error:', error instanceof Error ? error : new Error(String(error)));
    }
  });

  next();
};

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  // Check various headers for the real IP
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim());
    return ips[0]; // First IP is the client
  }

  const realIp = req.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Determine if a resource should be logged for READ operations
 */
function isSensitiveResource(path: string): boolean {
  const sensitiveResources = [
    '/api/v1/user/profile',
    '/api/v1/customers',
    '/api/v1/invoices',
    '/api/v1/financial',
    '/api/v1/reports',
    '/api/v1/audit',
    '/api/v1/compliance',
  ];

  return sensitiveResources.some((resource) => path.startsWith(resource));
}

/**
 * Extract resource name and ID from request path
 */
function extractResourceFromPath(path: string): { resource: string; resourceId?: string } {
  // Remove /api/v1/ prefix
  const cleanPath = path.replace(/^\/api\/v\d+\//, '');

  // Split by / and extract resource parts
  const parts = cleanPath.split('/').filter(Boolean);

  if (parts.length === 0) {
    return { resource: 'unknown' };
  }

  // First part is the resource name
  const resource = parts[0];

  // If there's a second part and it looks like an ID (UUID or numeric), capture it
  let resourceId: string | undefined;
  if (parts.length > 1) {
    const potentialId = parts[1];
    // Check if it's a UUID or number
    if (isUUID(potentialId) || /^\d+$/.test(potentialId)) {
      resourceId = potentialId;
    }
  }

  return { resource, resourceId };
}

/**
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Remove sensitive data from objects
 */
function sanitizeSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeSensitiveData(item));
  }

  const sanitized: any = {};

  for (const key in obj) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeSensitiveData(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
}

/**
 * Middleware specifically for logging authentication events
 */
export const auditAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.get('user-agent');
  const path = req.path;

  // Store original response methods
  const originalJson = res.json.bind(res);
  let responseBody: any = null;
  let responseStatusCode: number = 200;

  res.json = function (body: any): Response {
    responseBody = body;
    responseStatusCode = res.statusCode;
    return originalJson(body);
  };

  res.on('finish', async () => {
    try {
      const isSuccess = responseStatusCode >= 200 && responseStatusCode < 400;

      // For login
      if (path.includes('/login') || path.includes('/signin')) {
        const userId = responseBody?.user?.id || req.body?.email || 'unknown';
        const errorMsg = !isSuccess && responseBody?.error
          ? (typeof responseBody.error === 'string' ? responseBody.error : JSON.stringify(responseBody.error))
          : undefined;

        await AuditService.logLogin(userId, isSuccess, ipAddress, userAgent, errorMsg);
      }

      // For logout
      if (path.includes('/logout') || path.includes('/signout')) {
        const userId = req.user?.id;
        if (userId) {
          await AuditService.logLogout(userId, ipAddress, userAgent);
        }
      }
    } catch (error) {
      logger.error('Auth audit middleware error:', error instanceof Error ? error : new Error(String(error)));
    }
  });

  next();
};

/**
 * Middleware to log data exports for GDPR compliance
 */
export const auditExportMiddleware = (resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const ipAddress = getClientIp(req);
    const userAgent = req.get('user-agent');

    if (!userId) {
      return next();
    }

    // Store original response methods
    const originalJson = res.json.bind(res);
    let responseBody: any = null;

    res.json = function (body: any): Response {
      responseBody = body;
      return originalJson(body);
    };

    res.on('finish', async () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          // Count records in export
          let recordCount = 0;
          if (Array.isArray(responseBody)) {
            recordCount = responseBody.length;
          } else if (responseBody && typeof responseBody === 'object') {
            recordCount = Object.keys(responseBody).reduce((count, key) => {
              if (Array.isArray(responseBody[key])) {
                return count + responseBody[key].length;
              }
              return count;
            }, 0);
          }

          await AuditService.logExport(userId, resource, recordCount, ipAddress, userAgent);
        }
      } catch (error) {
        logger.error('Export audit middleware error:', error instanceof Error ? error : new Error(String(error)));
      }
    });

    next();
  };
};
