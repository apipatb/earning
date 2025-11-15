import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';

const affiliateLinkSchema = z.object({
  name: z.string().max(100),
  description: z.string().optional(),
  url: z.string().url(),
  category: z.string().max(50),
  conversionRate: z.number().optional(),
  isActive: z.boolean().optional(),
});

const affiliateEarningSchema = z.object({
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(100).optional(),
});

export const getAllAffiliateLinks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { category, is_active, limit = '100', offset = '0' } = req.query;

    const where: any = { userId };

    if (is_active !== undefined) {
      where.isActive = is_active === 'true';
    }

    if (category) {
      where.category = category;
    }

    const [links, total] = await Promise.all([
      prisma.affiliateLink.findMany({
        where,
        include: {
          clicks: {
            select: { id: true },
          },
          earnings_log: {
            select: { id: true, amount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.affiliateLink.count({ where }),
    ]);

    const formatted = links.map((link) => ({
      id: link.id,
      name: link.name,
      description: link.description,
      url: link.url,
      category: link.category,
      click_count: link.clickCount,
      earnings: Number(link.earnings),
      conversion_rate: link.conversionRate ? Number(link.conversionRate) : null,
      is_active: link.isActive,
      created_at: link.createdAt.toISOString().split('T')[0],
    }));

    res.json({
      affiliate_links: formatted,
      total,
      has_more: total > parseInt(offset as string) + parseInt(limit as string),
    });
  } catch (error) {
    console.error('Get affiliate links error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch affiliate links',
    });
  }
};

export const createAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = affiliateLinkSchema.parse(req.body);

    const link = await prisma.affiliateLink.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        url: data.url,
        category: data.category,
        conversionRate: data.conversionRate,
        isActive: data.isActive !== false,
      },
    });

    res.status(201).json({
      affiliate_link: {
        id: link.id,
        name: link.name,
        description: link.description,
        url: link.url,
        category: link.category,
        click_count: link.clickCount,
        earnings: Number(link.earnings),
        conversion_rate: link.conversionRate ? Number(link.conversionRate) : null,
        is_active: link.isActive,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Create affiliate link error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create affiliate link',
    });
  }
};

export const updateAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const linkId = req.params.id;
    const data = affiliateLinkSchema.partial().parse(req.body);

    const link = await prisma.affiliateLink.findFirst({
      where: { id: linkId, userId },
    });

    if (!link) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate link not found',
      });
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.conversionRate !== undefined) updateData.conversionRate = data.conversionRate;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await prisma.affiliateLink.update({
      where: { id: linkId },
      data: updateData,
    });

    res.json({
      affiliate_link: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        url: updated.url,
        category: updated.category,
        click_count: updated.clickCount,
        earnings: Number(updated.earnings),
        conversion_rate: updated.conversionRate ? Number(updated.conversionRate) : null,
        is_active: updated.isActive,
      },
    });
  } catch (error) {
    console.error('Update affiliate link error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update affiliate link',
    });
  }
};

export const deleteAffiliateLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const linkId = req.params.id;

    const link = await prisma.affiliateLink.findFirst({
      where: { id: linkId, userId },
    });

    if (!link) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate link not found',
      });
    }

    await prisma.affiliateLink.delete({
      where: { id: linkId },
    });

    res.json({ message: 'Affiliate link deleted successfully' });
  } catch (error) {
    console.error('Delete affiliate link error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete affiliate link',
    });
  }
};

export const recordClick = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const linkId = req.params.id;
    const { country, device, referrer } = req.body;

    const link = await prisma.affiliateLink.findFirst({
      where: { id: linkId, userId },
    });

    if (!link) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate link not found',
      });
    }

    const click = await prisma.affiliateClick.create({
      data: {
        linkId,
        country,
        device,
        referrer,
      },
    });

    await prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });

    res.status(201).json({ click });
  } catch (error) {
    console.error('Record click error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record click',
    });
  }
};

export const addAffiliateEarning = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const linkId = req.params.id;
    const data = affiliateEarningSchema.parse(req.body);

    const link = await prisma.affiliateLink.findFirst({
      where: { id: linkId, userId },
    });

    if (!link) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate link not found',
      });
    }

    const earning = await prisma.affiliateEarning.create({
      data: {
        linkId,
        amount: data.amount,
        date: new Date(data.date),
        description: data.description,
      },
    });

    await prisma.affiliateLink.update({
      where: { id: linkId },
      data: {
        earnings: {
          increment: data.amount,
        },
      },
    });

    res.status(201).json({
      earning: {
        id: earning.id,
        amount: Number(earning.amount),
        date: earning.date.toISOString().split('T')[0],
        description: earning.description,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Add affiliate earning error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add affiliate earning',
    });
  }
};

export const getAffiliateStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const linkId = req.params.id;

    const link = await prisma.affiliateLink.findFirst({
      where: { id: linkId, userId },
      include: {
        clicks: true,
        earnings_log: true,
      },
    });

    if (!link) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Affiliate link not found',
      });
    }

    const totalEarnings = link.earnings_log.reduce((sum, e) => sum + Number(e.amount), 0);
    const conversionRate = link.clickCount > 0 ? (link.earnings_log.length / link.clickCount) * 100 : 0;

    res.json({
      stats: {
        total_clicks: link.clickCount,
        total_conversions: link.earnings_log.length,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        total_earnings: totalEarnings,
      },
    });
  } catch (error) {
    console.error('Get affiliate stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch affiliate stats',
    });
  }
};
