import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const API_TIER_LIMITS = {
  free: {
    requestsPerDay: 100,
    requestsPerMinute: 10,
    endpoints: ['earnings', 'platforms'],
  },
  pro: {
    requestsPerDay: 10000,
    requestsPerMinute: 100,
    endpoints: ['earnings', 'platforms', 'goals', 'analytics'],
  },
  business: {
    requestsPerDay: 100000,
    requestsPerMinute: 1000,
    endpoints: ['earnings', 'platforms', 'goals', 'analytics', 'users', 'webhooks'],
  },
};

// Create API key
export const createApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (tier === 'free') {
      return res.status(403).json({
        error: 'API access requires Pro tier or higher',
        requiredTier: 'pro',
      });
    }

    const apiKey = `earntrack_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const key = await prisma.apiKey.create({
      data: {
        userId,
        hashedKey,
        name: req.body.name || 'Default API Key',
        isActive: true,
      },
    });

    res.status(201).json({
      id: key.id,
      apiKey, // Only shown once
      name: key.name,
      createdAt: key.createdAt,
      message: 'Keep your API key safe. Never share it publicly.',
    });
  } catch (error) {
    next(error);
  }
};

// Get API keys
export const getApiKeys = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    res.json(keys);
  } catch (error) {
    next(error);
  }
};

// Revoke API key
export const revokeApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { keyId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    res.json({ message: 'API key revoked' });
  } catch (error) {
    next(error);
  }
};

// Create webhook
export const createWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;
    const { url, events, active } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (tier === 'free') {
      return res.status(403).json({
        error: 'Webhooks require Pro tier or higher',
        requiredTier: 'pro',
      });
    }

    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        url,
        secret,
        events: events || ['earnings.created', 'earnings.updated', 'goal.achieved'],
        isActive: active ?? true,
      },
    });

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      secret, // Only shown once
      events: webhook.events,
      createdAt: webhook.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

// Get webhooks
export const getWebhooks = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastFiredAt: true,
        createdAt: true,
      },
    });

    res.json(webhooks);
  } catch (error) {
    next(error);
  }
};

// Test webhook
export const testWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { webhookId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    // Fire test event
    const testPayload = {
      id: 'test_event',
      event: 'test.webhook',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test event',
      },
    };

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EarnTrack-Signature': crypto
            .createHmac('sha256', webhook.secret)
            .update(JSON.stringify(testPayload))
            .digest('hex'),
        },
        body: JSON.stringify(testPayload),
        timeout: 5000,
      });

      await prisma.webhook.update({
        where: { id: webhookId },
        data: { lastFiredAt: new Date() },
      });

      res.json({
        success: response.ok,
        status: response.status,
        message: 'Test event fired',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to fire webhook',
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get API usage
export const getApiUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const tier = (req as any).tier;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limits = API_TIER_LIMITS[tier as keyof typeof API_TIER_LIMITS] || API_TIER_LIMITS.free;

    const usage = await prisma.apiUsage.aggregate({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _count: true,
    });

    res.json({
      tier,
      limits,
      usageToday: usage._count || 0,
      remainingRequests: limits.requestsPerDay - (usage._count || 0),
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    next(error);
  }
};

// Get API docs
export const getApiDocs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const docs = {
      title: 'EarnTrack API v1',
      baseUrl: 'https://api.earntrack.com/v1',
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer YOUR_API_KEY',
      },
      endpoints: [
        {
          path: '/earnings',
          method: 'GET',
          description: 'List all earnings',
          query: {
            limit: 'number (default: 20)',
            offset: 'number (default: 0)',
            platformId: 'string (optional)',
            startDate: 'ISO date (optional)',
            endDate: 'ISO date (optional)',
          },
          response: {
            status: 200,
            example: {
              earnings: [
                {
                  id: 'earning_1',
                  amount: 100.50,
                  platform: 'Upwork',
                  date: '2025-11-15',
                  hours: 4.5,
                },
              ],
              total: 1000,
            },
          },
        },
        {
          path: '/earnings',
          method: 'POST',
          description: 'Create new earning record',
          body: {
            platformId: 'string (required)',
            amount: 'number (required)',
            date: 'ISO date (required)',
            hours: 'number (optional)',
            notes: 'string (optional)',
          },
          response: { status: 201 },
        },
        {
          path: '/platforms',
          method: 'GET',
          description: 'List all platforms',
          response: { status: 200 },
        },
        {
          path: '/goals',
          method: 'GET',
          description: 'List all goals',
          response: { status: 200 },
        },
        {
          path: '/analytics/summary',
          method: 'GET',
          description: 'Get analytics summary',
          query: {
            period: 'day|week|month|year',
          },
          response: { status: 200 },
        },
      ],
      webhooks: {
        events: [
          'earnings.created',
          'earnings.updated',
          'earnings.deleted',
          'goal.created',
          'goal.achieved',
          'goal.updated',
          'platform.added',
          'platform.removed',
        ],
        signature: 'X-EarnTrack-Signature header contains HMAC-SHA256 of request body',
      },
      rateLimit: {
        free: '100 requests/day',
        pro: '10,000 requests/day',
        business: '100,000 requests/day',
      },
      errors: {
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        429: 'Rate limit exceeded',
        500: 'Internal server error',
      },
    };

    res.json(docs);
  } catch (error) {
    next(error);
  }
};
