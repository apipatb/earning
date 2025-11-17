import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';
import { WebhookEventType } from '@prisma/client';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';

// Validation schemas
const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.nativeEnum(WebhookEventType)).min(1),
});

const webhookStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

/**
 * Register a new webhook
 * POST /api/v1/webhooks
 */
export const registerWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = webhookSchema.parse(req.body);

    // Validate URL format
    try {
      const url = new URL(data.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid URL protocol. Only HTTP and HTTPS are supported.',
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid URL format',
      });
    }

    const webhook = await WebhookService.registerWebhook(
      userId,
      data.url,
      data.events
    );

    res.status(201).json({
      webhook,
      message: 'Webhook registered successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Register webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register webhook',
    });
  }
};

/**
 * Get all webhooks for the authenticated user
 * GET /api/v1/webhooks
 */
export const getUserWebhooks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const webhooks = await WebhookService.getUserWebhooks(userId);

    res.json({
      webhooks,
      total: webhooks.length,
    });
  } catch (error) {
    logger.error('Get user webhooks error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch webhooks',
    });
  }
};

/**
 * Get a specific webhook by ID
 * GET /api/v1/webhooks/:id
 */
export const getWebhookById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const webhooks = await WebhookService.getUserWebhooks(userId);
    const webhook = webhooks.find((w) => w.id === id);

    if (!webhook) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found',
      });
    }

    res.json({ webhook });
  } catch (error) {
    logger.error('Get webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch webhook',
    });
  }
};

/**
 * Delete a webhook
 * DELETE /api/v1/webhooks/:id
 */
export const deleteWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await WebhookService.deleteWebhook(userId, id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found',
      });
    }

    res.json({
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    logger.error('Delete webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete webhook',
    });
  }
};

/**
 * Get webhook logs
 * GET /api/v1/webhooks/:id/logs
 */
export const getWebhookLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const result = await WebhookService.getWebhookLogs(
      userId,
      id,
      parsedLimit,
      parsedOffset
    );

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found',
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Get webhook logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch webhook logs',
    });
  }
};

/**
 * Send test webhook event
 * POST /api/v1/webhooks/:id/test
 */
export const sendTestWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const sent = await WebhookService.sendTestEvent(userId, id);

    if (!sent) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found',
      });
    }

    res.json({
      message: 'Test webhook event queued for delivery',
    });
  } catch (error) {
    logger.error('Send test webhook error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send test webhook',
    });
  }
};

/**
 * Update webhook status
 * PATCH /api/v1/webhooks/:id/status
 */
export const updateWebhookStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = webhookStatusSchema.parse(req.body);

    const updated = await WebhookService.updateWebhookStatus(userId, id, data.status);

    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Webhook not found',
      });
    }

    res.json({
      message: 'Webhook status updated successfully',
      status: data.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Update webhook status error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update webhook status',
    });
  }
};
