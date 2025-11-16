/**
 * Database Test Helpers
 * Utilities for working with test database
 */

import { PrismaClient } from '@prisma/client';
import { getTestPrismaClient } from './integration-setup';
import * as bcrypt from 'bcrypt';

/**
 * Create test user with hashed password
 */
export async function createTestUser(
  prisma: PrismaClient,
  data?: {
    email?: string;
    password?: string;
    name?: string;
    timezone?: string;
    currency?: string;
  }
) {
  const {
    email = `test-${Date.now()}@example.com`,
    password = 'TestPassword123!',
    name = 'Test User',
    timezone = 'UTC',
    currency = 'USD',
  } = data || {};

  const passwordHash = await bcrypt.hash(password, 10);

  return await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      timezone,
      currency,
    },
  });
}

/**
 * Create test ticket
 */
export async function createTestTicket(
  prisma: PrismaClient,
  data: {
    userId: string;
    customerId?: string;
    subject?: string;
    description?: string;
    status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  }
) {
  const {
    userId,
    customerId = null,
    subject = 'Test Ticket',
    description = 'Test ticket description',
    status = 'OPEN',
    priority = 'MEDIUM',
  } = data;

  return await prisma.ticket.create({
    data: {
      userId,
      customerId,
      subject,
      description,
      status,
      priority,
    },
  });
}

/**
 * Create test API quota
 */
export async function createTestQuota(
  prisma: PrismaClient,
  data: {
    userId: string;
    tier?: 'FREE' | 'PRO' | 'ENTERPRISE';
    requestsPerHour?: number;
    requestsPerDay?: number;
    requestsPerMonth?: number;
  }
) {
  const {
    userId,
    tier = 'FREE',
    requestsPerHour = 100,
    requestsPerDay = 1000,
    requestsPerMonth = 10000,
  } = data;

  return await prisma.apiQuota.create({
    data: {
      userId,
      tier,
      requestsPerHour,
      requestsPerDay,
      requestsPerMonth,
    },
  });
}

/**
 * Create test role
 */
export async function createTestRole(
  prisma: PrismaClient,
  data?: {
    name?: 'ADMIN' | 'MANAGER' | 'AGENT' | 'CUSTOMER';
    displayName?: string;
    description?: string;
    isSystem?: boolean;
  }
) {
  const {
    name = 'AGENT',
    displayName = 'Agent',
    description = 'Test role',
    isSystem = false,
  } = data || {};

  return await prisma.role.create({
    data: {
      name,
      displayName,
      description,
      isSystem,
    },
  });
}

/**
 * Create test permission
 */
export async function createTestPermission(
  prisma: PrismaClient,
  data: {
    name: string;
    displayName: string;
    resource: string;
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE';
    description?: string;
  }
) {
  return await prisma.permission.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      resource: data.resource,
      action: data.action,
      description: data.description || `Permission to ${data.action} ${data.resource}`,
    },
  });
}

/**
 * Assign role to user
 */
export async function assignRoleToUser(
  prisma: PrismaClient,
  userId: string,
  roleId: string,
  assignedBy?: string
) {
  return await prisma.userRole.create({
    data: {
      userId,
      roleId,
      assignedBy,
    },
  });
}

/**
 * Assign permission to role
 */
export async function assignPermissionToRole(
  prisma: PrismaClient,
  roleId: string,
  permissionId: string
) {
  return await prisma.rolePermission.create({
    data: {
      roleId,
      permissionId,
    },
  });
}

/**
 * Create test customer
 */
export async function createTestCustomer(
  prisma: PrismaClient,
  data: {
    userId: string;
    name?: string;
    email?: string;
    phone?: string;
  }
) {
  const {
    userId,
    name = 'Test Customer',
    email = `customer-${Date.now()}@example.com`,
    phone = '1234567890',
  } = data;

  return await prisma.customer.create({
    data: {
      userId,
      name,
      email,
      phone,
    },
  });
}

/**
 * Create test platform
 */
export async function createTestPlatform(
  prisma: PrismaClient,
  data: {
    userId: string;
    name?: string;
    category?: 'FREELANCE' | 'DELIVERY' | 'SERVICES' | 'OTHER';
  }
) {
  const {
    userId,
    name = 'Test Platform',
    category = 'FREELANCE',
  } = data;

  return await prisma.platform.create({
    data: {
      userId,
      name,
      category,
    },
  });
}

/**
 * Create test earning
 */
export async function createTestEarning(
  prisma: PrismaClient,
  data: {
    userId: string;
    platformId?: string;
    amount?: number;
    source?: string;
    description?: string;
  }
) {
  const {
    userId,
    platformId = null,
    amount = 100.00,
    source = 'Test Source',
    description = 'Test earning',
  } = data;

  return await prisma.earning.create({
    data: {
      userId,
      platformId,
      amount,
      source,
      description,
      date: new Date(),
    },
  });
}

/**
 * Create test invoice
 */
export async function createTestInvoice(
  prisma: PrismaClient,
  data: {
    userId: string;
    customerId: string;
    amount?: number;
    status?: 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  }
) {
  const {
    userId,
    customerId,
    amount = 1000.00,
    status = 'DRAFT',
  } = data;

  return await prisma.invoice.create({
    data: {
      userId,
      customerId,
      invoiceNumber: `INV-${Date.now()}`,
      amount,
      status,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
}

/**
 * Create test support ticket (different from regular ticket)
 */
export async function createTestSupportTicket(
  prisma: PrismaClient,
  data: {
    userId: string;
    customerId?: string;
    subject?: string;
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  }
) {
  const {
    userId,
    customerId = null,
    subject = 'Test Support Ticket',
    description = 'Test support ticket description',
    priority = 'MEDIUM',
  } = data;

  return await prisma.supportTicket.create({
    data: {
      userId,
      customerId,
      subject,
      description,
      priority,
      status: 'OPEN',
    },
  });
}

/**
 * Get user with roles and permissions
 */
export async function getUserWithPermissions(prisma: PrismaClient, userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * Check if user has specific permission
 */
export async function userHasPermission(
  prisma: PrismaClient,
  userId: string,
  resource: string,
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE'
): Promise<boolean> {
  const userWithPerms = await getUserWithPermissions(prisma, userId);

  if (!userWithPerms) return false;

  for (const userRole of userWithPerms.userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      const perm = rolePermission.permission;
      if (perm.resource === resource && perm.action === action) {
        return true;
      }
      // MANAGE permission includes all actions
      if (perm.resource === resource && perm.action === 'MANAGE') {
        return true;
      }
    }
  }

  return false;
}

/**
 * Create complete test environment with user, roles, and permissions
 */
export async function createTestEnvironment(prisma: PrismaClient) {
  // Create user
  const user = await createTestUser(prisma, {
    email: 'testuser@example.com',
    name: 'Test User',
  });

  // Create roles
  const adminRole = await createTestRole(prisma, {
    name: 'ADMIN',
    displayName: 'Administrator',
    isSystem: true,
  });

  const agentRole = await createTestRole(prisma, {
    name: 'AGENT',
    displayName: 'Support Agent',
    isSystem: true,
  });

  // Create permissions
  const readTickets = await createTestPermission(prisma, {
    name: 'tickets.read',
    displayName: 'Read Tickets',
    resource: 'tickets',
    action: 'READ',
  });

  const createTickets = await createTestPermission(prisma, {
    name: 'tickets.create',
    displayName: 'Create Tickets',
    resource: 'tickets',
    action: 'CREATE',
  });

  const manageUsers = await createTestPermission(prisma, {
    name: 'users.manage',
    displayName: 'Manage Users',
    resource: 'users',
    action: 'MANAGE',
  });

  // Assign permissions to roles
  await assignPermissionToRole(prisma, agentRole.id, readTickets.id);
  await assignPermissionToRole(prisma, agentRole.id, createTickets.id);
  await assignPermissionToRole(prisma, adminRole.id, manageUsers.id);
  await assignPermissionToRole(prisma, adminRole.id, readTickets.id);
  await assignPermissionToRole(prisma, adminRole.id, createTickets.id);

  // Create customer
  const customer = await createTestCustomer(prisma, {
    userId: user.id,
    name: 'Test Customer',
  });

  return {
    user,
    adminRole,
    agentRole,
    permissions: {
      readTickets,
      createTickets,
      manageUsers,
    },
    customer,
  };
}
