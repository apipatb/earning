import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Plugin controller for marketplace
export const createPlugin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const {
      name,
      description,
      version,
      category,
      tags,
      documentation,
      sourceCode,
      permissions,
      price,
      isPublished,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate plugin ID and unique token
    const pluginId = crypto.randomBytes(16).toString('hex');
    const uniqueToken = crypto.randomBytes(32).toString('hex');

    const plugin = await prisma.plugin.create({
      data: {
        pluginId,
        publisherId: userId,
        name,
        description,
        version,
        category,
        tags: tags || [],
        documentation: documentation || '',
        sourceCode: sourceCode || '',
        permissions: permissions || [],
        price: price || 0,
        isPublished: isPublished || false,
        uniqueToken,
        downloadCount: 0,
        rating: 0,
        reviewCount: 0,
      },
    });

    res.status(201).json({
      message: 'Plugin created',
      plugin,
    });
  } catch (error) {
    next(error);
  }
};

export const listMarketplacePlugins = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, search, sort = 'downloads', limit = 20, offset = 0 } = req.query;

    let where: any = { isPublished: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { hasSome: [(search as string).toLowerCase()] } },
      ];
    }

    let orderBy: any = { downloadCount: 'desc' };
    if (sort === 'rating') {
      orderBy = { rating: 'desc' };
    } else if (sort === 'recent') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'trending') {
      orderBy = { downloadCount: 'desc' };
    }

    const plugins = await prisma.plugin.findMany({
      where,
      orderBy,
      take: Number(limit) || 20,
      skip: Number(offset) || 0,
      include: {
        publisher: {
          select: { name: true, email: true },
        },
        reviews: {
          take: 5,
          select: { rating: true, comment: true, author: { select: { name: true } } },
        },
      },
    });

    const total = await prisma.plugin.count({ where });

    res.json({
      plugins,
      pagination: {
        total,
        limit: Number(limit) || 20,
        offset: Number(offset) || 0,
        hasMore: (Number(offset) || 0) + (Number(limit) || 20) < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPluginDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pluginId } = req.params;

    const plugin = await prisma.plugin.findFirst({
      where: { pluginId },
      include: {
        publisher: {
          select: { id: true, name: true, email: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { name: true, email: true } },
          },
        },
        installedBy: {
          select: { id: true },
        },
      },
    });

    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    res.json({
      plugin,
      stats: {
        downloads: plugin.downloadCount,
        rating: plugin.rating,
        reviewCount: plugin.reviewCount,
        installedCount: plugin.installedBy.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const installPlugin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { pluginId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plugin = await prisma.plugin.findFirst({
      where: { pluginId, isPublished: true },
    });

    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    // Check if already installed
    const existingInstall = await prisma.pluginInstallation.findFirst({
      where: { userId, pluginId },
    });

    if (existingInstall) {
      return res.status(400).json({ error: 'Plugin already installed' });
    }

    const installation = await prisma.pluginInstallation.create({
      data: {
        userId,
        pluginId,
        version: plugin.version,
        isActive: true,
        config: {},
      },
    });

    // Increment download count
    await prisma.plugin.update({
      where: { pluginId },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    res.status(201).json({
      message: 'Plugin installed',
      installation,
    });
  } catch (error) {
    next(error);
  }
};

export const uninstallPlugin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { pluginId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const installation = await prisma.pluginInstallation.findFirst({
      where: { userId, pluginId },
    });

    if (!installation) {
      return res.status(404).json({ error: 'Plugin installation not found' });
    }

    await prisma.pluginInstallation.delete({
      where: { id: installation.id },
    });

    res.json({ message: 'Plugin uninstalled' });
  } catch (error) {
    next(error);
  }
};

export const getInstalledPlugins = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const installations = await prisma.pluginInstallation.findMany({
      where: { userId },
      include: {
        plugin: {
          include: {
            publisher: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { installedAt: 'desc' },
    });

    res.json(installations);
  } catch (error) {
    next(error);
  }
};

export const updatePluginConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { pluginId } = req.params;
    const { config, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const installation = await prisma.pluginInstallation.findFirst({
      where: { userId, pluginId },
    });

    if (!installation) {
      return res.status(404).json({ error: 'Plugin installation not found' });
    }

    const updated = await prisma.pluginInstallation.update({
      where: { id: installation.id },
      data: {
        ...(config && { config }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      message: 'Plugin configuration updated',
      installation: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewPlugin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { pluginId } = req.params;
    const { rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const plugin = await prisma.plugin.findFirst({
      where: { pluginId },
    });

    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }

    // Check if user has reviewed before
    const existingReview = await prisma.pluginReview.findFirst({
      where: { pluginId, authorId: userId },
    });

    if (existingReview) {
      const updated = await prisma.pluginReview.update({
        where: { id: existingReview.id },
        data: { rating, comment },
      });

      // Recalculate plugin rating
      await recalculatePluginRating(pluginId);

      return res.json({
        message: 'Review updated',
        review: updated,
      });
    }

    const review = await prisma.pluginReview.create({
      data: {
        pluginId,
        authorId: userId,
        rating,
        comment: comment || '',
      },
    });

    // Increment review count and update rating
    const allReviews = await prisma.pluginReview.findMany({
      where: { pluginId },
    });

    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.plugin.update({
      where: { pluginId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: allReviews.length,
      },
    });

    res.status(201).json({
      message: 'Review created',
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const getPluginReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pluginId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const reviews = await prisma.pluginReview.findMany({
      where: { pluginId },
      include: {
        author: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 10,
      skip: Number(offset) || 0,
    });

    const total = await prisma.pluginReview.count({ where: { pluginId } });

    res.json({
      reviews,
      pagination: {
        total,
        limit: Number(limit) || 10,
        offset: Number(offset) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublisherPlugins = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plugins = await prisma.plugin.findMany({
      where: { publisherId: userId },
      include: {
        reviews: {
          select: { rating: true },
        },
        installedBy: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = plugins.map((p) => ({
      ...p,
      stats: {
        downloads: p.downloadCount,
        installs: p.installedBy.length,
        reviews: p.reviewCount,
        rating: p.rating,
      },
    }));

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const publishPlugin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    const { pluginId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const plugin = await prisma.plugin.findFirst({
      where: { pluginId, publisherId: userId },
    });

    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found or unauthorized' });
    }

    const updated = await prisma.plugin.update({
      where: { pluginId },
      data: { isPublished: true },
    });

    res.json({
      message: 'Plugin published',
      plugin: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getMarketplaceStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalPlugins = await prisma.plugin.count({ where: { isPublished: true } });
    const totalInstallations = await prisma.pluginInstallation.count();
    const totalReviews = await prisma.pluginReview.count();

    const topPlugins = await prisma.plugin.findMany({
      where: { isPublished: true },
      orderBy: { downloadCount: 'desc' },
      take: 5,
      select: { name: true, downloadCount: true, rating: true },
    });

    const categories = await prisma.plugin.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    res.json({
      stats: {
        totalPlugins,
        totalInstallations,
        totalReviews,
        uniqueCategories: categories.length,
      },
      topPlugins,
      categories: categories.map((c) => c.category),
    });
  } catch (error) {
    next(error);
  }
};

// Helper function
async function recalculatePluginRating(pluginId: string) {
  const reviews = await prisma.pluginReview.findMany({
    where: { pluginId },
  });

  if (reviews.length === 0) return;

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await prisma.plugin.update({
    where: { pluginId },
    data: {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length,
    },
  });
}
