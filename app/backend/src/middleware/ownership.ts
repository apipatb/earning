/**
 * Resource Ownership Verification Middleware
 * Ensures users can only access resources they own
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

/**
 * Extended request interface that includes the fetched resource
 */
export interface ResourceRequest extends AuthRequest {
  resource?: any;
}

/**
 * Supported model names for ownership verification
 */
export type SupportedModel =
  | 'customer'
  | 'product'
  | 'earning'
  | 'expense'
  | 'invoice'
  | 'goal'
  | 'platform'
  | 'sale';

/**
 * Get the appropriate Prisma model delegate based on model name
 *
 * @param modelName - Name of the model
 * @returns Prisma model delegate
 */
function getPrismaModel(modelName: SupportedModel) {
  const models: Record<SupportedModel, any> = {
    customer: prisma.customer,
    product: prisma.product,
    earning: prisma.earning,
    expense: prisma.expense,
    invoice: prisma.invoice,
    goal: prisma.goal,
    platform: prisma.platform,
    sale: prisma.sale,
  };

  return models[modelName];
}

/**
 * Middleware factory to verify resource ownership
 * Creates a middleware that checks if the authenticated user owns the requested resource
 *
 * @param modelName - Name of the Prisma model to check (e.g., 'customer', 'invoice')
 * @returns Express middleware function
 *
 * @example
 * // Protect invoice routes
 * router.get('/invoices/:id', authenticate, verifyResourceOwnership('invoice'), getInvoice);
 *
 * @example
 * // Protect customer routes
 * router.put('/customers/:id', authenticate, verifyResourceOwnership('customer'), updateCustomer);
 *
 * @description
 * The middleware will:
 * 1. Extract resource ID from req.params.id
 * 2. Extract user ID from req.user.id (requires authentication middleware first)
 * 3. Query database for resource with matching ID and userId
 * 4. Return 404 if resource not found
 * 5. Return 403 if resource belongs to different user
 * 6. Attach resource to req.resource for reuse in controller
 * 7. Call next() if ownership verified
 */
export function verifyResourceOwnership(modelName: SupportedModel) {
  return async (req: ResourceRequest, res: Response, next: NextFunction) => {
    try {
      // Get resource ID from URL params
      const resourceId = req.params.id;
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Resource ID is required',
        });
      }

      // Get user ID from authenticated user
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Get the appropriate Prisma model
      const model = getPrismaModel(modelName);
      if (!model) {
        logger.error(`Invalid model name: ${modelName}`);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Invalid resource type',
        });
      }

      // Fetch resource by ID and userId
      const resource = await model.findFirst({
        where: {
          id: resourceId,
          userId: userId,
        },
      });

      // Resource not found or doesn't belong to user
      if (!resource) {
        // Log for security monitoring
        logger.warn(`Ownership verification failed for ${modelName}`, {
          userId,
          resourceId,
          modelName,
        });

        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `${capitalizeFirstLetter(modelName)} not found`,
        });
      }

      // Attach resource to request for reuse in controller
      // This avoids duplicate database queries
      req.resource = resource;

      // Ownership verified, proceed to controller
      next();
    } catch (error) {
      logger.error(`Error in ownership verification for ${modelName}:`, error);

      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify resource ownership',
      });
    }
  };
}

/**
 * Helper function to capitalize first letter of a string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Verify ownership of multiple resources (batch operation)
 * Useful for operations that involve multiple resources
 *
 * @param modelName - Name of the Prisma model
 * @param resourceIds - Array of resource IDs to verify
 * @param userId - User ID to check ownership against
 * @returns Promise<boolean> - true if user owns all resources
 *
 * @example
 * const ownsAll = await verifyBatchOwnership('product', productIds, userId);
 * if (!ownsAll) {
 *   throw new AppError('You do not own all the specified products', 403);
 * }
 */
export async function verifyBatchOwnership(
  modelName: SupportedModel,
  resourceIds: string[],
  userId: string
): Promise<boolean> {
  try {
    const model = getPrismaModel(modelName);
    if (!model) {
      throw new Error(`Invalid model name: ${modelName}`);
    }

    const count = await model.count({
      where: {
        id: { in: resourceIds },
        userId: userId,
      },
    });

    // All resources must belong to the user
    return count === resourceIds.length;
  } catch (error) {
    logger.error(`Error in batch ownership verification for ${modelName}:`, error);
    return false;
  }
}

/**
 * Check if user owns a specific resource (utility function)
 * Useful for programmatic ownership checks outside of middleware
 *
 * @param modelName - Name of the Prisma model
 * @param resourceId - Resource ID to check
 * @param userId - User ID to check ownership against
 * @returns Promise<boolean> - true if user owns the resource
 *
 * @example
 * const owns = await checkOwnership('invoice', invoiceId, userId);
 * if (!owns) {
 *   throw new AppError('Invoice not found', 404);
 * }
 */
export async function checkOwnership(
  modelName: SupportedModel,
  resourceId: string,
  userId: string
): Promise<boolean> {
  try {
    const model = getPrismaModel(modelName);
    if (!model) {
      throw new Error(`Invalid model name: ${modelName}`);
    }

    const resource = await model.findFirst({
      where: {
        id: resourceId,
        userId: userId,
      },
      select: { id: true }, // Only select ID for efficiency
    });

    return !!resource;
  } catch (error) {
    logger.error(`Error checking ownership for ${modelName}:`, error);
    return false;
  }
}
