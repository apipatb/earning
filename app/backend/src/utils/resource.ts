import { Response } from 'express';
import prisma from '../lib/prisma';
import { logger } from './logger';

/**
 * Check ownership of a resource and return 404 if not found or unauthorized
 * This utility eliminates duplicate ownership verification code across controllers
 */
export async function checkResourceOwnership(
  resourceType: string,
  resourceId: string,
  userId: string,
  res: Response
) {
  try {
    let resource;

    // Use Prisma dynamic access
    const model = (prisma as any)[resourceType];
    if (!model) {
      logger.error(`Invalid resource type: ${resourceType}`);
      return null;
    }

    resource = await model.findFirst({
      where: { id: resourceId, userId },
    });

    if (!resource) {
      res.status(404).json({
        error: 'Not Found',
        message: `${resourceType} not found`,
      });
      return null;
    }

    return resource;
  } catch (error) {
    logger.error(`Error checking ${resourceType} ownership:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Failed to verify ${resourceType} ownership`,
    });
    return null;
  }
}

/**
 * Calculate date ranges for different periods
 * Centralizes period-based date logic used across multiple controllers
 */
export function getDateRange(period: string = 'month'): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(endDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case 'month':
    default:
      // First day of current month
      startDate = new Date(endDate);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

/**
 * Format currency values from Decimal to number
 */
export function formatCurrency(value: any): number {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Generic error handler for CRUD operations
 */
export function handleError(
  operation: string,
  error: unknown,
  res: Response,
  statusCode: number = 500
) {
  logger.error(`${operation} error:`, error instanceof Error ? error : new Error(String(error)));
  res.status(statusCode).json({
    error: 'Internal Server Error',
    message: `Failed to ${operation.toLowerCase()}`,
  });
}
