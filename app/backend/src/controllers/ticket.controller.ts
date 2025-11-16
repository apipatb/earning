import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { ticketService } from '../services/ticket.service';
import { TicketStatus, TicketPriority } from '@prisma/client';
import { parseLimitParam, parseOffsetParam, parseEnumParam } from '../utils/validation';
import { logger } from '../utils/logger';

// Validation schemas
const createTicketSchema = z.object({
  customerId: z.string().uuid().optional(),
  subject: z.string().min(1, 'Subject is required').max(500),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().max(50).optional(),
});

const updateTicketSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assignedTo: z.string().uuid().optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
});

const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  isInternal: z.boolean().optional(),
});

const assignTicketSchema = z.object({
  assignedTo: z.string().uuid({ message: 'Valid user ID is required' }),
});

const bulkOperationSchema = z.object({
  ticketIds: z.array(z.string().uuid()),
  operation: z.enum(['assign', 'close', 'update_priority', 'add_tag']),
  data: z.record(z.any()),
});

// Create ticket
export const createTicket = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = createTicketSchema.parse(req.body);

    const ticket = await ticketService.createTicket({
      userId,
      ...validatedData,
    });

    res.status(201).json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    logger.error('Error creating ticket:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create ticket',
    });
  }
};

// Get all tickets with filters
export const getAllTickets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      customerId,
      status,
      priority,
      assignedTo,
      category,
      slaBreach,
      search,
      page = '1',
      limit: limitParam = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseLimitParam(limitParam);

    const filters: any = { userId };
    if (customerId) filters.customerId = customerId as string;
    if (status) filters.status = status as TicketStatus;
    if (priority) filters.priority = priority as TicketPriority;
    if (assignedTo) filters.assignedTo = assignedTo as string;
    if (category) filters.category = category as string;
    if (slaBreach !== undefined) filters.slaBreach = slaBreach === 'true';
    if (search) filters.search = search as string;

    const result = await ticketService.listTickets(filters, pageNum, limitNum);

    res.json({
      success: true,
      data: result.tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch tickets',
    });
  }
};

// Get ticket by ID
export const getTicketById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const ticket = await ticketService.getTicketById(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    // Check if user has access to this ticket
    if (ticket.userId !== userId) {
      // TODO: Add role-based access check for agents/admins
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    logger.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ticket',
    });
  }
};

// Update ticket
export const updateTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const validatedData = updateTicketSchema.parse(req.body);

    // Check if ticket exists and user has access
    const existingTicket = await ticketService.getTicketById(id);
    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    if (existingTicket.userId !== userId) {
      // TODO: Add role-based access check for agents/admins
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const ticket = await ticketService.updateTicket(id, validatedData);

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    logger.error('Error updating ticket:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update ticket',
    });
  }
};

// Add comment to ticket
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content, isInternal = false } = addCommentSchema.parse(req.body);

    // Check if ticket exists
    const ticket = await ticketService.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    const comment = await ticketService.addComment(id, userId, content, isInternal);

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error: any) {
    logger.error('Error adding comment:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add comment',
    });
  }
};

// Assign ticket
export const assignTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = assignTicketSchema.parse(req.body);

    // Check if ticket exists
    const ticket = await ticketService.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    const updatedTicket = await ticketService.assignTicket(id, assignedTo);

    res.json({
      success: true,
      data: updatedTicket,
    });
  } catch (error: any) {
    logger.error('Error assigning ticket:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign ticket',
    });
  }
};

// Close ticket
export const closeTicket = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if ticket exists
    const ticket = await ticketService.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found',
      });
    }

    const closedTicket = await ticketService.closeTicket(id, userId);

    res.json({
      success: true,
      data: closedTicket,
    });
  } catch (error: any) {
    logger.error('Error closing ticket:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to close ticket',
    });
  }
};

// Bulk operations
export const bulkOperation = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = bulkOperationSchema.parse(req.body);

    const result = await ticketService.bulkOperation(validatedData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Error performing bulk operation:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform bulk operation',
    });
  }
};

// Get ticket statistics
export const getTicketStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const stats = await ticketService.getTicketStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error fetching ticket stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch ticket statistics',
    });
  }
};

// Manual SLA check (admin endpoint)
export const runSLACheck = async (req: AuthRequest, res: Response) => {
  try {
    await ticketService.runSLACheck();

    res.json({
      success: true,
      message: 'SLA check completed successfully',
    });
  } catch (error: any) {
    logger.error('Error running SLA check:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run SLA check',
    });
  }
};
