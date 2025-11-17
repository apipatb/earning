import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { parseLimitParam, parseOffsetParam } from '../utils/validation';

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

    // Use database-level aggregation for each product's sales
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const salesStats = await prisma.sale.aggregate({
          where: { productId: product.id },
          _count: true,
          _sum: {
            totalAmount: true,
            quantity: true,
          },
        });

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          price: Number(product.price),
          category: product.category,
          sku: product.sku,
          isActive: product.isActive,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          stats: {
            total_sales: salesStats._count,
            total_revenue: Number(salesStats._sum.totalAmount || 0),
            total_quantity: Number(salesStats._sum.quantity || 0),
          },
        };
      })
    );

    const hasMore = offset + limit < total;

    res.json({
      data: productsWithStats,
      total,
      limit,
      offset,
      hasMore,
    });
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

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Delete product error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete product',
    });
  }
};
