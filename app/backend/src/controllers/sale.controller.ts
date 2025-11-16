import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { parseLimitParam, parseOffsetParam, parseDateParam, parseEnumParam } from '../utils/validation';
import { logger } from '../utils/logger';

const saleSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalAmount: z.number().positive('Total amount must be positive'),
  saleDate: z.string().datetime().or(z.string().date()).transform((val) => new Date(val)),
  customer: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['completed', 'pending', 'cancelled']).default('completed'),
});

export const getAllSales = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, productId, status, limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined, 50);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const where: any = { userId };

    if (startDate && endDate) {
      const start = parseDateParam(startDate as string);
      const end = parseDateParam(endDate as string);
      if (start && end) {
        where.saleDate = {
          gte: start,
          lte: end,
        };
      }
    }

    if (productId) {
      where.productId = productId;
    }

    if (status) {
      const validStatus = parseEnumParam(
        status as string,
        ['completed', 'pending', 'cancelled'] as const,
        'completed'
      );
      where.status = validStatus;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
      take: parsedLimit,
      skip: parsedOffset,
    });

    const total = await prisma.sale.count({ where });

    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      productId: sale.productId,
      product: sale.product,
      quantity: Number(sale.quantity),
      unitPrice: Number(sale.unitPrice),
      totalAmount: Number(sale.totalAmount),
      saleDate: sale.saleDate,
      customer: sale.customer,
      notes: sale.notes,
      status: sale.status,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    }));

    res.json({ sales: formattedSales, total, limit: parsedLimit, offset: parsedOffset });
  } catch (error) {
    logger.error('Get sales error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sales',
    });
  }
};

export const createSale = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = saleSchema.parse(req.body);

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: { id: data.productId, userId },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const sale = await prisma.sale.create({
      data: {
        userId,
        productId: data.productId,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        saleDate: data.saleDate,
        customer: data.customer,
        notes: data.notes,
        status: data.status,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
    });

    const formattedSale = {
      id: sale.id,
      productId: sale.productId,
      product: sale.product,
      quantity: Number(sale.quantity),
      unitPrice: Number(sale.unitPrice),
      totalAmount: Number(sale.totalAmount),
      saleDate: sale.saleDate,
      customer: sale.customer,
      notes: sale.notes,
      status: sale.status,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };

    res.status(201).json({ sale: formattedSale });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create sale error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create sale',
    });
  }
};

export const updateSale = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const saleId = req.params.id;
    const data = saleSchema.partial().parse(req.body);

    // Check ownership
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, userId },
    });

    if (!sale) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sale not found',
      });
    }

    // Verify product ownership if productId is being updated
    if (data.productId) {
      const product = await prisma.product.findFirst({
        where: { id: data.productId, userId },
      });

      if (!product) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Product not found',
        });
      }
    }

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true,
          },
        },
      },
    });

    const formattedSale = {
      id: updated.id,
      productId: updated.productId,
      product: updated.product,
      quantity: Number(updated.quantity),
      unitPrice: Number(updated.unitPrice),
      totalAmount: Number(updated.totalAmount),
      saleDate: updated.saleDate,
      customer: updated.customer,
      notes: updated.notes,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };

    res.json({ sale: formattedSale });
  } catch (error) {
    logger.error('Update sale error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update sale',
    });
  }
};

export const deleteSale = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const saleId = req.params.id;

    // Check ownership
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, userId },
    });

    if (!sale) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Sale not found',
      });
    }

    await prisma.sale.delete({
      where: { id: saleId },
    });

    res.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    logger.error('Delete sale error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete sale',
    });
  }
};

// Get sales summary/statistics
export const getSalesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'month' } = req.query;

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get total sales in period
    const sales = await prisma.sale.findMany({
      where: {
        userId,
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
      },
      include: {
        product: true,
      },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalQuantity = sales.reduce((sum, s) => sum + Number(s.quantity), 0);
    const totalSales = sales.length;

    // Group by product
    const byProduct = new Map<string, any>();
    sales.forEach((sale) => {
      if (!byProduct.has(sale.productId)) {
        byProduct.set(sale.productId, {
          productId: sale.productId,
          productName: sale.product.name,
          sales: 0,
          quantity: 0,
          revenue: 0,
        });
      }
      const product = byProduct.get(sale.productId);
      product.sales += 1;
      product.quantity += Number(sale.quantity);
      product.revenue += Number(sale.totalAmount);
    });

    res.json({
      period,
      summary: {
        total_sales: totalSales,
        total_quantity: totalQuantity,
        total_revenue: totalRevenue,
        average_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
      },
      by_product: Array.from(byProduct.values()),
      start_date: startDate,
      end_date: endDate,
    });
  } catch (error) {
    logger.error('Get sales summary error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch sales summary',
    });
  }
};
