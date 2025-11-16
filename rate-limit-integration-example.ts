/**
 * Rate Limit Integration Example
 *
 * This file shows practical integration patterns for using
 * Redis-based rate limiting in Express routes and controllers.
 */

import { Request, Response, NextFunction } from 'express';
import { permissionService, DataScope } from './app/backend/src/services/permission.service';

/**
 * Express Middleware: Rate Limit Checker
 *
 * Use this middleware to enforce rate limits on specific routes
 */
export const rateLimitMiddleware = (
  action: string,
  maxActions: number,
  windowMinutes: number
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const status = await permissionService.checkRateLimit(
        action,
        userId,
        maxActions,
        windowMinutes
      );

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', status.limit.toString());
      res.setHeader('X-RateLimit-Remaining', status.remaining.toString());
      res.setHeader('X-RateLimit-Reset', status.resetAt.toISOString());

      if (!status.allowed) {
        const retryAfter = Math.ceil((status.resetAt.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many ${action} requests. Please try again later.`,
          limit: status.limit,
          current: status.current,
          resetAt: status.resetAt,
          retryAfter
        });
      }

      // Increment counter after successful check
      await permissionService.incrementRateLimit(action, userId, windowMinutes);

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Fail open - allow request on error
      next();
    }
  };
};

/**
 * Example Route Handlers
 */

// Example 1: Ticket Creation with Rate Limiting
export const createTicketHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check permission (includes rate limit from permission conditions)
    const permission = await permissionService.checkPermission(
      userId,
      'ticket',
      'create'
    );

    if (!permission.granted) {
      const statusCode = permission.reason?.includes('Rate limit') ? 429 : 403;
      return res.status(statusCode).json({
        error: permission.reason || 'Permission denied'
      });
    }

    // Create ticket...
    const ticket = {
      id: 'ticket-123',
      title: req.body.title,
      description: req.body.description,
      userId,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Example 2: Message Sending with Standalone Rate Limit
export const sendMessageHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Standalone rate limit check (not tied to permissions)
    const rateLimitStatus = await permissionService.checkRateLimit(
      'message:send',
      userId,
      50,   // 50 messages
      60    // per hour
    );

    if (!rateLimitStatus.allowed) {
      return res.status(429).json({
        error: 'Too many messages sent',
        limit: rateLimitStatus.limit,
        current: rateLimitStatus.current,
        resetAt: rateLimitStatus.resetAt,
        retryAfter: Math.ceil((rateLimitStatus.resetAt.getTime() - Date.now()) / 1000)
      });
    }

    // Increment counter
    await permissionService.incrementRateLimit('message:send', userId, 60);

    // Send message...
    const message = {
      id: 'msg-123',
      content: req.body.content,
      userId,
      sentAt: new Date()
    };

    res.json({
      success: true,
      message,
      rateLimit: {
        remaining: rateLimitStatus.remaining - 1,
        resetAt: rateLimitStatus.resetAt
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Example 3: Report Generation with Heavy Limits
export const generateReportHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Check permission with strict rate limit
    const permission = await permissionService.checkPermission(
      userId,
      'report',
      'generate'
    );

    if (!permission.granted) {
      return res.status(permission.reason?.includes('Rate limit') ? 429 : 403).json({
        error: permission.reason || 'Permission denied'
      });
    }

    // Generate report (expensive operation)...
    const report = {
      id: 'report-123',
      type: req.body.reportType,
      userId,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      report,
      message: 'Report generation started. You will receive an email when complete.'
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Example 4: Get User's Rate Limit Status
export const getRateLimitStatusHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { action } = req.params;

    // Get status without affecting the counter
    const status = await permissionService.getRateLimitStatus(
      action,
      userId,
      100, // Example limit
      60   // Example window
    );

    res.json({
      action,
      status: {
        allowed: status.allowed,
        current: status.current,
        limit: status.limit,
        remaining: status.remaining,
        resetAt: status.resetAt,
        percentUsed: Math.round((status.current / status.limit) * 100)
      }
    });
  } catch (error) {
    console.error('Get rate limit status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Example 5: Admin - Reset User's Rate Limit
export const resetUserRateLimitHandler = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const { userId, action } = req.body;

    // Check admin permission
    const permission = await permissionService.checkPermission(
      adminId,
      'rate-limit',
      'reset'
    );

    if (!permission.granted) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Reset rate limit
    await permissionService.resetRateLimit(action, userId, 60);

    res.json({
      success: true,
      message: `Rate limit reset for ${action} on user ${userId}`
    });
  } catch (error) {
    console.error('Reset rate limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Express Route Setup Example
 */
export const setupRateLimitedRoutes = (app: any) => {
  // Apply rate limiting middleware to specific routes
  app.post(
    '/api/tickets',
    rateLimitMiddleware('ticket:create', 20, 60),
    createTicketHandler
  );

  app.post(
    '/api/messages',
    rateLimitMiddleware('message:send', 50, 60),
    sendMessageHandler
  );

  app.post(
    '/api/reports/generate',
    rateLimitMiddleware('report:generate', 5, 60),
    generateReportHandler
  );

  // Status and admin routes
  app.get('/api/rate-limit/status/:action', getRateLimitStatusHandler);
  app.post('/api/admin/rate-limit/reset', resetUserRateLimitHandler);

  // Example: Different limits for different user tiers
  app.post('/api/files/upload', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const userTier = (req as any).user.tier; // 'free', 'pro', 'enterprise'

    const limits = {
      free: { maxActions: 5, windowMinutes: 60 },
      pro: { maxActions: 50, windowMinutes: 60 },
      enterprise: { maxActions: 500, windowMinutes: 60 }
    };

    const limit = limits[userTier as keyof typeof limits] || limits.free;

    const status = await permissionService.checkRateLimit(
      'file:upload',
      userId,
      limit.maxActions,
      limit.windowMinutes
    );

    if (!status.allowed) {
      return res.status(429).json({
        error: 'Upload limit exceeded',
        tier: userTier,
        limit: status.limit,
        message: userTier === 'free'
          ? 'Upgrade to Pro for higher limits!'
          : 'Rate limit exceeded. Please wait before uploading more files.'
      });
    }

    await permissionService.incrementRateLimit(
      'file:upload',
      userId,
      limit.windowMinutes
    );

    // Handle upload...
    res.json({ success: true });
  });
};

/**
 * Setup Permissions with Rate Limits
 */
export const setupRateLimitedPermissions = async () => {
  // Setup default permissions with rate limits
  const permissions = [
    {
      resource: 'ticket',
      action: 'create',
      maxActions: 20,
      windowMinutes: 60,
      description: 'Create tickets - 20 per hour'
    },
    {
      resource: 'message',
      action: 'send',
      maxActions: 50,
      windowMinutes: 60,
      description: 'Send messages - 50 per hour'
    },
    {
      resource: 'report',
      action: 'generate',
      maxActions: 5,
      windowMinutes: 60,
      description: 'Generate reports - 5 per hour'
    },
    {
      resource: 'file',
      action: 'upload',
      maxActions: 10,
      windowMinutes: 60,
      description: 'Upload files - 10 per hour'
    },
    {
      resource: 'api',
      action: 'call',
      maxActions: 1000,
      windowMinutes: 60,
      description: 'API calls - 1000 per hour'
    }
  ];

  console.log('Setting up rate-limited permissions...');

  for (const perm of permissions) {
    console.log(`  ✓ ${perm.description}`);
    // These would be set up per user or role
    // Example shown in documentation
  }

  console.log('Rate-limited permissions setup complete!');
};

/**
 * Monitoring and Analytics
 */
export const getRateLimitAnalytics = async (userId: string) => {
  const actions = [
    'ticket:create',
    'message:send',
    'report:generate',
    'file:upload',
    'api:call'
  ];

  const analytics = [];

  for (const action of actions) {
    const status = await permissionService.getRateLimitStatus(
      action,
      userId,
      100, // Example limit
      60
    );

    analytics.push({
      action,
      current: status.current,
      limit: status.limit,
      remaining: status.remaining,
      percentUsed: Math.round((status.current / status.limit) * 100),
      resetAt: status.resetAt
    });
  }

  return {
    userId,
    timestamp: new Date(),
    actions: analytics,
    totalActions: analytics.reduce((sum, a) => sum + a.current, 0)
  };
};

/**
 * Error Response Helper
 */
export const sendRateLimitError = (
  res: Response,
  action: string,
  status: any
) => {
  const retryAfter = Math.ceil((status.resetAt.getTime() - Date.now()) / 1000);

  res.status(429)
    .setHeader('X-RateLimit-Limit', status.limit.toString())
    .setHeader('X-RateLimit-Remaining', '0')
    .setHeader('X-RateLimit-Reset', status.resetAt.toISOString())
    .setHeader('Retry-After', retryAfter.toString())
    .json({
      error: 'Rate limit exceeded',
      message: `Too many ${action} requests. Please try again later.`,
      details: {
        action,
        limit: status.limit,
        current: status.current,
        resetAt: status.resetAt,
        retryAfter,
        retryAfterMinutes: Math.ceil(retryAfter / 60)
      }
    });
};

/**
 * Usage Example
 */
/*
import express from 'express';
import { setupRateLimitedRoutes, setupRateLimitedPermissions } from './rate-limit-integration-example';

const app = express();

// Setup permissions on startup
setupRateLimitedPermissions();

// Setup routes
setupRateLimitedRoutes(app);

app.listen(3000, () => {
  console.log('Server running with rate limiting enabled');
});
*/
