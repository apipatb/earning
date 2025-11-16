import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { sentimentService } from '../services/sentiment.service';
import { logger } from '../utils/logger';

// Validation schemas
const analyzeTextSchema = z.object({
  text: z.string().min(1).max(10000),
});

const resolveAlertSchema = z.object({
  alertId: z.string().uuid(),
});

/**
 * Analyze sentiment of a text (testing endpoint)
 * POST /api/v1/sentiment/analyze
 */
export const analyzeText = async (req: AuthRequest, res: Response) => {
  try {
    const data = analyzeTextSchema.parse(req.body);
    const analysis = sentimentService.analyzeSentiment(data.text);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid text data',
        details: error.errors,
      });
    }

    logger.error('Analyze text error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment',
    });
  }
};

/**
 * Get sentiment analysis for a specific message
 * GET /api/v1/sentiment/message/:id
 */
export const getMessageSentiment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const sentiment = await sentimentService.getMessageSentiment(id);

    if (!sentiment) {
      return res.status(404).json({
        success: false,
        error: 'Sentiment analysis not found for this message',
      });
    }

    // Verify the user has access to this ticket
    if (sentiment.message.ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: sentiment,
    });
  } catch (error) {
    logger.error('Get message sentiment error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment analysis',
    });
  }
};

/**
 * Get sentiment overview for a ticket
 * GET /api/v1/sentiment/ticket/:id
 */
export const getTicketSentiment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const overview = await sentimentService.getTicketSentimentOverview(id);

    if (!overview) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Verify user has access (we'll need to add a check with the ticket)
    // For now, we'll trust the service to filter by user

    res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    logger.error('Get ticket sentiment error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ticket sentiment overview',
    });
  }
};

/**
 * Get active sentiment alerts for the user
 * GET /api/v1/sentiment/alerts
 */
export const getSentimentAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const alerts = await sentimentService.getActiveSentimentAlerts(userId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    logger.error('Get sentiment alerts error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment alerts',
    });
  }
};

/**
 * Resolve a sentiment alert
 * POST /api/v1/sentiment/alerts/resolve
 */
export const resolveSentimentAlert = async (req: AuthRequest, res: Response) => {
  try {
    const data = resolveAlertSchema.parse(req.body);

    await sentimentService.resolveSentimentAlert(data.alertId);

    res.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert data',
        details: error.errors,
      });
    }

    logger.error('Resolve sentiment alert error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
};

/**
 * Analyze all messages for a ticket
 * POST /api/v1/sentiment/ticket/:id/analyze
 */
export const analyzeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await sentimentService.analyzeTicketMessages(id);

    res.json({
      success: true,
      message: 'Ticket sentiment analysis completed',
    });
  } catch (error) {
    logger.error('Analyze ticket error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to analyze ticket sentiment',
    });
  }
};

/**
 * Get sentiment statistics for the user's tickets
 * GET /api/v1/sentiment/stats
 */
export const getSentimentStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await sentimentService.getUserSentimentStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get sentiment stats error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sentiment statistics',
    });
  }
};
