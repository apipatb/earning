# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document provides a comprehensive guide to the Role-Based Access Control (RBAC) system implemented for EarnTrack. The system provides fine-grained access control for users, roles, and permissions across the entire application.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Pre-defined Roles](#pre-defined-roles)
4. [Setup & Installation](#setup--installation)
5. [Backend Usage](#backend-usage)
6. [Frontend Usage](#frontend-usage)
7. [API Endpoints](#api-endpoints)
8. [Best Practices](#best-practices)

---

## Architecture

The RBAC system consists of four main components:

1. **Database Models** (Prisma Schema)
   - `Role` - Defines user roles (ADMIN, MANAGER, AGENT, CUSTOMER)
   - `Permission` - Defines granular permissions (resource + action)
   - `RolePermission` - Junction table mapping roles to permissions
   - `UserRole` - Junction table mapping users to roles

2. **Service Layer** (`rbac.service.ts`)
   - Business logic for role and permission management
   - Permission checking utilities
   - Resource ownership validation

3. **Middleware** (`rbac.middleware.ts`)
   - Express middleware for route protection
   - Role and permission verification
   - Resource ownership checks

4. **Controller** (`rbac.controller.ts`)
   - RESTful API endpoints for RBAC management
   - CRUD operations for roles and permissions
   - User role assignment

---

## Database Schema

### Role Model
```prisma
model Role {
  id          String   @id @default(uuid())
  name        RoleName @unique
  displayName String
  description String?
  isSystem    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Permission Model
```prisma
model Permission {
  id          String           @id @default(uuid())
  name        String           @unique
  displayName String
  description String?
  resource    String
  action      PermissionAction
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

### Enums
- **RoleName**: `ADMIN`, `MANAGER`, `AGENT`, `CUSTOMER`
- **PermissionAction**: `CREATE`, `READ`, `UPDATE`, `DELETE`, `MANAGE`

---

## Pre-defined Roles

### 1. ADMIN
- **Full system access** with all permissions
- Can manage users, roles, and permissions
- Cannot be deleted (system role)

### 2. MANAGER
- **Team management** capabilities
- Can view and manage team members
- Access to reports and analytics
- Cannot manage system settings or roles

### 3. AGENT
- **Customer support** access
- Can handle customer inquiries
- Create and update customer records
- Create invoices
- Limited to support operations

### 4. CUSTOMER
- **Limited access** to own data only
- Can view own invoices and products
- Read-only access to most resources

---

## Setup & Installation

### 1. Run Database Migration

```bash
cd app/backend
npx prisma migrate dev --name add_rbac_models
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Initialize Default Roles & Permissions

```bash
npx ts-node src/scripts/seed-rbac.ts
```

This will create:
- 4 default roles (ADMIN, MANAGER, AGENT, CUSTOMER)
- ~75 permissions (15 resources × 5 actions each)
- Role-permission mappings for each role

### 4. Register RBAC Routes

In your main Express app file (e.g., `src/app.ts` or `src/server.ts`):

```typescript
import rbacRoutes from './routes/rbac.routes';

// After authentication middleware
app.use('/api', authMiddleware);
app.use('/api', rbacRoutes);
```

---

## Backend Usage

### Protecting Routes with Middleware

#### 1. Require Specific Role

```typescript
import { requireRole } from '../middleware/rbac.middleware';

// Single role
router.get('/admin/dashboard', requireRole('ADMIN'), adminController.dashboard);

// Multiple roles (user must have at least one)
router.get('/reports', requireRole('ADMIN', 'MANAGER'), reportsController.index);
```

#### 2. Require Specific Permission

```typescript
import { requirePermission } from '../middleware/rbac.middleware';

// Check by permission name
router.post('/earnings',
  requirePermission('earnings.create'),
  earningsController.create
);
```

#### 3. Require Resource Permission

```typescript
import { requireResourcePermission } from '../middleware/rbac.middleware';

// Check by resource and action
router.post('/earnings',
  requireResourcePermission('earnings', 'CREATE'),
  earningsController.create
);

router.get('/earnings/:id',
  requireResourcePermission('earnings', 'READ'),
  earningsController.getById
);
```

#### 4. Check Resource Ownership

```typescript
import { checkResourceOwnership } from '../middleware/rbac.middleware';

// Ensure user owns the resource or is admin/manager
router.put('/earnings/:id',
  requireResourcePermission('earnings', 'UPDATE'),
  checkResourceOwnership('earning'), // resourceType
  earningsController.update
);

// Custom resource ID parameter
router.put('/invoices/:invoiceId',
  requireResourcePermission('invoices', 'UPDATE'),
  checkResourceOwnership('invoice', 'invoiceId'),
  invoicesController.update
);
```

#### 5. Convenience Middleware

```typescript
import {
  requireAdmin,
  requireAdminOrManager,
  requireUserManagement,
  requireRoleManagement
} from '../middleware/rbac.middleware';

// Admin only
router.delete('/users/:id', requireAdmin(), usersController.delete);

// Admin or Manager
router.get('/team', requireAdminOrManager(), teamController.index);

// User management permission
router.post('/users', requireUserManagement(), usersController.create);

// Role management permission
router.post('/roles', requireRoleManagement(), rolesController.create);
```

### Using RBAC Service Directly

```typescript
import { rbacService } from '../services/rbac.service';

// Check if user has permission
const hasPermission = await rbacService.hasPermission(userId, 'earnings.create');

// Check if user has role
const isAdmin = await rbacService.hasRole(userId, 'ADMIN');

// Check resource permission
const canUpdate = await rbacService.hasResourcePermission(
  userId,
  'earnings',
  'UPDATE'
);

// Check resource ownership
const isOwner = await rbacService.checkResourceOwnership(
  userId,
  'earning',
  earningId
);

// Get user permissions
const permissions = await rbacService.getUserPermissions(userId);

// Assign role to user
await rbacService.assignRoleToUser({
  userId,
  roleId,
  assignedBy: currentUserId,
  expiresAt: new Date('2024-12-31'), // Optional
});

// Revoke role from user
await rbacService.revokeRoleFromUser(userId, roleId);
```

### Creating Custom Roles

```typescript
import { rbacService } from '../services/rbac.service';

// Create a new role
const role = await rbacService.createRole({
  name: 'MANAGER', // Must be one of the enum values
  displayName: 'Department Manager',
  description: 'Manages specific department operations',
  permissions: [permissionId1, permissionId2], // Optional
});

// Update role
await rbacService.updateRole(roleId, {
  displayName: 'Updated Name',
  description: 'Updated description',
  permissions: [newPermissionId1, newPermissionId2],
});
```

---

## Frontend Usage

### 1. Roles Management Page

Navigate to `/roles` to access the comprehensive roles management interface.

Features:
- View all roles with user counts
- Create/edit/delete custom roles
- Manage role permissions via permission matrix
- Search and filter roles

```typescript
// In your router configuration
import RolesManagement from './pages/RolesManagement';

<Route path="/roles" element={<RolesManagement />} />
```

### 2. Using Components

#### RoleForm Component

```typescript
import RoleForm from './components/RoleForm';

<RoleForm
  role={selectedRole} // null for create, Role object for edit
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

#### PermissionMatrix Component

```typescript
import PermissionMatrix from './components/PermissionMatrix';

<PermissionMatrix
  role={selectedRole}
  onSubmit={handlePermissionsUpdate}
  onCancel={handleCancel}
/>
```

### 3. Checking Permissions in React

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

function useUserPermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    axios.get('/api/me/permissions')
      .then(response => {
        setPermissions(response.data.data.permissions);
        setRoles(response.data.data.roles.map(r => r.name));
      });
  }, []);

  const hasPermission = (permission: string) => permissions.includes(permission);
  const hasRole = (role: string) => roles.includes(role);

  return { permissions, roles, hasPermission, hasRole };
}

// Usage
function MyComponent() {
  const { hasPermission, hasRole } = useUserPermissions();

  return (
    <>
      {hasRole('ADMIN') && <AdminPanel />}
      {hasPermission('earnings.create') && <CreateEarningButton />}
    </>
  );
}
```

---

## API Endpoints

### Roles

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| GET | `/api/roles` | List all roles | `roles.read` or `roles.manage` |
| GET | `/api/roles/:id` | Get role details | `roles.read` or `roles.manage` |
| POST | `/api/roles` | Create new role | `roles.create` or `roles.manage` |
| PUT | `/api/roles/:id` | Update role | `roles.update` or `roles.manage` |
| DELETE | `/api/roles/:id` | Delete role | `roles.delete` or `roles.manage` |
| POST | `/api/roles/:id/permissions` | Assign permissions | `roles.manage` |
| DELETE | `/api/roles/:id/permissions` | Remove permissions | `roles.manage` |
| GET | `/api/roles/:roleId/users` | Get users by role | `roles.read` or `roles.manage` |

### Permissions

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| GET | `/api/permissions` | List all permissions | `roles.read` or `roles.manage` |
| GET | `/api/permissions?grouped=true` | Get permissions grouped by resource | `roles.read` or `roles.manage` |
| POST | `/api/permissions` | Create permission | Admin only |
| PUT | `/api/permissions/:id` | Update permission | Admin only |
| DELETE | `/api/permissions/:id` | Delete permission | Admin only |

### User Roles

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| GET | `/api/users/:userId/roles` | Get user's roles | Admin or Manager |
| GET | `/api/users/:userId/permissions` | Get user's permissions | Admin or Manager |
| POST | `/api/users/:userId/roles` | Assign role to user | Admin or Manager |
| DELETE | `/api/users/:userId/roles/:roleId` | Revoke role from user | Admin or Manager |
| GET | `/api/me/permissions` | Get current user's permissions | Authenticated user |

### Bulk Operations

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| POST | `/api/roles/bulk-assign` | Bulk assign roles to users | Admin only |

### Utility

| Method | Endpoint | Description | Required Permission |
|--------|----------|-------------|---------------------|
| POST | `/api/rbac/initialize` | Initialize default roles & permissions | Admin only (run once) |
| POST | `/api/rbac/check-permission` | Check if user has permission | Admin only |
| POST | `/api/rbac/check-ownership` | Check resource ownership | Admin only |

---

## Best Practices

### 1. Use Appropriate Middleware

- Always use the most specific middleware for your use case
- Prefer `requireResourcePermission` over `requirePermission`
- Use `checkResourceOwnership` for user-specific resources

### 2. Permission Naming Convention

Follow the pattern: `{resource}.{action}`

Examples:
- `earnings.create`
- `invoices.read`
- `users.manage`

### 3. Role Assignment

- Assign the least privileged role necessary
- Use role expiration (`expiresAt`) for temporary access
- Track who assigned roles (`assignedBy`) for auditing

### 4. Resource Ownership

Always check ownership for user-specific resources:

```typescript
router.put('/earnings/:id',
  requireResourcePermission('earnings', 'UPDATE'),
  checkResourceOwnership('earning'),
  earningsController.update
);
```

### 5. Custom Permissions

For complex scenarios, create custom permission checks:

```typescript
import { customPermissionCheck } from '../middleware/rbac.middleware';

const canAccessFinancialReports = customPermissionCheck(
  async (userId, req) => {
    // Custom logic
    const isManager = await rbacService.hasRole(userId, 'MANAGER');
    const hasPermission = await rbacService.hasPermission(userId, 'reports.read');
    return isManager && hasPermission;
  },
  'Insufficient permissions to access financial reports'
);

router.get('/reports/financial', canAccessFinancialReports, reportsController.financial);
```

### 6. Frontend Permission Checks

Always perform permission checks on both frontend AND backend:

```typescript
// Frontend - for UX
{hasPermission('earnings.delete') && <DeleteButton />}

// Backend - for security (required!)
router.delete('/earnings/:id', requirePermission('earnings.delete'), controller.delete);
```

### 7. Caching Considerations

For high-traffic applications, consider caching user permissions:

```typescript
// Example with Redis
const cacheKey = `user:${userId}:permissions`;
let permissions = await redis.get(cacheKey);

if (!permissions) {
  permissions = await rbacService.getUserPermissions(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(permissions)); // 5 min cache
}
```

### 8. Audit Logging

Log important RBAC operations:

```typescript
await rbacService.assignRoleToUser({ userId, roleId, assignedBy });
logger.info('Role assigned', { userId, roleId, assignedBy });
```

### 9. Testing

Always test permission checks:

```typescript
describe('RBAC Middleware', () => {
  it('should allow admin to access protected route', async () => {
    const adminUser = await createUserWithRole('ADMIN');
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminUser.token}`);

    expect(response.status).toBe(200);
  });

  it('should deny customer access to admin route', async () => {
    const customerUser = await createUserWithRole('CUSTOMER');
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${customerUser.token}`);

    expect(response.status).toBe(403);
  });
});
```

---

## Troubleshooting

### Common Issues

1. **"Insufficient permissions" error**
   - Verify the user has the required role assigned
   - Check that the role has the necessary permissions
   - Ensure permissions were initialized correctly

2. **System roles cannot be modified**
   - System roles (ADMIN, MANAGER, AGENT, CUSTOMER) are protected
   - Create custom roles for organization-specific needs

3. **Cannot delete role with assigned users**
   - Remove all user role assignments first
   - Or use bulk operations to reassign users to different roles

4. **Permissions not updating**
   - Clear permission cache if implemented
   - Check that role-permission mappings are correct
   - Verify database was migrated properly

---

## Support

For questions or issues with the RBAC implementation:

1. Check the implementation files:
   - `/app/backend/src/services/rbac.service.ts`
   - `/app/backend/src/middleware/rbac.middleware.ts`
   - `/app/backend/src/controllers/rbac.controller.ts`

2. Review example usage in:
   - `/app/backend/src/routes/rbac.routes.ts`

3. Frontend components:
   - `/app/frontend/src/pages/RolesManagement.tsx`
   - `/app/frontend/src/components/RoleForm.tsx`
   - `/app/frontend/src/components/PermissionMatrix.tsx`

---

## License

This RBAC implementation is part of the EarnTrack application.
