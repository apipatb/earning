import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { smartReplyService } from '../services/smart-reply.service';
import { logger } from '../utils/logger';
import { parseLimitParam } from '../utils/validation';

// Validation schemas
const generateSuggestionsSchema = z.object({
  messageId: z.string().uuid(),
  ticketId: z.string().uuid(),
  limit: z.number().int().min(1).max(5).optional(),
});

const createTemplateSchema = z.object({
  teamId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().max(100).optional(),
});

const updateTemplateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
});

/**
 * Get smart reply suggestions for a message
 * GET /api/v1/smart-reply/suggestions/:messageId
 */
export const getSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const ticketId = req.query.ticketId as string;
    const limit = parseLimitParam(req.query.limit as string);

    if (!ticketId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ticketId query parameter is required',
      });
    }

    // Validate UUIDs
    if (!z.string().uuid().safeParse(messageId).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid messageId format',
      });
    }

    if (!z.string().uuid().safeParse(ticketId).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid ticketId format',
      });
    }

    const suggestions = await smartReplyService.generateSuggestions({
      messageId,
      ticketId,
      limit: limit || 3,
    });

    res.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    logger.error('Get suggestions error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate suggestions',
    });
  }
};

/**
 * Get all reply templates
 * GET /api/v1/smart-reply/templates
 */
export const getTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.query.teamId as string | undefined;
    const category = req.query.category as string | undefined;

    // Validate teamId if provided
    if (teamId && !z.string().uuid().safeParse(teamId).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid teamId format',
      });
    }

    const templates = await smartReplyService.getTemplates(teamId, category);

    res.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error('Get templates error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch templates',
    });
  }
};

/**
 * Create a new reply template
 * POST /api/v1/smart-reply/templates
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const data = createTemplateSchema.parse(req.body);

    const template = await smartReplyService.createTemplate(data);

    res.status(201).json({
      template,
      message: 'Template created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Create template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create template',
    });
  }
};

/**
 * Update a reply template
 * PUT /api/v1/smart-reply/templates/:id
 */
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid template ID format',
      });
    }

    const data = updateTemplateSchema.parse(req.body);

    const template = await smartReplyService.updateTemplate(id, data);

    res.json({
      template,
      message: 'Template updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Update template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update template',
    });
  }
};

/**
 * Delete a reply template
 * DELETE /api/v1/smart-reply/templates/:id
 */
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid template ID format',
      });
    }

    await smartReplyService.deleteTemplate(id);

    res.json({
      message: 'Template deleted successfully',
    });
  } catch (error) {
    logger.error('Delete template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete template',
    });
  }
};

/**
 * Mark a suggestion as accepted
 * POST /api/v1/smart-reply/:id/accept
 */
export const acceptSuggestion = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Validate UUID
    if (!z.string().uuid().safeParse(id).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid suggestion ID format',
      });
    }

    await smartReplyService.acceptSuggestion(id);

    res.json({
      message: 'Suggestion accepted successfully',
    });
  } catch (error) {
    logger.error('Accept suggestion error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to accept suggestion',
    });
  }
};

/**
 * Get suggestion statistics
 * GET /api/v1/smart-reply/stats
 */
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = req.query.ticketId as string | undefined;

    // Validate ticketId if provided
    if (ticketId && !z.string().uuid().safeParse(ticketId).success) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid ticketId format',
      });
    }

    const stats = await smartReplyService.getSuggestionStats(ticketId);

    res.json(stats);
  } catch (error) {
    logger.error('Get stats error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics',
    });
  }
};
