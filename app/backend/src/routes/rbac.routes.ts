import { Router } from 'express';
import { rbacController } from '../controllers/rbac.controller';
import {
  requireAdmin,
  requireAdminOrManager,
  requireRoleManagement,
  requireRole,
  requirePermission,
  requireResourcePermission,
  checkResourceOwnership,
  attachUserPermissions,
} from '../middleware/rbac.middleware';

const router = Router();

// Note: All routes should be protected by authentication middleware first
// Example: router.use(authenticateUser);

/**
 * RBAC Management Routes
 * These routes require admin or role management permissions
 */

// Roles Management
router.get('/roles', requireRoleManagement(), rbacController.getRoles);
router.get('/roles/:id', requireRoleManagement(), rbacController.getRoleById);
router.post('/roles', requireRoleManagement(), rbacController.createRole);
router.put('/roles/:id', requireRoleManagement(), rbacController.updateRole);
router.delete('/roles/:id', requireRoleManagement(), rbacController.deleteRole);

// Role Permissions
router.post('/roles/:id/permissions', requireRoleManagement(), rbacController.assignPermissionsToRole);
router.delete('/roles/:id/permissions', requireRoleManagement(), rbacController.removePermissionsFromRole);

// Permissions Management
router.get('/permissions', requireRoleManagement(), rbacController.getPermissions);
router.post('/permissions', requireAdmin(), rbacController.createPermission);
router.put('/permissions/:id', requireAdmin(), rbacController.updatePermission);
router.delete('/permissions/:id', requireAdmin(), rbacController.deletePermission);

// User Roles Management
router.get('/users/:userId/roles', requireAdminOrManager(), rbacController.getUserRoles);
router.get('/users/:userId/permissions', requireAdminOrManager(), rbacController.getUserPermissions);
router.post('/users/:userId/roles', requireAdminOrManager(), rbacController.assignRoleToUser);
router.delete('/users/:userId/roles/:roleId', requireAdminOrManager(), rbacController.revokeRoleFromUser);

// Bulk Operations
router.post('/roles/bulk-assign', requireAdmin(), rbacController.bulkAssignRoles);

// Role Users
router.get('/roles/:roleId/users', requireRoleManagement(), rbacController.getUsersByRole);

// Current User Permissions
router.get('/me/permissions', attachUserPermissions, rbacController.getCurrentUserPermissions);

// Utility Endpoints
router.post('/rbac/check-permission', requireAdmin(), rbacController.checkPermission);
router.post('/rbac/check-ownership', requireAdmin(), rbacController.checkOwnership);

// Initialize RBAC (should be protected and only run once)
router.post('/rbac/initialize', requireAdmin(), rbacController.initializeDefaultRoles);

export default router;

/**
 * Example usage in other routes:
 *
 * // Protect entire route group by role
 * router.use('/admin', requireRole('ADMIN'));
 *
 * // Protect specific routes by permission
 * router.post('/earnings', requireResourcePermission('earnings', 'CREATE'), earningsController.create);
 * router.get('/earnings/:id', requireResourcePermission('earnings', 'READ'), earningsController.getById);
 * router.put('/earnings/:id', requireResourcePermission('earnings', 'UPDATE'), earningsController.update);
 * router.delete('/earnings/:id', requireResourcePermission('earnings', 'DELETE'), earningsController.delete);
 *
 * // Check resource ownership (user can only access their own data)
 * router.put('/earnings/:id',
 *   requireResourcePermission('earnings', 'UPDATE'),
 *   checkResourceOwnership('earning'),
 *   earningsController.update
 * );
 *
 * // Multiple role requirement
 * router.get('/reports', requireRole('ADMIN', 'MANAGER'), reportsController.getReports);
 *
 * // Attach permissions to request for conditional logic
 * router.get('/dashboard', attachUserPermissions, (req, res) => {
 *   const permissions = (req as any).userPermissions;
 *   const roles = (req as any).userRoles;
 *   // Use permissions to conditionally render data
 * });
 */
