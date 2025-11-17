import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { EmailStatus } from '@prisma/client';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';

// Validation schemas
const emailTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  variables: z.array(z.string()).optional(),
});

const updateEmailTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlBody: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
});

const emailSequenceStepSchema = z.object({
  delay: z.number().min(0),
  templateId: z.string().optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
});

const emailSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  steps: z.array(emailSequenceStepSchema).min(1),
  trigger: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

const updateEmailSequenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  steps: z.array(emailSequenceStepSchema).min(1).optional(),
  trigger: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Create email template
 * POST /api/v1/emails/templates
 */
export const createEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = emailTemplateSchema.parse(req.body);

    const template = await EmailService.createTemplate(userId, data);

    res.status(201).json({
      template,
      message: 'Email template created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Create email template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create email template',
    });
  }
};

/**
 * Get all email templates for the authenticated user
 * GET /api/v1/emails/templates
 */
export const getUserEmailTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const templates = await EmailService.getUserTemplates(userId);

    res.json({
      templates,
      total: templates.length,
    });
  } catch (error) {
    logger.error('Get user email templates error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch email templates',
    });
  }
};

/**
 * Update email template
 * PUT /api/v1/emails/templates/:id
 */
export const updateEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateEmailTemplateSchema.parse(req.body);

    const updated = await EmailService.updateTemplate(userId, id, data);

    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email template not found',
      });
    }

    res.json({
      message: 'Email template updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Update email template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update email template',
    });
  }
};

/**
 * Delete email template
 * DELETE /api/v1/emails/templates/:id
 */
export const deleteEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await EmailService.deleteTemplate(userId, id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email template not found',
      });
    }

    res.json({
      message: 'Email template deleted successfully',
    });
  } catch (error) {
    logger.error('Delete email template error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete email template',
    });
  }
};

/**
 * Create email sequence
 * POST /api/v1/emails/sequences
 */
export const createEmailSequence = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = emailSequenceSchema.parse(req.body);

    const sequence = await EmailService.createSequence(userId, data);

    res.status(201).json({
      sequence,
      message: 'Email sequence created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Create email sequence error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create email sequence',
    });
  }
};

/**
 * Get all email sequences for the authenticated user
 * GET /api/v1/emails/sequences
 */
export const getUserEmailSequences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const sequences = await EmailService.getUserSequences(userId);

    res.json({
      sequences,
      total: sequences.length,
    });
  } catch (error) {
    logger.error('Get user email sequences error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch email sequences',
    });
  }
};

/**
 * Update email sequence
 * PUT /api/v1/emails/sequences/:id
 */
export const updateEmailSequence = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const data = updateEmailSequenceSchema.parse(req.body);

    const updated = await EmailService.updateSequence(userId, id, data);

    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email sequence not found',
      });
    }

    res.json({
      message: 'Email sequence updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors,
      });
    }

    logger.error('Update email sequence error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update email sequence',
    });
  }
};

/**
 * Delete email sequence
 * DELETE /api/v1/emails/sequences/:id
 */
export const deleteEmailSequence = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const deleted = await EmailService.deleteSequence(userId, id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email sequence not found',
      });
    }

    res.json({
      message: 'Email sequence deleted successfully',
    });
  } catch (error) {
    logger.error('Delete email sequence error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete email sequence',
    });
  }
};

/**
 * Get email delivery logs
 * GET /api/v1/emails/logs
 */
export const getEmailLogs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { sequenceId, status, recipientEmail, limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const filters: any = {};
    if (sequenceId) filters.sequenceId = sequenceId as string;
    if (status) filters.status = status as EmailStatus;
    if (recipientEmail) filters.recipientEmail = recipientEmail as string;

    const result = await EmailService.getEmailLogs(
      userId,
      filters,
      parsedLimit,
      parsedOffset
    );

    if (result === null) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Email sequence not found',
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('Get email logs error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch email logs',
    });
  }
};

/**
 * Get email delivery statistics
 * GET /api/v1/emails/stats
 */
export const getEmailStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await EmailService.getEmailStats(userId);

    res.json({ stats });
  } catch (error) {
    logger.error('Get email stats error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch email statistics',
    });
  }
};

/**
 * Unsubscribe email
 * GET /api/v1/emails/unsubscribe
 */
export const unsubscribeEmail = async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email parameter is required',
      });
    }

    EmailService.unsubscribe(email);

    res.send(`
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            h1 {
              color: #333;
            }
            p {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Successfully Unsubscribed</h1>
            <p>You have been unsubscribed from our email list.</p>
            <p>Email: <strong>${email}</strong></p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Unsubscribe email error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to unsubscribe email',
    });
  }
};
