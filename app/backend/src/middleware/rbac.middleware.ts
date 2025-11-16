import { Request, Response, NextFunction } from 'express';
import { RoleName, PermissionAction } from '@prisma/client';
import { rbacService } from '../services/rbac.service';

/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * Middleware to check if user has a specific role
 * @param roles - Single role or array of roles
 */
export const requireRole = (...roles: RoleName[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const hasRole = await rbacService.hasAnyRole(userId, roles);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Required role(s): ' + roles.join(', '),
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking user role',
      });
    }
  };
};

/**
 * Middleware to check if user has ALL specified roles
 * @param roles - Array of roles that user must have
 */
export const requireAllRoles = (...roles: RoleName[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const hasAllRoles = await rbacService.hasAllRoles(userId, roles);

      if (!hasAllRoles) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Required all roles: ' + roles.join(', '),
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking user roles',
      });
    }
  };
};

/**
 * Middleware to check if user has a specific permission
 * @param permissionName - Permission name (e.g., "earnings.create")
 */
export const requirePermission = (permissionName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const hasPermission = await rbacService.hasPermission(userId, permissionName);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required permission: ${permissionName}`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking user permission',
      });
    }
  };
};

/**
 * Middleware to check if user has permission to access a resource
 * @param resource - Resource name (e.g., "earnings", "invoices")
 * @param action - Permission action (CREATE, READ, UPDATE, DELETE, MANAGE)
 */
export const requireResourcePermission = (resource: string, action: PermissionAction) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;
      const hasPermission = await rbacService.hasResourcePermission(userId, resource, action);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Insufficient permissions. Required: ${action} ${resource}`,
        });
      }

      next();
    } catch (error) {
      console.error('Resource permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource permission',
      });
    }
  };
};

/**
 * Middleware to check resource ownership
 * User must either own the resource or have admin/manager role
 * @param resourceType - Type of resource (e.g., "earning", "invoice")
 * @param resourceIdParam - Name of the route parameter containing the resource ID (default: "id")
 */
export const checkResourceOwnership = (
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

      // Check if user is admin or manager (they can access all resources)
      const isAdminOrManager = await rbacService.hasAnyRole(userId, ['ADMIN', 'MANAGER']);

      if (isAdminOrManager) {
        return next();
      }

      // Check if user owns the resource
      const isOwner = await rbacService.checkResourceOwnership(userId, resourceType, resourceId);

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
      });
    }
  };
};

/**
 * Middleware to check if user is admin
 * Convenience wrapper around requireRole
 */
export const requireAdmin = () => requireRole('ADMIN');

/**
 * Middleware to check if user is admin or manager
 * Convenience wrapper around requireRole
 */
export const requireAdminOrManager = () => requireRole('ADMIN', 'MANAGER');

/**
 * Middleware to check if user can manage users
 * Requires either ADMIN role or users.manage permission
 */
export const requireUserManagement = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;

      // Check if user is admin
      const isAdmin = await rbacService.hasRole(userId, 'ADMIN');
      if (isAdmin) {
        return next();
      }

      // Check if user has manage users permission
      const hasPermission = await rbacService.hasResourcePermission(userId, 'users', 'MANAGE');
      if (hasPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. User management access required.',
      });
    } catch (error) {
      console.error('User management check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking user management permission',
      });
    }
  };
};

/**
 * Middleware to check if user can manage roles
 * Requires either ADMIN role or roles.manage permission
 */
export const requireRoleManagement = () => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;

      // Check if user is admin
      const isAdmin = await rbacService.hasRole(userId, 'ADMIN');
      if (isAdmin) {
        return next();
      }

      // Check if user has manage roles permission
      const hasPermission = await rbacService.hasResourcePermission(userId, 'roles', 'MANAGE');
      if (hasPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Role management access required.',
      });
    } catch (error) {
      console.error('Role management check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking role management permission',
      });
    }
  };
};

/**
 * Middleware to attach user permissions to request object
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
      const permissions = await rbacService.getUserPermissions(userId);
      const roles = await rbacService.getUserRoles(userId);

      // Attach to request object
      (req as any).userPermissions = permissions;
      (req as any).userRoles = roles.map((ur) => ur.role.name);
    }

    next();
  } catch (error) {
    console.error('Attach permissions error:', error);
    // Don't fail the request, just continue without permissions
    next();
  }
};

/**
 * Utility function to create custom permission middleware
 * @param checkFunction - Custom function to check permissions
 * @param errorMessage - Error message to return if check fails
 */
export const customPermissionCheck = (
  checkFunction: (userId: string, req: AuthRequest) => Promise<boolean>,
  errorMessage: string = 'Insufficient permissions'
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
      const hasPermission = await checkFunction(userId, req);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: errorMessage,
        });
      }

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
