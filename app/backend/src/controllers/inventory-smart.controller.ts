import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import inventoryForecastService from '../services/inventory-forecast.service';
import reorderService from '../services/reorder.service';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

// Validation schemas
const generateForecastSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  method: z.enum(['MOVING_AVG', 'EXPONENTIAL', 'LINEAR', 'DEMAND']),
  days: z.number().int().min(1).max(90).optional().default(30),
  period: z.number().int().min(3).max(30).optional().default(7),
  alpha: z.number().min(0.1).max(0.9).optional().default(0.3),
});

const createReorderRuleSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  minStock: z.number().min(0, 'Minimum stock cannot be negative'),
  maxStock: z.number().min(0, 'Maximum stock cannot be negative'),
  reorderQty: z.number().positive('Reorder quantity must be positive'),
  leadTime: z.number().int().min(0, 'Lead time cannot be negative'),
  supplier: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

/**
 * POST /api/v1/inventory/forecasts
 * Generate demand forecast for a product
 */
export const generateForecast = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = generateForecastSchema.parse(req.body);

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    let forecasts;

    switch (data.method) {
      case 'MOVING_AVG':
        forecasts = await inventoryForecastService.movingAverageForecast(
          data.productId,
          data.period,
          data.days
        );
        break;
      case 'EXPONENTIAL':
        forecasts = await inventoryForecastService.exponentialSmoothingForecast(
          data.productId,
          data.alpha,
          data.days
        );
        break;
      case 'LINEAR':
        forecasts = await inventoryForecastService.linearRegressionForecast(
          data.productId,
          data.days
        );
        break;
      case 'DEMAND':
        forecasts = await inventoryForecastService.demandForecast(
          data.productId,
          data.days
        );
        break;
      default:
        forecasts = await inventoryForecastService.demandForecast(
          data.productId,
          data.days
        );
    }

    // Save forecasts to database
    await inventoryForecastService.saveForecast(data.productId, forecasts);

    res.json({
      success: true,
      method: data.method,
      forecasts: forecasts.map((f) => ({
        date: f.date,
        quantity: Math.round(f.quantity * 100) / 100,
        confidence: f.confidence,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error(
      'Generate forecast error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to generate forecast',
    });
  }
};

/**
 * GET /api/v1/inventory/forecasts/:productId
 * Get saved forecast for a product
 */
export const getForecast = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId;
    const days = req.query.days
      ? parseInt(req.query.days as string)
      : 30;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const forecasts = await inventoryForecastService.getForecast(
      productId,
      days
    );

    res.json({
      productId,
      productName: product.name,
      currentStock: Number(product.quantity),
      forecasts: forecasts.map((f) => ({
        date: f.date,
        quantity: Math.round(f.quantity * 100) / 100,
        confidence: f.confidence,
        method: f.method,
      })),
    });
  } catch (error) {
    logger.error(
      'Get forecast error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch forecast',
    });
  }
};

/**
 * POST /api/v1/inventory/reorder-rules
 * Create or update reorder rule
 */
export const createReorderRule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createReorderRuleSchema.parse(req.body);

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const rule = await reorderService.createReorderRule(data.productId, {
      minStock: data.minStock,
      maxStock: data.maxStock,
      reorderQty: data.reorderQty,
      leadTime: data.leadTime,
      supplier: data.supplier,
      isActive: data.isActive,
    });

    // Calculate safety stock
    const safetyStock = await inventoryForecastService.calculateSafetyStock(
      data.productId,
      data.leadTime,
      0.95
    );

    res.status(201).json({
      success: true,
      rule: {
        id: rule.id,
        productId: rule.productId,
        minStock: Number(rule.minStock),
        maxStock: Number(rule.maxStock),
        reorderQty: Number(rule.reorderQty),
        leadTime: rule.leadTime,
        supplier: rule.supplier,
        isActive: rule.isActive,
        recommendedSafetyStock: safetyStock,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error(
      'Create reorder rule error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message:
        error instanceof Error ? error.message : 'Failed to create reorder rule',
    });
  }
};

/**
 * GET /api/v1/inventory/reorder-rules/:productId
 * Get reorder rule for a product
 */
export const getReorderRule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
      include: {
        reorderRules: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const rule = product.reorderRules[0];

    if (!rule) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No reorder rule configured for this product',
      });
    }

    res.json({
      rule: {
        id: rule.id,
        productId: rule.productId,
        minStock: Number(rule.minStock),
        maxStock: Number(rule.maxStock),
        reorderQty: Number(rule.reorderQty),
        leadTime: rule.leadTime,
        supplier: rule.supplier,
        isActive: rule.isActive,
      },
    });
  } catch (error) {
    logger.error(
      'Get reorder rule error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch reorder rule',
    });
  }
};

/**
 * GET /api/v1/inventory/alerts
 * Get active inventory alerts
 */
export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const type = req.query.type as string | undefined;

    const alerts = await reorderService.getActiveAlerts(userId, type);

    res.json({
      alerts,
      totalCount: alerts.length,
      criticalCount: alerts.filter(
        (a) => a.type === 'LOW_STOCK' && a.product.quantity === 0
      ).length,
      lowStockCount: alerts.filter((a) => a.type === 'LOW_STOCK').length,
      overstockCount: alerts.filter((a) => a.type === 'OVERSTOCK').length,
    });
  } catch (error) {
    logger.error(
      'Get alerts error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch alerts',
    });
  }
};

/**
 * POST /api/v1/inventory/alerts/:alertId/resolve
 * Resolve an alert
 */
export const resolveAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const alertId = req.params.alertId;

    // Verify alert belongs to user's product
    const alert = await prisma.inventoryAlert.findFirst({
      where: {
        id: alertId,
      },
      include: {
        product: true,
      },
    });

    if (!alert || alert.product.userId !== userId) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Alert not found',
      });
    }

    await reorderService.resolveAlert(alertId);

    res.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    logger.error(
      'Resolve alert error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resolve alert',
    });
  }
};

/**
 * POST /api/v1/inventory/auto-order
 * Trigger auto-reorder check for all products
 */
export const triggerAutoReorder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check low stock and create alerts
    await reorderService.checkLowStockProducts(userId);

    // Check overstock
    await reorderService.checkOverstock(userId);

    // Generate purchase orders
    const purchaseOrders = await reorderService.autoGeneratePurchaseOrders(
      userId
    );

    res.json({
      success: true,
      purchaseOrders: purchaseOrders.map((po) => ({
        supplier: po.supplier,
        itemCount: po.items.length,
        items: po.items,
        totalCost: Math.round(po.totalCost * 100) / 100,
        estimatedDelivery: po.estimatedDelivery,
      })),
      totalOrders: purchaseOrders.length,
      totalItems: purchaseOrders.reduce((sum, po) => sum + po.items.length, 0),
      totalCost: Math.round(
        purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0) * 100
      ) / 100,
    });
  } catch (error) {
    logger.error(
      'Auto-reorder error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process auto-reorder',
    });
  }
};

/**
 * GET /api/v1/inventory/recommendations
 * Get reorder recommendations
 */
export const getRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const recommendations = await reorderService.getReorderRecommendations(
      userId
    );

    res.json({
      recommendations: recommendations.map((rec) => ({
        productId: rec.productId,
        productName: rec.productName,
        currentStock: rec.currentStock,
        minStock: rec.minStock,
        maxStock: rec.maxStock,
        recommendedOrderQty: rec.recommendedOrderQty,
        estimatedCost: Math.round(rec.estimatedCost * 100) / 100,
        supplier: rec.supplier,
        urgency: rec.urgency,
        leadTime: rec.leadTime,
        estimatedArrival: rec.estimatedArrival,
        forecastedDemand: Math.round(rec.forecastedDemand * 100) / 100,
      })),
      totalRecommendations: recommendations.length,
      criticalCount: recommendations.filter((r) => r.urgency === 'critical')
        .length,
      highCount: recommendations.filter((r) => r.urgency === 'high').length,
      estimatedTotalCost: Math.round(
        recommendations.reduce((sum, r) => sum + r.estimatedCost, 0) * 100
      ) / 100,
    });
  } catch (error) {
    logger.error(
      'Get recommendations error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch recommendations',
    });
  }
};

/**
 * GET /api/v1/inventory/safety-stock/:productId
 * Calculate safety stock for a product
 */
export const calculateSafetyStock = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId;
    const leadTime = req.query.leadTime
      ? parseInt(req.query.leadTime as string)
      : 7;
    const serviceLevel = req.query.serviceLevel
      ? parseFloat(req.query.serviceLevel as string)
      : 0.95;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const safetyStock = await inventoryForecastService.calculateSafetyStock(
      productId,
      leadTime,
      serviceLevel
    );

    res.json({
      productId,
      productName: product.name,
      safetyStock,
      leadTime,
      serviceLevel: serviceLevel * 100,
      recommendedMinStock: safetyStock,
    });
  } catch (error) {
    logger.error(
      'Calculate safety stock error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate safety stock',
    });
  }
};

/**
 * GET /api/v1/inventory/order-timing/:productId
 * Get optimal order timing recommendation
 */
export const getOrderTiming = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const productId = req.params.productId;

    // Verify product ownership
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        userId,
      },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const timing = await reorderService.optimizeOrderTiming(productId);

    res.json({
      productId,
      productName: product.name,
      currentStock: Number(product.quantity),
      ...timing,
    });
  } catch (error) {
    logger.error(
      'Get order timing error:',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate order timing',
    });
  }
};
