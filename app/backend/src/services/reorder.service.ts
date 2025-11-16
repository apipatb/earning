import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import inventoryForecastService from './inventory-forecast.service';

interface ReorderRecommendation {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  recommendedOrderQty: number;
  estimatedCost: number;
  supplier: string | null;
  urgency: 'critical' | 'high' | 'medium';
  leadTime: number;
  estimatedArrival: Date;
  forecastedDemand: number;
}

interface PurchaseOrder {
  supplier: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalCost: number;
  estimatedDelivery: Date;
}

export class ReorderService {
  /**
   * Check all products and generate alerts for low stock
   */
  async checkLowStockProducts(userId: string): Promise<void> {
    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        reorderRules: true,
      },
    });

    for (const product of products) {
      const currentStock = Number(product.quantity);
      const reorderRule = product.reorderRules[0];

      if (!reorderRule || !reorderRule.isActive) {
        continue;
      }

      const minStock = Number(reorderRule.minStock);

      // Check if stock is below minimum
      if (currentStock <= minStock) {
        // Check if alert already exists
        const existingAlert = await prisma.inventoryAlert.findFirst({
          where: {
            productId: product.id,
            type: 'LOW_STOCK',
            resolvedAt: null,
          },
        });

        if (!existingAlert) {
          await prisma.inventoryAlert.create({
            data: {
              productId: product.id,
              type: 'LOW_STOCK',
              message: `Stock level for ${product.name} (${currentStock}) is below minimum threshold (${minStock})`,
            },
          });

          logger.info(`Low stock alert created for product ${product.id}`);
        }
      } else {
        // Resolve any existing low stock alerts
        await prisma.inventoryAlert.updateMany({
          where: {
            productId: product.id,
            type: 'LOW_STOCK',
            resolvedAt: null,
          },
          data: {
            resolvedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Auto-generate purchase order for products below reorder point
   */
  async autoGeneratePurchaseOrders(userId: string): Promise<PurchaseOrder[]> {
    const recommendations = await this.getReorderRecommendations(userId);

    // Group by supplier
    const ordersBySupplier = new Map<string, PurchaseOrder>();

    for (const rec of recommendations) {
      const supplier = rec.supplier || 'Unknown Supplier';

      if (!ordersBySupplier.has(supplier)) {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + rec.leadTime);

        ordersBySupplier.set(supplier, {
          supplier,
          items: [],
          totalCost: 0,
          estimatedDelivery,
        });
      }

      const order = ordersBySupplier.get(supplier)!;
      const product = await prisma.product.findUnique({
        where: { id: rec.productId },
      });

      if (!product) continue;

      const unitCost = product.supplierCost ? Number(product.supplierCost) : 0;
      const totalCost = unitCost * rec.recommendedOrderQty;

      order.items.push({
        productId: rec.productId,
        productName: rec.productName,
        quantity: rec.recommendedOrderQty,
        unitCost,
        totalCost,
      });

      order.totalCost += totalCost;
    }

    return Array.from(ordersBySupplier.values());
  }

  /**
   * Get reorder recommendations
   */
  async getReorderRecommendations(
    userId: string
  ): Promise<ReorderRecommendation[]> {
    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        reorderRules: {
          where: {
            isActive: true,
          },
        },
      },
    });

    const recommendations: ReorderRecommendation[] = [];

    for (const product of products) {
      const reorderRule = product.reorderRules[0];
      if (!reorderRule) continue;

      const currentStock = Number(product.quantity);
      const minStock = Number(reorderRule.minStock);
      const maxStock = Number(reorderRule.maxStock);
      const reorderQty = Number(reorderRule.reorderQty);

      // Only recommend if below minimum stock
      if (currentStock > minStock) continue;

      // Get forecasted demand for lead time period
      let forecastedDemand = 0;
      try {
        const forecasts = await inventoryForecastService.getForecast(
          product.id,
          reorderRule.leadTime
        );
        forecastedDemand = forecasts.reduce((sum, f) => sum + f.quantity, 0);
      } catch (error) {
        logger.error(
          `Failed to get forecast for product ${product.id}:`,
          error
        );
      }

      // Calculate recommended order quantity
      // Formula: max(reorderQty, maxStock - currentStock + forecastedDemand)
      const calculatedQty = Math.max(
        reorderQty,
        maxStock - currentStock + forecastedDemand
      );

      // Apply bulk discount optimization (order in multiples)
      const optimizedQty = Math.ceil(calculatedQty / 10) * 10;

      const estimatedArrival = new Date();
      estimatedArrival.setDate(
        estimatedArrival.getDate() + reorderRule.leadTime
      );

      const unitCost = product.supplierCost
        ? Number(product.supplierCost)
        : Number(product.price) * 0.6;
      const estimatedCost = unitCost * optimizedQty;

      // Determine urgency
      let urgency: 'critical' | 'high' | 'medium' = 'medium';
      if (currentStock === 0) {
        urgency = 'critical';
      } else if (currentStock <= minStock / 2) {
        urgency = 'high';
      }

      recommendations.push({
        productId: product.id,
        productName: product.name,
        currentStock,
        minStock,
        maxStock,
        recommendedOrderQty: optimizedQty,
        estimatedCost,
        supplier: reorderRule.supplier,
        urgency,
        leadTime: reorderRule.leadTime,
        estimatedArrival,
        forecastedDemand,
      });
    }

    // Sort by urgency
    return recommendations.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  /**
   * Create or update reorder rule
   */
  async createReorderRule(
    productId: string,
    data: {
      minStock: number;
      maxStock: number;
      reorderQty: number;
      leadTime: number;
      supplier?: string;
      isActive?: boolean;
    }
  ) {
    // Validate
    if (data.minStock >= data.maxStock) {
      throw new Error('Minimum stock must be less than maximum stock');
    }

    if (data.reorderQty <= 0) {
      throw new Error('Reorder quantity must be positive');
    }

    if (data.leadTime < 0) {
      throw new Error('Lead time cannot be negative');
    }

    // Check if rule exists
    const existingRule = await prisma.reorderRule.findUnique({
      where: {
        productId,
      },
    });

    if (existingRule) {
      // Update existing rule
      return await prisma.reorderRule.update({
        where: {
          productId,
        },
        data: {
          minStock: data.minStock,
          maxStock: data.maxStock,
          reorderQty: data.reorderQty,
          leadTime: data.leadTime,
          supplier: data.supplier,
          isActive: data.isActive ?? true,
        },
      });
    } else {
      // Create new rule
      return await prisma.reorderRule.create({
        data: {
          productId,
          minStock: data.minStock,
          maxStock: data.maxStock,
          reorderQty: data.reorderQty,
          leadTime: data.leadTime,
          supplier: data.supplier,
          isActive: data.isActive ?? true,
        },
      });
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(userId: string, type?: string) {
    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const productIds = products.map((p) => p.id);

    const whereClause: any = {
      productId: {
        in: productIds,
      },
      resolvedAt: null,
    };

    if (type) {
      whereClause.type = type;
    }

    const alerts = await prisma.inventoryAlert.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        triggered: 'desc',
      },
    });

    return alerts.map((alert) => ({
      id: alert.id,
      productId: alert.productId,
      product: {
        name: alert.product.name,
        sku: alert.product.sku,
        quantity: Number(alert.product.quantity),
      },
      type: alert.type,
      message: alert.message,
      triggered: alert.triggered,
    }));
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string) {
    return await prisma.inventoryAlert.update({
      where: {
        id: alertId,
      },
      data: {
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Check for overstock situations
   */
  async checkOverstock(userId: string): Promise<void> {
    const products = await prisma.product.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        reorderRules: true,
      },
    });

    for (const product of products) {
      const currentStock = Number(product.quantity);
      const reorderRule = product.reorderRules[0];

      if (!reorderRule || !reorderRule.isActive) {
        continue;
      }

      const maxStock = Number(reorderRule.maxStock);

      // Check if stock is above maximum
      if (currentStock > maxStock * 1.5) {
        // 50% over max is considered overstock
        const existingAlert = await prisma.inventoryAlert.findFirst({
          where: {
            productId: product.id,
            type: 'OVERSTOCK',
            resolvedAt: null,
          },
        });

        if (!existingAlert) {
          await prisma.inventoryAlert.create({
            data: {
              productId: product.id,
              type: 'OVERSTOCK',
              message: `Stock level for ${product.name} (${currentStock}) is significantly above maximum threshold (${maxStock})`,
            },
          });

          logger.info(`Overstock alert created for product ${product.id}`);
        }
      } else {
        // Resolve any existing overstock alerts
        await prisma.inventoryAlert.updateMany({
          where: {
            productId: product.id,
            type: 'OVERSTOCK',
            resolvedAt: null,
          },
          data: {
            resolvedAt: new Date(),
          },
        });
      }
    }
  }

  /**
   * Get multi-supplier recommendations
   */
  async getMultiSupplierRecommendations(
    userId: string
  ): Promise<Map<string, ReorderRecommendation[]>> {
    const recommendations = await this.getReorderRecommendations(userId);

    const bySupplier = new Map<string, ReorderRecommendation[]>();

    for (const rec of recommendations) {
      const supplier = rec.supplier || 'Unknown Supplier';

      if (!bySupplier.has(supplier)) {
        bySupplier.set(supplier, []);
      }

      bySupplier.get(supplier)!.push(rec);
    }

    return bySupplier;
  }

  /**
   * Optimize order timing based on lead time
   */
  async optimizeOrderTiming(
    productId: string
  ): Promise<{ shouldOrder: boolean; daysUntilReorder: number; reason: string }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        reorderRules: true,
      },
    });

    if (!product || !product.reorderRules[0]) {
      return {
        shouldOrder: false,
        daysUntilReorder: -1,
        reason: 'No reorder rule configured',
      };
    }

    const rule = product.reorderRules[0];
    const currentStock = Number(product.quantity);
    const minStock = Number(rule.minStock);
    const leadTime = rule.leadTime;

    // Get forecasted demand for lead time period
    let forecastedDemand = 0;
    try {
      const forecasts = await inventoryForecastService.getForecast(
        productId,
        leadTime
      );
      forecastedDemand = forecasts.reduce((sum, f) => sum + f.quantity, 0);
    } catch (error) {
      logger.error(`Failed to get forecast for product ${productId}:`, error);
    }

    // Calculate when stock will reach minimum
    const avgDailyDemand = forecastedDemand / leadTime;
    const daysUntilMin =
      avgDailyDemand > 0 ? (currentStock - minStock) / avgDailyDemand : 999;

    // Should order if: days until min <= lead time
    const shouldOrder = daysUntilMin <= leadTime;

    let reason = '';
    if (shouldOrder) {
      reason = `Stock will reach minimum in ${Math.floor(daysUntilMin)} days, which is within the ${leadTime}-day lead time`;
    } else {
      reason = `Stock is sufficient for ${Math.floor(daysUntilMin)} days, exceeding the ${leadTime}-day lead time`;
    }

    return {
      shouldOrder,
      daysUntilReorder: Math.max(0, Math.floor(daysUntilMin - leadTime)),
      reason,
    };
  }
}

export default new ReorderService();
