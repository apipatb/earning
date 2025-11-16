import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { customerPortalService } from '../services/customer-portal.service';
import { parseLimitParam, parseOffsetParam, parseEnumParam } from '../utils/validation';
import { logger } from '../utils/logger';
import { TicketStatus, TicketPriority } from '@prisma/client';

// Validation schemas
const createTicketSchema = z.object({
  customerId: z.string().uuid(),
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.string().max(100).optional(),
});

const updatePreferencesSchema = z.object({
  preferences: z.record(z.any()).optional(),
  subscribedTo: z.array(z.string()).optional(),
});

/**
 * GET /api/v1/customer/profile
 * Get customer profile with limited information
 */
export const getCustomerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const profile = await customerPortalService.getCustomerProfile(
      customerId,
      userId
    );

    logger.info(`Customer profile retrieved for customer ${customerId}`);
    res.json(profile);
  } catch (error: any) {
    logger.error('Error getting customer profile:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to get customer profile',
    });
  }
};

/**
 * GET /api/v1/customer/tickets
 * List customer's own tickets
 */
export const listCustomerTickets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      customerId,
      status,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const ticketStatus = status
      ? parseEnumParam(status as string, TicketStatus)
      : undefined;

    const result = await customerPortalService.listCustomerTickets(
      customerId,
      userId,
      {
        status: ticketStatus,
        limit,
        offset,
      }
    );

    logger.info(`Listed tickets for customer ${customerId}`);
    res.json(result);
  } catch (error: any) {
    logger.error('Error listing customer tickets:', error);
    res.status(500).json({
      error: error.message || 'Failed to list tickets',
    });
  }
};

/**
 * GET /api/v1/customer/tickets/:id
 * Get a single ticket (customer's own only)
 */
export const getCustomerTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const ticket = await customerPortalService.getTicket(id, customerId, userId);

    logger.info(`Retrieved ticket ${id} for customer ${customerId}`);
    res.json(ticket);
  } catch (error: any) {
    logger.error('Error getting customer ticket:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to get ticket',
    });
  }
};

/**
 * POST /api/v1/customer/tickets
 * Create a new ticket
 */
export const createCustomerTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const validatedData = createTicketSchema.parse(req.body);

    const ticket = await customerPortalService.createTicket({
      ...validatedData,
      userId,
      priority: validatedData.priority as TicketPriority | undefined,
    });

    logger.info(
      `Created ticket ${ticket.id} for customer ${validatedData.customerId}`
    );
    res.status(201).json(ticket);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error creating customer ticket:', error);
    res.status(error.message.includes('permission') ? 403 : 500).json({
      error: error.message || 'Failed to create ticket',
    });
  }
};

/**
 * GET /api/v1/customer/invoices
 * List customer's own invoices
 */
export const listCustomerInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      customerId,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const result = await customerPortalService.listCustomerInvoices(
      customerId,
      userId,
      { limit, offset }
    );

    logger.info(`Listed invoices for customer ${customerId}`);
    res.json(result);
  } catch (error: any) {
    logger.error('Error listing customer invoices:', error);
    res.status(500).json({
      error: error.message || 'Failed to list invoices',
    });
  }
};

/**
 * GET /api/v1/customer/invoices/:id
 * Get a single invoice (customer's own only)
 */
export const getCustomerInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const invoice = await customerPortalService.getInvoice(
      id,
      customerId,
      userId
    );

    logger.info(`Retrieved invoice ${id} for customer ${customerId}`);
    res.json(invoice);
  } catch (error: any) {
    logger.error('Error getting customer invoice:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to get invoice',
    });
  }
};

/**
 * GET /api/v1/customer/documents
 * List customer's documents
 */
export const listCustomerDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      customerId,
      limit: limitParam,
      offset: offsetParam,
    } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    const result = await customerPortalService.listCustomerDocuments(
      customerId,
      userId,
      { limit, offset }
    );

    logger.info(`Listed documents for customer ${customerId}`);
    res.json(result);
  } catch (error: any) {
    logger.error('Error listing customer documents:', error);
    res.status(500).json({
      error: error.message || 'Failed to list documents',
    });
  }
};

/**
 * GET /api/v1/customer/documents/:id
 * Get/download a document
 */
export const getCustomerDocument = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const document = await customerPortalService.getDocument(
      id,
      customerId,
      userId
    );

    logger.info(`Retrieved document ${id} for customer ${customerId}`);
    res.json(document);
  } catch (error: any) {
    logger.error('Error getting customer document:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to get document',
    });
  }
};

/**
 * PUT /api/v1/customer/preferences
 * Update customer preferences
 */
export const updateCustomerPreferences = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const validatedData = updatePreferencesSchema.parse(req.body);

    const profile = await customerPortalService.updatePreferences(
      customerId,
      userId,
      validatedData
    );

    logger.info(`Updated preferences for customer ${customerId}`);
    res.json(profile);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    logger.error('Error updating customer preferences:', error);
    res.status(500).json({
      error: error.message || 'Failed to update preferences',
    });
  }
};

/**
 * GET /api/v1/customer/stats
 * Get customer statistics
 */
export const getCustomerStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { customerId } = req.query;

    if (!customerId || typeof customerId !== 'string') {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const stats = await customerPortalService.getCustomerStats(
      customerId,
      userId
    );

    logger.info(`Retrieved stats for customer ${customerId}`);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting customer stats:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      error: error.message || 'Failed to get stats',
    });
  }
};
