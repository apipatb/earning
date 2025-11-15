import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lead Management
export const createLead = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      jobTitle,
      source,
      status,
      score,
      notes,
    } = req.body;
    const userId = (req as any).userId;

    const lead = await prisma.lead.create({
      data: {
        userId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        company: company || null,
        jobTitle: jobTitle || null,
        source: source || 'unknown', // website, referral, email, event, social, other
        status: status || 'new', // new, contacted, qualified, proposal, negotiating, won, lost
        score: score || 0, // 0-100 lead score
        notes: notes || null,
        createdAt: new Date(),
      },
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create lead' });
  }
};

export const getLeads = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, source, search, limit = 50, page = 1 } = req.query;

    const where: any = { userId };
    if (status) where.status = status;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      include: {
        communications: true,
        activities: true,
      },
    });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

export const getLeadById = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const userId = (req as any).userId;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
      include: {
        communications: {
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { firstName, lastName, email, phone, company, jobTitle, status, score, notes } = req.body;
    const userId = (req as any).userId;

    const lead = await prisma.lead.updateMany({
      where: { id: leadId, userId },
      data: {
        firstName,
        lastName,
        email,
        phone,
        company,
        jobTitle,
        status,
        score,
        notes,
        updatedAt: new Date(),
      },
    });

    res.json({ success: lead.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update lead' });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const userId = (req as any).userId;

    await prisma.lead.deleteMany({
      where: { id: leadId, userId },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete lead' });
  }
};

export const updateLeadScore = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { score } = req.body;
    const userId = (req as any).userId;

    const lead = await prisma.lead.updateMany({
      where: { id: leadId, userId },
      data: {
        score: Math.min(100, Math.max(0, score)), // Clamp between 0-100
        updatedAt: new Date(),
      },
    });

    res.json({ success: lead.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update lead score' });
  }
};

export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;
    const userId = (req as any).userId;

    const lead = await prisma.lead.updateMany({
      where: { id: leadId, userId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: lead.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update lead status' });
  }
};

// Lead Communications
export const addLeadCommunication = async (req: Request, res: Response) => {
  try {
    const { leadId, type, subject, notes } = req.body;
    const userId = (req as any).userId;

    const communication = await prisma.leadCommunication.create({
      data: {
        userId,
        leadId,
        type: type || 'email', // email, call, meeting, note
        subject,
        notes,
        communicatedAt: new Date(),
        createdAt: new Date(),
      },
    });

    res.status(201).json(communication);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add communication' });
  }
};

export const getLeadCommunications = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.query;
    const userId = (req as any).userId;

    const communications = await prisma.leadCommunication.findMany({
      where: {
        userId,
        leadId: leadId as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(communications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
};

// Lead Activities
export const addLeadActivity = async (req: Request, res: Response) => {
  try {
    const { leadId, type, description } = req.body;
    const userId = (req as any).userId;

    const activity = await prisma.leadActivity.create({
      data: {
        userId,
        leadId,
        type: type || 'note', // call, email, meeting, note, task
        description,
        createdAt: new Date(),
      },
    });

    res.status(201).json(activity);
  } catch (error) {
    res.status(400).json({ error: 'Failed to add activity' });
  }
};

export const getLeadActivities = async (req: Request, res: Response) => {
  try {
    const { leadId } = req.query;
    const userId = (req as any).userId;

    const activities = await prisma.leadActivity.findMany({
      where: {
        userId,
        leadId: leadId as string,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

// Sales Pipeline
export const getSalesPipeline = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiating', 'won', 'lost'];
    const pipeline: any = {};

    for (const status of statuses) {
      const count = await prisma.lead.count({
        where: { userId, status },
      });
      const avgScore = await prisma.lead.aggregate({
        where: { userId, status },
        _avg: { score: true },
      });
      pipeline[status] = {
        count,
        averageScore: avgScore._avg.score || 0,
      };
    }

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales pipeline' });
  }
};

// Lead Sources
export const getLeadSources = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const sources = await prisma.lead.groupBy({
      by: ['source'],
      where: { userId },
      _count: true,
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead sources' });
  }
};

// Lead Analytics
export const getLeadAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const totalLeads = await prisma.lead.count({
      where: { userId },
    });

    const newLeads = await prisma.lead.count({
      where: {
        userId,
        createdAt: { gte: startDate },
      },
    });

    const qualifiedLeads = await prisma.lead.count({
      where: {
        userId,
        status: { in: ['qualified', 'proposal', 'negotiating', 'won'] },
      },
    });

    const wonLeads = await prisma.lead.count({
      where: {
        userId,
        status: 'won',
      },
    });

    const lostLeads = await prisma.lead.count({
      where: {
        userId,
        status: 'lost',
      },
    });

    const avgLeadScore = await prisma.lead.aggregate({
      where: { userId },
      _avg: { score: true },
    });

    const conversionRate =
      totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(2) : '0';

    const analytics = {
      period: days,
      totalLeads,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      avgLeadScore: avgLeadScore._avg.score || 0,
      conversionRate: parseFloat(conversionRate as string),
      activeLeads: totalLeads - wonLeads - lostLeads,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Lead Statistics
export const getLeadStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const leads = await prisma.lead.findMany({
      where: { userId },
      include: {
        communications: true,
        activities: true,
      },
    });

    const statusBreakdown = {
      new: leads.filter((l) => l.status === 'new').length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      proposal: leads.filter((l) => l.status === 'proposal').length,
      negotiating: leads.filter((l) => l.status === 'negotiating').length,
      won: leads.filter((l) => l.status === 'won').length,
      lost: leads.filter((l) => l.status === 'lost').length,
    };

    const sourceBreakdown = {
      website: leads.filter((l) => l.source === 'website').length,
      referral: leads.filter((l) => l.source === 'referral').length,
      email: leads.filter((l) => l.source === 'email').length,
      event: leads.filter((l) => l.source === 'event').length,
      social: leads.filter((l) => l.source === 'social').length,
      other: leads.filter((l) => l.source === 'other').length,
    };

    const stats = {
      totalLeads: leads.length,
      highScoreLeads: leads.filter((l) => l.score >= 75).length,
      mediumScoreLeads: leads.filter((l) => l.score >= 50 && l.score < 75).length,
      lowScoreLeads: leads.filter((l) => l.score < 50).length,
      avgLeadScore:
        leads.length > 0
          ? (leads.reduce((sum, l) => sum + l.score, 0) / leads.length).toFixed(2)
          : 0,
      avgActivitiesPerLead:
        leads.length > 0
          ? (leads.reduce((sum, l) => sum + l.activities.length, 0) / leads.length).toFixed(2)
          : 0,
      avgCommunicationsPerLead:
        leads.length > 0
          ? (leads.reduce((sum, l) => sum + l.communications.length, 0) / leads.length).toFixed(2)
          : 0,
      statusBreakdown,
      sourceBreakdown,
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Lead Conversion
export const convertLeadToClient = async (req: Request, res: Response) => {
  try {
    const { leadId, clientName, email, phone, address } = req.body;
    const userId = (req as any).userId;

    // Get lead details
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create client from lead
    const client = await prisma.client.create({
      data: {
        userId,
        clientName: clientName || `${lead.firstName} ${lead.lastName}`,
        email: email || lead.email,
        phone: phone || lead.phone,
        address: address || null,
        status: 'active',
        createdAt: new Date(),
      },
    });

    // Mark lead as converted
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'won',
        convertedToClientId: client.id,
        updatedAt: new Date(),
      },
    });

    res.status(201).json({ client, lead: { id: leadId, status: 'won' } });
  } catch (error) {
    res.status(400).json({ error: 'Failed to convert lead to client' });
  }
};

// Lead Segments
export const getLeadSegments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const segments = {
      highValue: await prisma.lead.count({
        where: { userId, score: { gte: 75 } },
      }),
      hotLeads: await prisma.lead.count({
        where: { userId, status: { in: ['proposal', 'negotiating'] } },
      }),
      atRisk: await prisma.lead.count({
        where: {
          userId,
          status: 'negotiating',
          score: { lt: 50 },
        },
      }),
      newLeads: await prisma.lead.count({
        where: {
          userId,
          status: 'new',
        },
      }),
      converted: await prisma.lead.count({
        where: {
          userId,
          status: 'won',
        },
      }),
      lost: await prisma.lead.count({
        where: {
          userId,
          status: 'lost',
        },
      }),
    };

    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead segments' });
  }
};
