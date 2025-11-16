import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, ControllerHandler } from '../types';
import prisma from '../lib/prisma';

const inventoryLogSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantityChange: z.number().refine((val) => val !== 0, {
    message: 'Quantity change cannot be zero',
  }),
  type: z.enum(['purchase', 'sale', 'adjustment', 'damage', 'return']),
  notes: z.string().max(1000).optional(),
});

const updateStockSchema = z.object({
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  reorderPoint: z.number().min(0).optional(),
  supplierName: z.string().max(255).optional(),
  supplierCost: z.number().positive().optional(),
});

export const getInventory: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { showLowStock = false } = req.query;

    const products = await prisma.product.findMany({
      where: { userId },
      include: {
        inventoryLogs: {
          select: { quantityChange: true, type: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { quantity: 'asc' },
    });

    const inventory = products
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        quantity: Number(product.quantity),
        reorderPoint: Number(product.reorderPoint),
        price: Number(product.price),
        supplierName: product.supplierName,
        supplierCost: product.supplierCost ? Number(product.supplierCost) : null,
        isLowStock: Number(product.quantity) <= Number(product.reorderPoint),
        recentActivity: product.inventoryLogs.slice(0, 3),
      }))
      .filter((item) => (!showLowStock ? true : item.isLowStock));

    const lowStockCount = inventory.filter((item) => item.isLowStock).length;
    const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.price, 0);

    res.json({
      inventory,
      summary: {
        total_items: inventory.length,
        low_stock_count: lowStockCount,
        total_inventory_value: totalValue,
      },
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch inventory',
    });
  }
};

export const updateProductStock: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const productId = req.params.id;
    const data = updateStockSchema.parse(req.body);

    // Verify product ownership
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
      data: {
        quantity: data.quantity,
        reorderPoint: data.reorderPoint,
        supplierName: data.supplierName,
        supplierCost: data.supplierCost,
      },
    });

    res.json({
      product: {
        id: updated.id,
        name: updated.name,
        quantity: Number(updated.quantity),
        reorderPoint: Number(updated.reorderPoint),
        supplierName: updated.supplierName,
        supplierCost: updated.supplierCost ? Number(updated.supplierCost) : null,
      },
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update stock',
    });
  }
};

export const logInventoryChange: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = inventoryLogSchema.parse(req.body);

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

    // Create log and update product quantity
    const [log, updatedProduct] = await Promise.all([
      prisma.inventoryLog.create({
        data: {
          userId,
          productId: data.productId,
          quantityChange: data.quantityChange,
          type: data.type,
          notes: data.notes,
        },
      }),
      prisma.product.update({
        where: { id: data.productId },
        data: {
          quantity: {
            increment: data.quantityChange,
          },
        },
      }),
    ]);

    res.status(201).json({
      log: {
        id: log.id,
        productId: log.productId,
        quantityChange: Number(log.quantityChange),
        type: log.type,
        notes: log.notes,
        createdAt: log.createdAt,
      },
      updatedQuantity: Number(updatedProduct.quantity),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Log inventory change error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log inventory change',
    });
  }
};

export const getInventoryHistory: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { productId, type, limit = '50', offset = '0' } = req.query;

    const where: any = { userId };
    if (productId) {
      where.productId = productId;
    }
    if (type) {
      where.type = type;
    }

    const logs = await prisma.inventoryLog.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    const total = await prisma.inventoryLog.count({ where });

    res.json({
      logs: logs.map((log) => ({
        id: log.id,
        product: log.product,
        quantityChange: Number(log.quantityChange),
        type: log.type,
        notes: log.notes,
        createdAt: log.createdAt,
      })),
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch inventory history',
    });
  }
};

export const getLowStockAlerts: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const lowStockProducts = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        reorderPoint: true,
        price: true,
        supplierName: true,
        supplierCost: true,
      },
    });

    const alerts = lowStockProducts
      .filter((product) => Number(product.quantity) <= Number(product.reorderPoint))
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: Number(product.quantity),
        reorderPoint: Number(product.reorderPoint),
        deficit: Number(product.reorderPoint) - Number(product.quantity),
        price: Number(product.price),
        supplierName: product.supplierName,
        estimatedCost: product.supplierCost
          ? Number(product.supplierCost) * (Number(product.reorderPoint) - Number(product.quantity))
          : null,
        severity: Number(product.quantity) === 0 ? 'critical' : Number(product.quantity) <= Number(product.reorderPoint) / 2 ? 'high' : 'medium',
      }));

    res.json({
      alerts: alerts.sort((a, b) => b.deficit - a.deficit),
      totalAlerts: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 'critical').length,
      highCount: alerts.filter((a) => a.severity === 'high').length,
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch low stock alerts',
    });
  }
};
