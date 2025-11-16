import { TicketStatus, TicketPriority, SupportTicket, TicketMessage } from '@prisma/client';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// SLA Configuration (in minutes)
const SLA_CONFIG = {
  [TicketPriority.LOW]: {
    responseTime: 480, // 8 hours
    resolveTime: 2880, // 48 hours
  },
  [TicketPriority.MEDIUM]: {
    responseTime: 240, // 4 hours
    resolveTime: 1440, // 24 hours
  },
  [TicketPriority.HIGH]: {
    responseTime: 120, // 2 hours
    resolveTime: 480, // 8 hours
  },
  [TicketPriority.CRITICAL]: {
    responseTime: 30, // 30 minutes
    resolveTime: 240, // 4 hours
  },
};

interface CreateTicketInput {
  userId: string;
  customerId?: string;
  subject: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  tags?: string[];
  source?: string;
}

interface UpdateTicketInput {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  category?: string;
  tags?: string[];
}

interface TicketFilters {
  userId?: string;
  customerId?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  category?: string;
  slaBreach?: boolean;
  search?: string;
}

interface BulkOperation {
  ticketIds: string[];
  operation: 'assign' | 'close' | 'update_priority' | 'add_tag';
  data: any;
}

export class TicketService {
  // Create a new ticket
  async createTicket(input: CreateTicketInput): Promise<SupportTicket> {
    const { userId, customerId, subject, description, priority = TicketPriority.MEDIUM, category, tags, source = 'MANUAL' } = input;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        customerId,
        subject,
        description,
        priority,
        status: TicketStatus.OPEN,
        category,
        tags: tags ? JSON.stringify(tags) : null,
        source,
        slaResponseTime: SLA_CONFIG[priority].responseTime,
        slaResolveTime: SLA_CONFIG[priority].resolveTime,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Auto-assign ticket if enabled
    await this.autoAssignTicket(ticket.id);

    logger.info(`Ticket created: ${ticket.id} - ${subject}`);
    return ticket;
  }

  // Update ticket
  async updateTicket(ticketId: string, input: UpdateTicketInput): Promise<SupportTicket> {
    const updateData: any = { ...input };

    // Convert tags array to JSON if provided
    if (input.tags) {
      updateData.tags = JSON.stringify(input.tags);
    }

    // Mark as resolved if status changes to RESOLVED
    if (input.status === TicketStatus.RESOLVED && !updateData.resolvedAt) {
      updateData.resolvedAt = new Date();
    }

    // Mark as closed if status changes to CLOSED
    if (input.status === TicketStatus.CLOSED && !updateData.closedAt) {
      updateData.closedAt = new Date();
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    // Check for SLA breach after updates
    await this.checkSLABreach(ticketId);

    logger.info(`Ticket updated: ${ticketId}`);
    return ticket;
  }

  // Get ticket by ID
  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    return prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        sentimentAlerts: {
          orderBy: { triggered: 'desc' },
        },
      },
    });
  }

  // List tickets with filters
  async listTickets(filters: TicketFilters, page: number = 1, limit: number = 20): Promise<{ tickets: SupportTicket[]; total: number }> {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.category) where.category = filters.category;
    if (filters.slaBreach !== undefined) where.slaBreach = filters.slaBreach;

    // Search in subject and description
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return { tickets, total };
  }

  // Add comment to ticket
  async addComment(ticketId: string, userId: string, content: string, isInternal: boolean = false): Promise<TicketMessage> {
    const comment = await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId,
        content,
        isInternal,
        sender: 'USER', // Assuming MessageSender enum has USER
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update first response time if this is the first response from an agent
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { firstResponseAt: true },
    });

    if (!ticket?.firstResponseAt) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }

    // Analyze sentiment for customer messages (async, don't block the response)
    if (!isInternal) {
      // Import sentiment service dynamically to avoid circular dependencies
      import('../services/sentiment.service').then(({ sentimentService }) => {
        sentimentService.analyzeTicketMessage(comment.id).catch((error) => {
          logger.error('Failed to analyze sentiment for message', {
            messageId: comment.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      });
    }

    logger.info(`Comment added to ticket: ${ticketId}`);
    return comment;
  }

  // Assign ticket to user
  async assignTicket(ticketId: string, assignedTo: string): Promise<SupportTicket> {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo,
        status: TicketStatus.IN_PROGRESS,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Ticket ${ticketId} assigned to ${assignedTo}`);
    return ticket;
  }

  // Auto-assign tickets using round-robin
  async autoAssignTicket(ticketId: string): Promise<void> {
    try {
      // Get all users with AGENT or ADMIN role
      const agents = await prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                name: {
                  in: ['AGENT', 'ADMIN'],
                },
              },
            },
          },
        },
        include: {
          _count: {
            select: {
              supportTickets: {
                where: {
                  status: {
                    in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
                  },
                },
              },
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      if (agents.length === 0) {
        logger.warn('No agents available for auto-assignment');
        return;
      }

      // Find agent with least open tickets (round-robin with load balancing)
      const leastBusyAgent = agents.reduce((prev, current) =>
        prev._count.supportTickets < current._count.supportTickets ? prev : current
      );

      await this.assignTicket(ticketId, leastBusyAgent.id);
    } catch (error) {
      logger.error('Auto-assignment failed:', error);
    }
  }

  // Close ticket
  async closeTicket(ticketId: string, userId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: TicketStatus.CLOSED,
    });
  }

  // Check and update SLA breach status
  async checkSLABreach(ticketId: string): Promise<void> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return;

    const now = new Date();
    const createdAt = new Date(ticket.createdAt);
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    let slaBreach = false;

    // Check response time SLA
    if (!ticket.firstResponseAt && ticket.slaResponseTime) {
      if (elapsedMinutes > ticket.slaResponseTime) {
        slaBreach = true;
      }
    }

    // Check resolution time SLA
    if (!ticket.resolvedAt && ticket.slaResolveTime) {
      if (elapsedMinutes > ticket.slaResolveTime) {
        slaBreach = true;
      }
    }

    if (slaBreach !== ticket.slaBreach) {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { slaBreach },
      });

      if (slaBreach) {
        logger.warn(`SLA breach detected for ticket: ${ticketId}`);
        await this.escalateTicket(ticketId);
      }
    }
  }

  // Escalate ticket (increase priority)
  async escalateTicket(ticketId: string): Promise<void> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) return;

    let newPriority: TicketPriority | null = null;

    switch (ticket.priority) {
      case TicketPriority.LOW:
        newPriority = TicketPriority.MEDIUM;
        break;
      case TicketPriority.MEDIUM:
        newPriority = TicketPriority.HIGH;
        break;
      case TicketPriority.HIGH:
        newPriority = TicketPriority.CRITICAL;
        break;
    }

    if (newPriority) {
      await this.updateTicket(ticketId, { priority: newPriority });
      logger.info(`Ticket ${ticketId} escalated to ${newPriority}`);
    }
  }

  // Bulk operations
  async bulkOperation(operation: BulkOperation): Promise<{ success: number; failed: number }> {
    const { ticketIds, operation: op, data } = operation;
    let success = 0;
    let failed = 0;

    for (const ticketId of ticketIds) {
      try {
        switch (op) {
          case 'assign':
            await this.assignTicket(ticketId, data.assignedTo);
            break;
          case 'close':
            await this.closeTicket(ticketId, data.userId);
            break;
          case 'update_priority':
            await this.updateTicket(ticketId, { priority: data.priority });
            break;
          case 'add_tag':
            const ticket = await this.getTicketById(ticketId);
            if (ticket) {
              const existingTags = ticket.tags ? JSON.parse(ticket.tags) : [];
              const updatedTags = [...new Set([...existingTags, data.tag])];
              await this.updateTicket(ticketId, { tags: updatedTags });
            }
            break;
        }
        success++;
      } catch (error) {
        logger.error(`Bulk operation failed for ticket ${ticketId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // Get ticket statistics
  async getTicketStats(userId?: string): Promise<any> {
    const where: any = userId ? { userId } : {};

    const [total, open, inProgress, resolved, closed, breached] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.OPEN } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.IN_PROGRESS } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.RESOLVED } }),
      prisma.supportTicket.count({ where: { ...where, status: TicketStatus.CLOSED } }),
      prisma.supportTicket.count({ where: { ...where, slaBreach: true } }),
    ]);

    // Average response time
    const tickets = await prisma.supportTicket.findMany({
      where: {
        ...where,
        firstResponseAt: { not: null },
      },
      select: {
        createdAt: true,
        firstResponseAt: true,
      },
    });

    const avgResponseTime = tickets.length > 0
      ? tickets.reduce((sum, ticket) => {
          const responseTime = (new Date(ticket.firstResponseAt!).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60);
          return sum + responseTime;
        }, 0) / tickets.length
      : 0;

    return {
      total,
      byStatus: {
        open,
        inProgress,
        resolved,
        closed,
      },
      slaBreach: breached,
      avgResponseTime: Math.round(avgResponseTime),
    };
  }

  // Run periodic SLA check for all open tickets
  async runSLACheck(): Promise<void> {
    const openTickets = await prisma.supportTicket.findMany({
      where: {
        status: {
          in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS],
        },
      },
      select: { id: true },
    });

    for (const ticket of openTickets) {
      await this.checkSLABreach(ticket.id);
    }

    logger.info(`SLA check completed for ${openTickets.length} tickets`);
  }
}

export const ticketService = new TicketService();
