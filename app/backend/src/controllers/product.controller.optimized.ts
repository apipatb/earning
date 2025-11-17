import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';
import { cache, CacheKeys, CacheTTL } from '../utils/cache';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
});

export const getAllProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { isActive, limit: limitParam, offset: offsetParam } = req.query;

    // Parse pagination parameters with safe defaults
    const limit = parseLimitParam(limitParam);
    const offset = parseOffsetParam(offsetParam);

    // Create cache key including query parameters
    const cacheKey = `${CacheKeys.products(userId)}:${isActive}:${limit}:${offset}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug(`[Cache] Products cache hit for user ${userId}`);
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `public, max-age=${CacheTTL.FIFTEEN_MINUTES / 1000}`);
      return res.json(cached);
    }

    const where: any = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // OPTIMIZATION FIX: Use single grouped query instead of N+1 queries
    // Get all sales stats for these products in one query using groupBy
    const productIds = products.map((p) => p.id);
    const salesByProduct = productIds.length > 0 ? await prisma.sale.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _count: true,
      _sum: {
        totalAmount: true,
        quantity: true,
      },
    }) : [];

    // Create a map for quick lookup
    const salesStatsMap = new Map(
      salesByProduct.map((stat) => [
        stat.productId,
        {
          total_sales: stat._count,
          total_revenue: Number(stat._sum.totalAmount || 0),
          total_quantity: Number(stat._sum.quantity || 0),
        },
      ])
    );

    // Combine products with their stats (synchronous mapping, no N+1)
    const productsWithStats = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      category: product.category,
      sku: product.sku,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      stats: salesStatsMap.get(product.id) || {
        total_sales: 0,
        total_revenue: 0,
        total_quantity: 0,
      },
    }));

    const hasMore = offset + limit < total;

    const response = {
      data: productsWithStats,
      total,
      limit,
      offset,
      hasMore,
    };

    // Cache the response for 15 minutes
    cache.set(cacheKey, response, CacheTTL.FIFTEEN_MINUTES);
    logger.debug(`[Cache] Products cached for user ${userId}`);

    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', `public, max-age=${CacheTTL.FIFTEEN_MINUTES / 1000}`);
    res.json(response);
  } catch (error) {
    logger.error('Get products error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch products',
    });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        sku: data.sku,
      },
    });

    // Invalidate product list cache for this user
    cache.invalidatePattern(`${CacheKeys.products(userId)}:`);
    logger.debug(`[Cache] Invalidated products cache for user ${userId}`);

    res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create product error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create product',
    });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.id;
    const data = productSchema.partial().parse(req.body);

    // Check ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data,
    });

    // Invalidate product list cache for this user
    cache.invalidatePattern(`${CacheKeys.products(userId)}:`);
    logger.debug(`[Cache] Invalidated products cache for user ${userId}`);

    res.json({ product: updated });
  } catch (error) {
    logger.error('Update product error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update product',
    });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.id;

    // Check ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    // Invalidate product list cache for this user
    cache.invalidatePattern(`${CacheKeys.products(userId)}:`);
    logger.debug(`[Cache] Invalidated products cache for user ${userId}`);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete product',
    });
  }
};
