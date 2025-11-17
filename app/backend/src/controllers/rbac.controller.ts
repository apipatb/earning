import { Request, Response } from 'express';
import { rbacService, CreateRoleInput, CreatePermissionInput, AssignRoleInput } from '../services/rbac.service';
import { RoleName, PermissionAction } from '@prisma/client';
import { AuthRequest } from '../middleware/rbac.middleware';
import { logger } from '../utils/logger';

/**
 * RBAC Controller
 * Handles all role and permission management endpoints
 */
export class RBACController {
  /**
   * Get all roles
   * GET /api/roles
   */
  async getRoles(req: Request, res: Response) {
    try {
      const roles = await rbacService.getRoles();

      return res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      logger.error('Get roles error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching roles',
      });
    }
  }

  /**
   * Get a single role by ID
   * GET /api/roles/:id
   */
  async getRoleById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const role = await rbacService.getRoleById(id);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: role,
      });
    } catch (error) {
      logger.error('Get role error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching role',
      });
    }
  }

  /**
   * Create a new role
   * POST /api/roles
   */
  async createRole(req: Request, res: Response) {
    try {
      const { name, displayName, description, permissions } = req.body;

      // Validate required fields
      if (!name || !displayName) {
        return res.status(400).json({
          success: false,
          message: 'Name and display name are required',
        });
      }

      // Validate role name enum
      if (!Object.values(RoleName).includes(name)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role name. Must be one of: ${Object.values(RoleName).join(', ')}`,
        });
      }

      const roleData: CreateRoleInput = {
        name,
        displayName,
        description,
        permissions,
      };

      const role = await rbacService.createRole(roleData);

      return res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role,
      });
    } catch (error: any) {
      logger.error('Create role error', error as Error);

      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A role with this name already exists',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error creating role',
      });
    }
  }

  /**
   * Update a role
   * PUT /api/roles/:id
   */
  async updateRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { displayName, description, permissions } = req.body;

      const role = await rbacService.updateRole(id, {
        displayName,
        description,
        permissions,
      });

      return res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: role,
      });
    } catch (error: any) {
      logger.error('Update role error', error as Error);

      if (error.message === 'Cannot modify system roles') {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error updating role',
      });
    }
  }

  /**
   * Delete a role
   * DELETE /api/roles/:id
   */
  async deleteRole(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await rbacService.deleteRole(id);

      return res.status(200).json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete role error', error as Error);

      if (error.message.includes('Cannot delete system roles')) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('Cannot delete role')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error deleting role',
      });
    }
  }

  /**
   * Get all permissions
   * GET /api/permissions
   */
  async getPermissions(req: Request, res: Response) {
    try {
      const grouped = req.query.grouped === 'true';

      const permissions = grouped
        ? await rbacService.getPermissionsGrouped()
        : await rbacService.getPermissions();

      return res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      logger.error('Get permissions error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching permissions',
      });
    }
  }

  /**
   * Create a new permission
   * POST /api/permissions
   */
  async createPermission(req: Request, res: Response) {
    try {
      const { name, displayName, description, resource, action } = req.body;

      // Validate required fields
      if (!name || !displayName || !resource || !action) {
        return res.status(400).json({
          success: false,
          message: 'Name, display name, resource, and action are required',
        });
      }

      // Validate action enum
      if (!Object.values(PermissionAction).includes(action)) {
        return res.status(400).json({
          success: false,
          message: `Invalid action. Must be one of: ${Object.values(PermissionAction).join(', ')}`,
        });
      }

      const permissionData: CreatePermissionInput = {
        name,
        displayName,
        description,
        resource,
        action,
      };

      const permission = await rbacService.createPermission(permissionData);

      return res.status(201).json({
        success: true,
        message: 'Permission created successfully',
        data: permission,
      });
    } catch (error: any) {
      logger.error('Create permission error', error as Error);

      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'A permission with this name or resource/action combination already exists',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error creating permission',
      });
    }
  }

  /**
   * Update a permission
   * PUT /api/permissions/:id
   */
  async updatePermission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { displayName, description } = req.body;

      const permission = await rbacService.updatePermission(id, {
        displayName,
        description,
      });

      return res.status(200).json({
        success: true,
        message: 'Permission updated successfully',
        data: permission,
      });
    } catch (error) {
      logger.error('Update permission error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error updating permission',
      });
    }
  }

  /**
   * Delete a permission
   * DELETE /api/permissions/:id
   */
  async deletePermission(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await rbacService.deletePermission(id);

      return res.status(200).json({
        success: true,
        message: 'Permission deleted successfully',
      });
    } catch (error) {
      logger.error('Delete permission error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting permission',
      });
    }
  }

  /**
   * Assign permissions to a role
   * POST /api/roles/:id/permissions
   */
  async assignPermissionsToRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;

      if (!permissionIds || !Array.isArray(permissionIds)) {
        return res.status(400).json({
          success: false,
          message: 'Permission IDs array is required',
        });
      }

      await rbacService.assignPermissionsToRole(id, permissionIds);

      return res.status(200).json({
        success: true,
        message: 'Permissions assigned successfully',
      });
    } catch (error) {
      logger.error('Assign permissions error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error assigning permissions',
      });
    }
  }

  /**
   * Remove permissions from a role
   * DELETE /api/roles/:id/permissions
   */
  async removePermissionsFromRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permissionIds } = req.body;

      if (!permissionIds || !Array.isArray(permissionIds)) {
        return res.status(400).json({
          success: false,
          message: 'Permission IDs array is required',
        });
      }

      await rbacService.removePermissionsFromRole(id, permissionIds);

      return res.status(200).json({
        success: true,
        message: 'Permissions removed successfully',
      });
    } catch (error) {
      logger.error('Remove permissions error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error removing permissions',
      });
    }
  }

  /**
   * Get user roles
   * GET /api/users/:userId/roles
   */
  async getUserRoles(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const userRoles = await rbacService.getUserRoles(userId);

      return res.status(200).json({
        success: true,
        data: userRoles,
      });
    } catch (error) {
      logger.error('Get user roles error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user roles',
      });
    }
  }

  /**
   * Get user permissions
   * GET /api/users/:userId/permissions
   */
  async getUserPermissions(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      const permissions = await rbacService.getUserPermissions(userId);

      return res.status(200).json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      logger.error('Get user permissions error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user permissions',
      });
    }
  }

  /**
   * Get current user's roles and permissions
   * GET /api/me/permissions
   */
  async getCurrentUserPermissions(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userId = req.user.id;

      const [roles, permissions] = await Promise.all([
        rbacService.getUserRoles(userId),
        rbacService.getUserPermissions(userId),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          roles: roles.map((ur) => ur.role),
          permissions,
        },
      });
    } catch (error) {
      logger.error('Get current user permissions error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching permissions',
      });
    }
  }

  /**
   * Assign role to user
   * POST /api/users/:userId/roles
   */
  async assignRoleToUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { roleId, expiresAt } = req.body;

      if (!roleId) {
        return res.status(400).json({
          success: false,
          message: 'Role ID is required',
        });
      }

      const assignedBy = req.user?.id;

      const assignmentData: AssignRoleInput = {
        userId,
        roleId,
        assignedBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      };

      const userRole = await rbacService.assignRoleToUser(assignmentData);

      return res.status(201).json({
        success: true,
        message: 'Role assigned successfully',
        data: userRole,
      });
    } catch (error: any) {
      logger.error('Assign role error', error as Error);

      // Handle unique constraint violation (user already has this role)
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'User already has this role',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error assigning role',
      });
    }
  }

  /**
   * Revoke role from user
   * DELETE /api/users/:userId/roles/:roleId
   */
  async revokeRoleFromUser(req: Request, res: Response) {
    try {
      const { userId, roleId } = req.params;

      await rbacService.revokeRoleFromUser(userId, roleId);

      return res.status(200).json({
        success: true,
        message: 'Role revoked successfully',
      });
    } catch (error) {
      logger.error('Revoke role error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error revoking role',
      });
    }
  }

  /**
   * Bulk assign roles to users
   * POST /api/roles/bulk-assign
   */
  async bulkAssignRoles(req: AuthRequest, res: Response) {
    try {
      const { assignments } = req.body;

      if (!assignments || !Array.isArray(assignments)) {
        return res.status(400).json({
          success: false,
          message: 'Assignments array is required',
        });
      }

      const assignedBy = req.user?.id;

      // Add assignedBy to each assignment
      const assignmentsWithAssignedBy = assignments.map((assignment: AssignRoleInput) => ({
        ...assignment,
        assignedBy,
      }));

      const result = await rbacService.bulkAssignRoles(assignmentsWithAssignedBy);

      return res.status(200).json({
        success: true,
        message: `Successfully assigned ${result.successful} role(s). Failed: ${result.failed}`,
        data: result,
      });
    } catch (error) {
      logger.error('Bulk assign roles error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error bulk assigning roles',
      });
    }
  }

  /**
   * Get users by role
   * GET /api/roles/:roleId/users
   */
  async getUsersByRole(req: Request, res: Response) {
    try {
      const { roleId } = req.params;

      const users = await rbacService.getUsersByRole(roleId);

      return res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error('Get users by role error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching users',
      });
    }
  }

  /**
   * Initialize default roles and permissions
   * POST /api/rbac/initialize
   * WARNING: This should only be run once during initial setup
   */
  async initializeDefaultRoles(req: Request, res: Response) {
    try {
      const result = await rbacService.initializeDefaultRoles();

      return res.status(200).json({
        success: true,
        message: 'Default roles and permissions initialized successfully',
        data: {
          rolesCreated: result.roles.length,
          permissionsCreated: result.permissions.length,
        },
      });
    } catch (error) {
      logger.error('Initialize roles error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error initializing roles and permissions',
      });
    }
  }

  /**
   * Check if user has permission
   * POST /api/rbac/check-permission
   */
  async checkPermission(req: Request, res: Response) {
    try {
      const { userId, permissionName, resource, action } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      let hasPermission = false;

      if (permissionName) {
        hasPermission = await rbacService.hasPermission(userId, permissionName);
      } else if (resource && action) {
        hasPermission = await rbacService.hasResourcePermission(userId, resource, action);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either permissionName or (resource and action) is required',
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          hasPermission,
        },
      });
    } catch (error) {
      logger.error('Check permission error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permission',
      });
    }
  }

  /**
   * Check resource ownership
   * POST /api/rbac/check-ownership
   */
  async checkOwnership(req: Request, res: Response) {
    try {
      const { userId, resourceType, resourceId } = req.body;

      if (!userId || !resourceType || !resourceId) {
        return res.status(400).json({
          success: false,
          message: 'User ID, resource type, and resource ID are required',
        });
      }

      const isOwner = await rbacService.checkResourceOwnership(userId, resourceType, resourceId);

      return res.status(200).json({
        success: true,
        data: {
          isOwner,
        },
      });
    } catch (error) {
      logger.error('Check ownership error', error as Error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
      });
    }
  }
}

export const rbacController = new RBACController();
