import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

interface SalesData {
  date: Date;
  quantity: number;
}

interface ForecastResult {
  date: Date;
  quantity: number;
  confidence: number;
  method: 'MOVING_AVG' | 'EXPONENTIAL' | 'LINEAR';
}

export class InventoryForecastService {
  /**
   * Get sales history for a product
   */
  private async getSalesHistory(
    productId: string,
    days: number = 90
  ): Promise<SalesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.sale.findMany({
      where: {
        productId,
        saleDate: {
          gte: startDate,
        },
        status: 'COMPLETED',
      },
      orderBy: {
        saleDate: 'asc',
      },
      select: {
        saleDate: true,
        quantity: true,
      },
    });

    return sales.map((sale) => ({
      date: sale.saleDate,
      quantity: Number(sale.quantity),
    }));
  }

  /**
   * Calculate moving average forecast
   */
  async movingAverageForecast(
    productId: string,
    days: number = 7,
    forecastDays: number = 30
  ): Promise<ForecastResult[]> {
    const salesHistory = await this.getSalesHistory(productId, 90);

    if (salesHistory.length < days) {
      throw new Error('Insufficient sales history for moving average calculation');
    }

    // Group sales by day
    const dailySales = this.groupSalesByDay(salesHistory);

    // Calculate moving average
    const movingAvg = this.calculateMovingAverage(dailySales, days);

    // Generate forecast
    const forecasts: ForecastResult[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      forecasts.push({
        date: forecastDate,
        quantity: Math.max(0, movingAvg),
        confidence: this.calculateConfidence(salesHistory, movingAvg),
        method: 'MOVING_AVG',
      });
    }

    return forecasts;
  }

  /**
   * Calculate exponential smoothing forecast
   */
  async exponentialSmoothingForecast(
    productId: string,
    alpha: number = 0.3,
    forecastDays: number = 30
  ): Promise<ForecastResult[]> {
    const salesHistory = await this.getSalesHistory(productId, 90);

    if (salesHistory.length < 2) {
      throw new Error('Insufficient sales history for exponential smoothing');
    }

    const dailySales = this.groupSalesByDay(salesHistory);
    const values = Object.values(dailySales);

    // Calculate exponential smoothing
    let smoothed = values[0];
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }

    // Generate forecast
    const forecasts: ForecastResult[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      forecasts.push({
        date: forecastDate,
        quantity: Math.max(0, smoothed),
        confidence: this.calculateConfidence(salesHistory, smoothed),
        method: 'EXPONENTIAL',
      });
    }

    return forecasts;
  }

  /**
   * Calculate linear regression forecast
   */
  async linearRegressionForecast(
    productId: string,
    forecastDays: number = 30
  ): Promise<ForecastResult[]> {
    const salesHistory = await this.getSalesHistory(productId, 90);

    if (salesHistory.length < 3) {
      throw new Error('Insufficient sales history for linear regression');
    }

    const dailySales = this.groupSalesByDay(salesHistory);
    const dates = Object.keys(dailySales).sort();
    const values = dates.map((date) => dailySales[date]);

    // Calculate linear regression coefficients
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast
    const forecasts: ForecastResult[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const predictedValue = slope * (n + i - 1) + intercept;
      const avgValue = sumY / n;

      forecasts.push({
        date: forecastDate,
        quantity: Math.max(0, predictedValue),
        confidence: this.calculateConfidence(salesHistory, avgValue),
        method: 'LINEAR',
      });
    }

    return forecasts;
  }

  /**
   * Calculate demand forecast with seasonal adjustment
   */
  async demandForecast(
    productId: string,
    forecastDays: number = 30
  ): Promise<ForecastResult[]> {
    const salesHistory = await this.getSalesHistory(productId, 365); // Get full year for seasonality

    if (salesHistory.length < 30) {
      // Fall back to exponential smoothing if insufficient data
      return this.exponentialSmoothingForecast(productId, 0.3, forecastDays);
    }

    const dailySales = this.groupSalesByDay(salesHistory);

    // Calculate weekly averages
    const weeklyAverages = this.calculateWeeklyAverages(dailySales);

    // Calculate trend using linear regression
    const values = Object.values(dailySales);
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate forecast with seasonal adjustment
    const forecasts: ForecastResult[] = [];
    const baseDate = new Date();

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(baseDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      // Get day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeek = forecastDate.getDay();

      // Calculate trend value
      const trendValue = slope * (n + i - 1) + intercept;

      // Apply seasonal adjustment
      const seasonalFactor = weeklyAverages[dayOfWeek] / (sumY / n);
      const adjustedValue = trendValue * seasonalFactor;

      forecasts.push({
        date: forecastDate,
        quantity: Math.max(0, adjustedValue),
        confidence: this.calculateConfidence(salesHistory, trendValue),
        method: 'LINEAR',
      });
    }

    return forecasts;
  }

  /**
   * Calculate safety stock
   */
  async calculateSafetyStock(
    productId: string,
    leadTime: number,
    serviceLevel: number = 0.95
  ): Promise<number> {
    const salesHistory = await this.getSalesHistory(productId, 90);

    if (salesHistory.length === 0) {
      return 0;
    }

    const dailySales = this.groupSalesByDay(salesHistory);
    const values = Object.values(dailySales);

    // Calculate average daily demand
    const avgDailyDemand = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate standard deviation
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avgDailyDemand, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Z-score for service level (95% = 1.65, 99% = 2.33)
    const zScore = serviceLevel === 0.99 ? 2.33 : 1.65;

    // Safety stock = Z-score * std dev * sqrt(lead time)
    const safetyStock = zScore * stdDev * Math.sqrt(leadTime);

    return Math.ceil(safetyStock);
  }

  /**
   * Save forecast to database
   */
  async saveForecast(
    productId: string,
    forecasts: ForecastResult[]
  ): Promise<void> {
    // Delete old forecasts for this product
    await prisma.inventoryForecast.deleteMany({
      where: {
        productId,
        forecastedDate: {
          gte: new Date(),
        },
      },
    });

    // Insert new forecasts
    await prisma.inventoryForecast.createMany({
      data: forecasts.map((forecast) => ({
        productId,
        forecastedDate: forecast.date,
        quantity: forecast.quantity,
        confidence: forecast.confidence,
        method: forecast.method,
      })),
    });
  }

  /**
   * Get saved forecasts
   */
  async getForecast(productId: string, days: number = 30) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const forecasts = await prisma.inventoryForecast.findMany({
      where: {
        productId,
        forecastedDate: {
          gte: new Date(),
          lte: endDate,
        },
      },
      orderBy: {
        forecastedDate: 'asc',
      },
    });

    return forecasts.map((forecast) => ({
      date: forecast.forecastedDate,
      quantity: Number(forecast.quantity),
      confidence: Number(forecast.confidence),
      method: forecast.method,
    }));
  }

  /**
   * Helper: Group sales by day
   */
  private groupSalesByDay(sales: SalesData[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    for (const sale of sales) {
      const dateKey = sale.date.toISOString().split('T')[0];
      grouped[dateKey] = (grouped[dateKey] || 0) + sale.quantity;
    }

    return grouped;
  }

  /**
   * Helper: Calculate moving average
   */
  private calculateMovingAverage(
    dailySales: Record<string, number>,
    period: number
  ): number {
    const values = Object.values(dailySales);
    const recentValues = values.slice(-period);

    return recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
  }

  /**
   * Helper: Calculate weekly averages
   */
  private calculateWeeklyAverages(
    dailySales: Record<string, number>
  ): Record<number, number> {
    const weeklyTotals: Record<number, number[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    for (const [dateStr, quantity] of Object.entries(dailySales)) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      weeklyTotals[dayOfWeek].push(quantity);
    }

    const weeklyAverages: Record<number, number> = {};
    for (let day = 0; day < 7; day++) {
      const values = weeklyTotals[day];
      weeklyAverages[day] =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
    }

    return weeklyAverages;
  }

  /**
   * Helper: Calculate forecast confidence
   */
  private calculateConfidence(
    salesHistory: SalesData[],
    predictedValue: number
  ): number {
    if (salesHistory.length === 0) return 50;

    const values = salesHistory.map((s) => s.quantity);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation
    const cv = stdDev / avg;

    // Higher CV = lower confidence
    // Low CV (< 0.2) = 90%+ confidence
    // Medium CV (0.2-0.5) = 70-90% confidence
    // High CV (> 0.5) = 50-70% confidence

    let confidence = 90;
    if (cv > 0.5) {
      confidence = 50 + (1 - Math.min(cv, 1)) * 20;
    } else if (cv > 0.2) {
      confidence = 70 + (0.5 - cv) / 0.3 * 20;
    }

    return Math.round(Math.max(50, Math.min(95, confidence)));
  }
}

export default new InventoryForecastService();
