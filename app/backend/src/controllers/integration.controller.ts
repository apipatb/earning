import { Response } from 'express';
import { z } from 'zod';
import { IntegrationPlatform } from '@prisma/client';
import { AuthRequest } from '../types';
import { IntegrationService } from '../services/integration.service';
import { logger } from '../utils/logger';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';

// Validation schemas
const connectIntegrationSchema = z.object({
  platform: z.nativeEnum(IntegrationPlatform),
  authCode: z.string().min(1),
  webhookUrl: z.string().url().optional(),
});

const syncDataSchema = z.object({
  action: z.string().min(1),
  data: z.any(),
});

const batchSyncSchema = z.object({
  action: z.string().min(1),
  dataArray: z.array(z.any()).min(1),
});

/**
 * Get OAuth authorization URL
 * GET /api/v1/integrations/auth/:platform
 */
export const getAuthUrl = async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase() as IntegrationPlatform;

    // Validate platform
    if (!Object.values(IntegrationPlatform).includes(platform)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid platform',
      });
    }

    // Generate state token for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        userId: req.user!.id,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl = IntegrationService.generateAuthUrl(platform, state);

    res.json({
      authUrl,
      state,
      platform,
    });
  } catch (error) {
    logger.error('Get auth URL error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate authorization URL',
    });
  }
};

/**
 * Connect a new integration
 * POST /api/v1/integrations
 */
export const connectIntegration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = connectIntegrationSchema.parse(req.body);

    const integration = await IntegrationService.connectIntegration(
      userId,
      data.platform,
      data.authCode,
      data.webhookUrl
    );

    res.status(201).json({
      integration,
      message: 'Integration connected successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Connect integration error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to connect integration',
    });
  }
};

/**
 * Get all integrations for the authenticated user
 * GET /api/v1/integrations
 */
export const getUserIntegrations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const integrations = await IntegrationService.getUserIntegrations(userId);

    res.json({
      integrations,
      total: integrations.length,
    });
  } catch (error) {
    logger.error('Get user integrations error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch integrations',
    });
  }
};

/**
 * Get a specific integration by ID
 * GET /api/v1/integrations/:id
 */
export const getIntegrationById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const integrations = await IntegrationService.getUserIntegrations(userId);
    const integration = integrations.find((i) => i.id === id);

    if (!integration) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Integration not found',
      });
    }

    res.json({ integration });
  } catch (error) {
    logger.error('Get integration error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch integration',
    });
  }
};

/**
 * Disconnect an integration
 * DELETE /api/v1/integrations/:id
 */
export const disconnectIntegration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await IntegrationService.disconnectIntegration(userId, id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Integration not found',
      });
    }

    res.json({
      message: 'Integration disconnected successfully',
    });
  } catch (error) {
    logger.error('Disconnect integration error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to disconnect integration',
    });
  }
};

/**
 * Test integration connection
 * POST /api/v1/integrations/:id/test
 */
export const testIntegration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await IntegrationService.testConnection(userId, id);

    if (!result.success) {
      return res.status(400).json({
        error: 'Test Failed',
        message: result.error || 'Integration test failed',
        result,
      });
    }

    res.json({
      message: 'Integration test successful',
      result,
    });
  } catch (error) {
    logger.error('Test integration error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to test integration',
    });
  }
};

/**
 * Manual sync operation
 * POST /api/v1/integrations/:id/sync
 */
export const syncIntegration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = syncDataSchema.parse(req.body);

    const result = await IntegrationService.syncData(
      userId,
      id,
      data.action,
      data.data
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Sync Failed',
        message: result.error || 'Sync operation failed',
        result,
      });
    }

    res.json({
      message: 'Sync operation successful',
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Sync integration error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync integration',
    });
  }
};

/**
 * Batch sync operation
 * POST /api/v1/integrations/:id/batch-sync
 */
export const batchSyncIntegration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = batchSyncSchema.parse(req.body);

    const result = await IntegrationService.batchSync(
      userId,
      id,
      data.action,
      data.dataArray
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Batch Sync Failed',
        message: result.error || 'Batch sync operation failed',
        result,
      });
    }

    res.json({
      message: 'Batch sync operation successful',
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Batch sync integration error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to batch sync integration',
    });
  }
};

/**
 * Get sync logs for an integration
 * GET /api/v1/integrations/:id/logs
 */
export const getIntegrationLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const result = await IntegrationService.getSyncLogs(
      userId,
      id,
      parsedLimit,
      parsedOffset
    );

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Integration not found',
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Get integration logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch integration logs',
    });
  }
};

/**
 * OAuth callback handler
 * GET /api/v1/integrations/callback/:platform
 */
export const handleOAuthCallback = async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase() as IntegrationPlatform;
    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      return res.status(400).json({
        error: 'OAuth Error',
        message: error,
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing code or state parameter',
      });
    }

    // Validate state token
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const userId = stateData.userId;
      const timestamp = stateData.timestamp;

      // Check if state is expired (30 minutes)
      if (Date.now() - timestamp > 30 * 60 * 1000) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'State token expired',
        });
      }

      // Connect integration
      const integration = await IntegrationService.connectIntegration(
        userId,
        platform,
        code as string
      );

      // Redirect to success page or return JSON
      if (req.query.redirect) {
        return res.redirect(`${req.query.redirect}?success=true&integration=${integration.id}`);
      }

      res.json({
        message: 'Integration connected successfully',
        integration,
      });
    } catch (stateError) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid state token',
      });
    }
  } catch (error) {
    logger.error('OAuth callback error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process OAuth callback',
    });
  }
};

/**
 * Webhook handler for Zapier
 * POST /api/v1/webhooks/zapier
 */
export const handleZapierWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    const result = await IntegrationService.processIncomingWebhook(
      IntegrationPlatform.ZAPIER,
      apiKey,
      req.body
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Webhook Processing Failed',
        message: result.error || 'Failed to process webhook',
      });
    }

    res.json({
      message: 'Webhook processed successfully',
      result,
    });
  } catch (error) {
    logger.error('Zapier webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process Zapier webhook',
    });
  }
};

/**
 * Webhook handler for Make.com
 * POST /api/v1/webhooks/make
 */
export const handleMakeWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    const result = await IntegrationService.processIncomingWebhook(
      IntegrationPlatform.MAKE,
      apiKey,
      req.body
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Webhook Processing Failed',
        message: result.error || 'Failed to process webhook',
      });
    }

    res.json({
      message: 'Webhook processed successfully',
      result,
    });
  } catch (error) {
    logger.error('Make webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process Make webhook',
    });
  }
};

/**
 * Webhook handler for Slack
 * POST /api/v1/webhooks/slack
 */
export const handleSlackWebhook = async (req: AuthRequest, res: Response) => {
  try {
    // Handle Slack URL verification challenge
    if (req.body.type === 'url_verification') {
      return res.json({
        challenge: req.body.challenge,
      });
    }

    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    const result = await IntegrationService.processIncomingWebhook(
      IntegrationPlatform.SLACK,
      apiKey,
      req.body
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Webhook Processing Failed',
        message: result.error || 'Failed to process webhook',
      });
    }

    res.json({
      message: 'Webhook processed successfully',
      result,
    });
  } catch (error) {
    logger.error('Slack webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process Slack webhook',
    });
  }
};

/**
 * Webhook handler for Teams
 * POST /api/v1/webhooks/teams
 */
export const handleTeamsWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required',
      });
    }

    const result = await IntegrationService.processIncomingWebhook(
      IntegrationPlatform.TEAMS,
      apiKey,
      req.body
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Webhook Processing Failed',
        message: result.error || 'Failed to process webhook',
      });
    }

    res.json({
      message: 'Webhook processed successfully',
      result,
    });
  } catch (error) {
    logger.error('Teams webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process Teams webhook',
    });
  }
};
