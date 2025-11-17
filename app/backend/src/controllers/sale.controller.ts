import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { parseLimitParam, parseOffsetParam, parseDateParam, parseEnumParam, validateSaleTotalAmount } from '../utils/validation';
import { logger } from '../utils/logger';
import { WebhookService } from '../services/webhook.service';
import { calculateDateRange } from '../utils/dateRange';
import { buildSaleWhere } from '../utils/dbBuilders';
import { ALL_SALE_STATUSES, SALE_STATUS } from '../constants/enums';

const saleSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  totalAmount: z.number().positive('Total amount must be positive'),
  saleDate: z.string().datetime().or(z.string().date()).transform((val) => new Date(val)),
  customer: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum([SALE_STATUS.COMPLETED, SALE_STATUS.PENDING, SALE_STATUS.CANCELLED] as const).default(SALE_STATUS.COMPLETED),
});

export const getAllSales = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate: startDateParam, endDate: endDateParam, productId, status, limit, offset } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined, 50);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    // Parse dates
    const startDate = startDateParam ? parseDateParam(startDateParam as string) || undefined : undefined;
    const endDate = endDateParam ? parseDateParam(endDateParam as string) || undefined : undefined;

    // Parse status
    let validStatus: string | undefined;
    if (status) {
      validStatus = parseEnumParam(
        status as string,
        ALL_SALE_STATUSES,
        SALE_STATUS.COMPLETED
      );
    }

    // Use type-safe query builder
    const where = buildSaleWhere(userId, {
      startDate,
      endDate,
      productId: productId as string | undefined,
      status: validStatus,
    });

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

    // Validate quantity * unitPrice = totalAmount
    try {
      validateSaleTotalAmount(data.quantity, data.unitPrice, data.totalAmount);
    } catch (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error instanceof Error ? error.message : 'Invalid sale calculation',
      });
    }

    // Verify product exists, belongs to user, AND is active
    const product = await prisma.product.findFirst({
      where: { id: data.productId, userId, isActive: true },
    });

    if (!product) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Product is not available for sales',
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

    // Trigger webhook event
    WebhookService.triggerEvent(userId, 'SALE_CREATED', {
      id: sale.id,
      productId: sale.productId,
      productName: sale.product.name,
      quantity: Number(sale.quantity),
      totalAmount: Number(sale.totalAmount),
      customer: sale.customer,
      status: sale.status,
      saleDate: sale.saleDate.toISOString(),
      createdAt: sale.createdAt.toISOString(),
    });

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

    // Verify product exists, belongs to user, AND is active if productId is being updated
    if (data.productId) {
      const product = await prisma.product.findFirst({
        where: { id: data.productId, userId, isActive: true },
      });

      if (!product) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Product is not available for sales',
        });
      }
    }

    // Validate quantity * unitPrice = totalAmount if all three are being updated
    if (data.quantity !== undefined || data.unitPrice !== undefined || data.totalAmount !== undefined) {
      // Use provided values or fall back to existing sale values
      const quantity = data.quantity ?? Number(sale.quantity);
      const unitPrice = data.unitPrice ?? Number(sale.unitPrice);
      const totalAmount = data.totalAmount ?? Number(sale.totalAmount);

      try {
        validateSaleTotalAmount(quantity, unitPrice, totalAmount);
      } catch (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error instanceof Error ? error.message : 'Invalid sale calculation',
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

    // Trigger webhook event
    WebhookService.triggerEvent(userId, 'SALE_UPDATED', {
      id: updated.id,
      productId: updated.productId,
      productName: updated.product.name,
      quantity: Number(updated.quantity),
      totalAmount: Number(updated.totalAmount),
      customer: updated.customer,
      status: updated.status,
      saleDate: updated.saleDate.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });

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

    // Calculate date range using centralized utility
    const { startDate, endDate } = calculateDateRange(period as 'today' | 'week' | 'month' | 'year');

    const where = {
      userId,
      saleDate: {
        gte: startDate,
        lte: endDate,
      },
      status: SALE_STATUS.COMPLETED,
    };

    // Use database-level aggregation instead of loading all sales
    const [totalStats, groupedByProduct] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _count: true,
        _sum: {
          totalAmount: true,
          quantity: true,
        },
      }),
      prisma.sale.groupBy({
        by: ['productId'],
        where,
        _count: true,
        _sum: {
          totalAmount: true,
          quantity: true,
        },
      }),
    ]);

    const totalRevenue = Number(totalStats._sum.totalAmount || 0);
    const totalQuantity = Number(totalStats._sum.quantity || 0);
    const totalSales = totalStats._count;

    // Get product names for grouped results
    const productIds = groupedByProduct.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productNameMap = new Map(products.map((p) => [p.id, p.name]));

    const byProduct = groupedByProduct.map((group) => ({
      productId: group.productId,
      productName: productNameMap.get(group.productId) || 'Unknown',
      sales: group._count,
      quantity: Number(group._sum.quantity || 0),
      revenue: Number(group._sum.totalAmount || 0),
    }));

    res.json({
      period,
      summary: {
        total_sales: totalSales,
        total_quantity: totalQuantity,
        total_revenue: totalRevenue,
        average_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
      },
      by_product: byProduct,
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
