import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Ticket Management
export const createTicket = async (req: Request, res: Response) => {
  try {
    const { clientId, subject, description, priority, category } = req.body;
    const userId = (req as any).userId;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        clientId,
        ticketNumber: `TKT-${Date.now()}`,
        subject,
        description,
        priority: priority || 'medium', // low, medium, high, urgent
        category: category || 'general',
        status: 'open',
        createdAt: new Date(),
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create ticket' });
  }
};

export const getTickets = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, priority, clientId, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (clientId) where.clientId = clientId;

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      include: {
        responses: true,
      },
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const userId = (req as any).userId;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        responses: {
          orderBy: { createdAt: 'asc' },
        },
        client: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
};

export const updateTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { status, priority, subject } = req.body;
    const userId = (req as any).userId;

    const ticket = await prisma.supportTicket.updateMany({
      where: { id: ticketId, userId },
      data: {
        status,
        priority,
        subject,
        updatedAt: new Date(),
      },
    });

    res.json({ success: ticket.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update ticket' });
  }
};

export const closeTicket = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { resolutionNote } = req.body;
    const userId = (req as any).userId;

    const ticket = await prisma.supportTicket.updateMany({
      where: { id: ticketId, userId },
      data: {
        status: 'closed',
        resolutionNote: resolutionNote || null,
        closedAt: new Date(),
      },
    });

    res.json({ success: ticket.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to close ticket' });
  }
};

// Ticket Responses
export const addResponse = async (req: Request, res: Response) => {
  try {
    const { ticketId, message, isInternal } = req.body;
    const userId = (req as any).userId;

    const response = await prisma.ticketResponse.create({
      data: {
        ticketId,
        userId,
        message,
        isInternal: isInternal || false,
        createdAt: new Date(),
      },
    });

    // Update ticket status to 'in_progress' if it was 'open'
    await prisma.supportTicket.updateMany({
      where: { id: ticketId, status: 'open' },
      data: { status: 'in_progress' },
    });

    res.status(201).json(response);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add response' });
  }
};

export const getResponses = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.query;
    const userId = (req as any).userId;

    const responses = await prisma.ticketResponse.findMany({
      where: {
        ticketId: ticketId as string,
        ticket: { userId },
      },
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
    });

    res.json(responses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
};

// Knowledge Base
export const createArticle = async (req: Request, res: Response) => {
  try {
    const { title, content, category, tags, isPublished } = req.body;
    const userId = (req as any).userId;

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        userId,
        title,
        slug: title.toLowerCase().replace(/\s+/g, '-'),
        content,
        category: category || 'general',
        tags: tags ? JSON.stringify(tags) : null,
        isPublished: isPublished || false,
        views: 0,
        createdAt: new Date(),
      },
    });

    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create article' });
  }
};

export const getArticles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category, isPublished = true, limit = 50 } = req.query;

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where: {
        userId,
        isPublished: isPublished === 'true' ? true : undefined,
        ...(category && { category: category as string }),
      },
      orderBy: { views: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
};

export const getArticleBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const article = await prisma.knowledgeBaseArticle.findFirst({
      where: { slug, isPublished: true },
    });

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment views
    await prisma.knowledgeBaseArticle.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
};

export const updateArticle = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    const { title, content, category, isPublished } = req.body;
    const userId = (req as any).userId;

    const article = await prisma.knowledgeBaseArticle.updateMany({
      where: { id: articleId, userId },
      data: {
        title,
        content,
        category,
        isPublished,
        updatedAt: new Date(),
      },
    });

    res.json({ success: article.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update article' });
  }
};

// Support Categories
export const getSupportCategories = async (req: Request, res: Response) => {
  try {
    const categories = [
      { id: 'billing', name: 'Billing & Payments', icon: '💳' },
      { id: 'technical', name: 'Technical Issue', icon: '⚙️' },
      { id: 'account', name: 'Account Management', icon: '👤' },
      { id: 'feature', name: 'Feature Request', icon: '✨' },
      { id: 'documentation', name: 'Documentation', icon: '📚' },
      { id: 'general', name: 'General Inquiry', icon: '❓' },
      { id: 'feedback', name: 'Feedback', icon: '💬' },
      { id: 'security', name: 'Security', icon: '🔒' },
    ];

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Support Metrics
export const getSupportMetrics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const totalTickets = await prisma.supportTicket.count({
      where: { userId, createdAt: { gte: startDate } },
    });

    const openTickets = await prisma.supportTicket.count({
      where: { userId, status: 'open', createdAt: { gte: startDate } },
    });

    const closedTickets = await prisma.supportTicket.count({
      where: { userId, status: 'closed', createdAt: { gte: startDate } },
    });

    const urgentTickets = await prisma.supportTicket.count({
      where: { userId, priority: 'urgent', createdAt: { gte: startDate } },
    });

    const metrics = {
      period: days,
      totalTickets,
      openTickets,
      closedTickets,
      urgentTickets,
      avgResolutionTime: closedTickets > 0 ? Math.random() * 48 : 0, // Simulated
      customerSatisfaction: 4.5, // Simulated
      firstResponseTime: 2.5, // hours - Simulated
      timestamp: new Date(),
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

// Support Reports
export const generateSupportReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, category } = req.body;
    const userId = (req as any).userId;

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        ...(category && { category }),
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        responses: true,
      },
    });

    const statusBreakdown = {
      open: tickets.filter((t) => t.status === 'open').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      closed: tickets.filter((t) => t.status === 'closed').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
    };

    const priorityBreakdown = {
      low: tickets.filter((t) => t.priority === 'low').length,
      medium: tickets.filter((t) => t.priority === 'medium').length,
      high: tickets.filter((t) => t.priority === 'high').length,
      urgent: tickets.filter((t) => t.priority === 'urgent').length,
    };

    const report = {
      period: { start: startDate, end: endDate },
      totalTickets: tickets.length,
      statusBreakdown,
      priorityBreakdown,
      totalResponses: tickets.reduce((sum, t) => sum + t.responses.length, 0),
      generatedAt: new Date(),
    };

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate report' });
  }
};

// Ticket Statistics
export const getTicketStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      include: {
        responses: true,
      },
    });

    const stats = {
      totalTickets: tickets.length,
      openTickets: tickets.filter((t) => t.status === 'open').length,
      closedTickets: tickets.filter((t) => t.status === 'closed').length,
      avgResponseCount:
        tickets.length > 0
          ? tickets.reduce((sum, t) => sum + t.responses.length, 0) / tickets.length
          : 0,
      urgentCount: tickets.filter((t) => t.priority === 'urgent').length,
      resolutionRate:
        tickets.length > 0
          ? (tickets.filter((t) => t.status === 'closed').length / tickets.length) * 100
          : 0,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// FAQ Management
export const createFAQ = async (req: Request, res: Response) => {
  try {
    const { question, answer, category, order } = req.body;
    const userId = (req as any).userId;

    const faq = await prisma.faqEntry.create({
      data: {
        userId,
        question,
        answer,
        category: category || 'general',
        order: order || 0,
        isActive: true,
        createdAt: new Date(),
      },
    });

    res.status(201).json(faq);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create FAQ' });
  }
};

export const getFAQs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category } = req.query;

    const faqs = await prisma.faqEntry.findMany({
      where: {
        userId,
        isActive: true,
        ...(category && { category: category as string }),
      },
      orderBy: { order: 'asc' },
    });

    res.json(faqs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
};
