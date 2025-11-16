import { Request, Response, NextFunction } from 'express';
import { permissionService, PermissionCheckResult } from '../services/permission.service';
import { DataScope } from '@prisma/client';

/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  permissionContext?: Record<string, any>;
  permissionResult?: PermissionCheckResult;
}

/**
 * Middleware to check if user has permission to perform an action on a resource
 * @param resource - Resource name (e.g., "tickets", "customers", "reports")
 * @param action - Action name (e.g., "CREATE", "READ", "UPDATE", "DELETE", "EXPORT", "ASSIGN", "MANAGE")
 * @param contextExtractor - Optional function to extract context from request
 */
export const checkPermission = (
  resource: string,
  action: string,
  contextExtractor?: (req: AuthRequest) => Record<string, any>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const context = contextExtractor ? contextExtractor(req) : undefined;

      const result = await permissionService.checkPermission(
        userId,
        resource,
        action,
        context
      );

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: result.reason || `Insufficient permissions to ${action} ${resource}`,
        });
      }

      // Attach permission result to request for use in controllers
      req.permissionResult = result;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};

/**
 * Middleware to check team permission
 * @param resource - Resource name
 * @param action - Action name
 * @param teamIdParam - Name of the route parameter containing the team ID (default: "teamId")
 */
export const checkTeamPermission = (
  resource: string,
  action: string,
  teamIdParam: string = 'teamId'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const teamId = req.params[teamIdParam];

      if (!teamId) {
        return res.status(400).json({
          success: false,
          message: 'Team ID not provided',
        });
      }

      const result = await permissionService.checkTeamPermission(
        userId,
        teamId,
        resource,
        action
      );

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: result.reason || `Insufficient team permissions to ${action} ${resource}`,
        });
      }

      req.permissionResult = result;

      next();
    } catch (error) {
      console.error('Team permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking team permissions',
      });
    }
  };
};

/**
 * Middleware to check resource ownership
 * @param resourceType - Type of resource (e.g., "ticket", "customer", "invoice")
 * @param resourceIdParam - Name of the route parameter containing the resource ID (default: "id")
 */
export const checkOwnership = (
  resourceType: string,
  resourceIdParam: string = 'id'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID not provided',
        });
      }

      const isOwner = await permissionService.checkOwnership(
        userId,
        resourceType,
        resourceId
      );

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
      });
    }
  };
};

/**
 * Middleware to check data visibility based on scope
 * @param dataType - Type of data (e.g., "ticket", "customer")
 * @param dataIdParam - Name of the route parameter containing the data ID (default: "id")
 * @param requiredScope - Required scope level (default: OWN)
 */
export const checkDataVisibility = (
  dataType: string,
  dataIdParam: string = 'id',
  requiredScope: DataScope = DataScope.OWN
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const dataId = req.params[dataIdParam];

      if (!dataId) {
        return res.status(400).json({
          success: false,
          message: 'Data ID not provided',
        });
      }

      const hasVisibility = await permissionService.checkDataVisibility(
        userId,
        dataType,
        dataId,
        requiredScope
      );

      if (!hasVisibility) {
        return res.status(403).json({
          success: false,
          message: `Insufficient data visibility. Required scope: ${requiredScope}`,
        });
      }

      next();
    } catch (error) {
      console.error('Data visibility check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking data visibility',
      });
    }
  };
};

/**
 * Middleware to check multiple permissions with AND logic
 * @param permissions - Array of {resource, action} pairs
 */
export const checkPermissionsAnd = (
  permissions: Array<{ resource: string; action: string }>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const result = await permissionService.checkPermissionsAnd(userId, permissions);

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: result.reason || 'Insufficient permissions',
        });
      }

      req.permissionResult = result;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};

/**
 * Middleware to check multiple permissions with OR logic
 * @param permissions - Array of {resource, action} pairs
 */
export const checkPermissionsOr = (
  permissions: Array<{ resource: string; action: string }>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const result = await permissionService.checkPermissionsOr(userId, permissions);

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: result.reason || 'None of the required permissions found',
        });
      }

      req.permissionResult = result;

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};

/**
 * Middleware to check ownership OR permission
 * Allows access if user owns the resource OR has the specified permission
 * @param resourceType - Type of resource
 * @param resource - Resource name for permission check
 * @param action - Action name for permission check
 * @param resourceIdParam - Name of the route parameter (default: "id")
 */
export const checkOwnershipOrPermission = (
  resourceType: string,
  resource: string,
  action: string,
  resourceIdParam: string = 'id'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const resourceId = req.params[resourceIdParam];

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID not provided',
        });
      }

      // Check ownership first
      const isOwner = await permissionService.checkOwnership(
        userId,
        resourceType,
        resourceId
      );

      if (isOwner) {
        return next();
      }

      // Check permission as fallback
      const result = await permissionService.checkPermission(
        userId,
        resource,
        action
      );

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
        });
      }

      req.permissionResult = result;

      next();
    } catch (error) {
      console.error('Ownership/Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking access',
      });
    }
  };
};

/**
 * Middleware to attach all user permissions to request
 * Useful for conditional rendering in controllers
 */
export const attachUserPermissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      const userId = req.user.id;
      const permissions = await permissionService.getUserPermissions(userId);

      // Attach to request object
      (req as any).userPermissions = permissions;
    }

    next();
  } catch (error) {
    console.error('Attach permissions error:', error);
    // Don't fail the request, just continue without permissions
    next();
  }
};

/**
 * Context extractors - Helper functions to extract context from requests
 */
export const contextExtractors = {
  /**
   * Extract ticket context
   */
  ticketContext: (req: AuthRequest) => ({
    ticketId: req.params.id || req.params.ticketId,
    status: req.body?.status,
    priority: req.body?.priority,
    assignedTo: req.body?.assignedTo,
  }),

  /**
   * Extract customer context
   */
  customerContext: (req: AuthRequest) => ({
    customerId: req.params.id || req.params.customerId,
    isActive: req.body?.isActive,
  }),

  /**
   * Extract team context
   */
  teamContext: (req: AuthRequest) => ({
    teamId: req.params.teamId,
    role: req.body?.role,
  }),

  /**
   * Extract time-based context
   */
  timeContext: (req: AuthRequest) => {
    const now = new Date();
    return {
      timestamp: now,
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
    };
  },
};

/**
 * Higher-order function to create custom permission middleware
 * @param checkFunction - Custom function that returns a PermissionCheckResult
 * @param errorMessage - Custom error message
 */
export const customPermissionCheck = (
  checkFunction: (userId: string, req: AuthRequest) => Promise<PermissionCheckResult>,
  errorMessage?: string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const result = await checkFunction(userId, req);

      if (!result.granted) {
        return res.status(403).json({
          success: false,
          message: errorMessage || result.reason || 'Insufficient permissions',
        });
      }

      req.permissionResult = result;

      next();
    } catch (error) {
      console.error('Custom permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};
