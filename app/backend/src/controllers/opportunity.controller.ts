import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';

const opportunitySchema = z.object({
  title: z.string().max(100),
  description: z.string().optional(),
  platform: z.string().max(50),
  category: z.string().max(50),
  estimatedPay: z.number().positive().optional(),
  difficulty: z.string().max(20).optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  url: z.string().url().optional(),
  status: z.string().max(20).optional(),
  notes: z.string().optional(),
});

export const getAllOpportunities = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { status, platform, category, difficulty, limit = '100', offset = '0' } = req.query;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (platform) {
      where.platform = platform;
    }

    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.opportunity.count({ where }),
    ]);

    const formatted = opportunities.map((opp) => ({
      id: opp.id,
      title: opp.title,
      description: opp.description,
      platform: opp.platform,
      category: opp.category,
      estimated_pay: opp.estimatedPay ? Number(opp.estimatedPay) : null,
      difficulty: opp.difficulty,
      deadline: opp.deadline ? opp.deadline.toISOString().split('T')[0] : null,
      url: opp.url,
      status: opp.status,
      notes: opp.notes,
      created_at: opp.createdAt.toISOString().split('T')[0],
    }));

    res.json({
      opportunities: formatted,
      total,
      has_more: total > parseInt(offset as string) + parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch opportunities',
    });
  }
};

export const createOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = opportunitySchema.parse(req.body);

    const opportunity = await prisma.opportunity.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        platform: data.platform,
        category: data.category,
        estimatedPay: data.estimatedPay,
        difficulty: data.difficulty || 'medium',
        deadline: data.deadline ? new Date(data.deadline) : null,
        url: data.url,
        status: data.status || 'new',
        notes: data.notes,
      },
    });

    res.status(201).json({
      opportunity: {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        platform: opportunity.platform,
        category: opportunity.category,
        estimated_pay: opportunity.estimatedPay ? Number(opportunity.estimatedPay) : null,
        difficulty: opportunity.difficulty,
        deadline: opportunity.deadline ? opportunity.deadline.toISOString().split('T')[0] : null,
        url: opportunity.url,
        status: opportunity.status,
        notes: opportunity.notes,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Create opportunity error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create opportunity',
    });
  }
};

export const updateOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const opportunityId = req.params.id;
    const data = opportunitySchema.partial().parse(req.body);

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, userId },
    });

    if (!opportunity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Opportunity not found',
      });
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.estimatedPay !== undefined) updateData.estimatedPay = data.estimatedPay;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.opportunity.update({
      where: { id: opportunityId },
      data: updateData,
    });

    res.json({
      opportunity: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        platform: updated.platform,
        category: updated.category,
        estimated_pay: updated.estimatedPay ? Number(updated.estimatedPay) : null,
        difficulty: updated.difficulty,
        deadline: updated.deadline ? updated.deadline.toISOString().split('T')[0] : null,
        url: updated.url,
        status: updated.status,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update opportunity',
    });
  }
};

export const deleteOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const opportunityId = req.params.id;

    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, userId },
    });

    if (!opportunity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Opportunity not found',
      });
    }

    await prisma.opportunity.delete({
      where: { id: opportunityId },
    });

    res.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete opportunity',
    });
  }
};

export const getOpportunitiesByStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const opportunities = await prisma.opportunity.groupBy({
      by: ['status'],
      where: { userId },
      _count: {
        id: true,
      },
      _sum: {
        estimatedPay: true,
      },
    });

    const formatted = opportunities.map((opp) => ({
      status: opp.status,
      count: opp._count.id,
      total_estimated_pay: opp._sum.estimatedPay ? Number(opp._sum.estimatedPay) : 0,
    }));

    res.json({ opportunities_by_status: formatted });
  } catch (error) {
    console.error('Get opportunities by status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch opportunities by status',
    });
  }
};
