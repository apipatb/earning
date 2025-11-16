/**
 * Test Data Factories
 * Factory functions for generating test data with flexible overrides
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

let sequenceCounter = 0;

/**
 * Get next sequence number for unique values
 */
function sequence(): number {
  return ++sequenceCounter;
}

/**
 * Reset sequence counter (useful between tests)
 */
export function resetSequence(): void {
  sequenceCounter = 0;
}

/**
 * User Factory
 */
export class UserFactory {
  private defaults = {
    email: () => `user-${sequence()}@example.com`,
    password: 'SecurePassword123!',
    name: () => `Test User ${sequence()}`,
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
  };

  async create(prisma: PrismaClient, overrides: Partial<typeof this.defaults> = {}) {
    const data = { ...this.defaults, ...overrides };
    const passwordHash = await bcrypt.hash(
      typeof data.password === 'function' ? data.password() : data.password,
      10
    );

    return await prisma.user.create({
      data: {
        email: typeof data.email === 'function' ? data.email() : data.email,
        passwordHash,
        name: typeof data.name === 'function' ? data.name() : data.name,
        timezone: typeof data.timezone === 'function' ? data.timezone() : data.timezone,
        currency: typeof data.currency === 'function' ? data.currency() : data.currency,
        language: typeof data.language === 'function' ? data.language() : data.language,
      },
    });
  }

  async createMany(prisma: PrismaClient, count: number, overrides: Partial<typeof this.defaults> = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(prisma, overrides));
    }
    return users;
  }
}

/**
 * Ticket Factory
 */
export class TicketFactory {
  private defaults = {
    subject: () => `Ticket ${sequence()}`,
    description: () => `This is test ticket ${sequence()}`,
    status: 'OPEN' as const,
    priority: 'MEDIUM' as const,
    category: 'General',
  };

  async create(
    prisma: PrismaClient,
    userId: string,
    overrides: Partial<typeof this.defaults & { customerId?: string; assignedTo?: string }> = {}
  ) {
    const data = { ...this.defaults, ...overrides };

    return await prisma.ticket.create({
      data: {
        userId,
        customerId: overrides.customerId || null,
        assignedTo: overrides.assignedTo || null,
        subject: typeof data.subject === 'function' ? data.subject() : data.subject,
        description: typeof data.description === 'function' ? data.description() : data.description,
        status: data.status,
        priority: data.priority,
        category: data.category,
      },
    });
  }

  async createMany(
    prisma: PrismaClient,
    userId: string,
    count: number,
    overrides: Partial<typeof this.defaults> = {}
  ) {
    const tickets = [];
    for (let i = 0; i < count; i++) {
      tickets.push(await this.create(prisma, userId, overrides));
    }
    return tickets;
  }
}

/**
 * Quota Factory
 */
export class QuotaFactory {
  private defaults = {
    tier: 'FREE' as const,
    requestsPerHour: 100,
    requestsPerDay: 1000,
    requestsPerMonth: 10000,
    storageGB: 1,
    concurrentRequests: 5,
  };

  async create(prisma: PrismaClient, userId: string, overrides: Partial<typeof this.defaults> = {}) {
    const data = { ...this.defaults, ...overrides };

    return await prisma.apiQuota.create({
      data: {
        userId,
        tier: data.tier,
        requestsPerHour: data.requestsPerHour,
        requestsPerDay: data.requestsPerDay,
        requestsPerMonth: data.requestsPerMonth,
        storageGB: data.storageGB,
        concurrentRequests: data.concurrentRequests,
      },
    });
  }

  async createPro(prisma: PrismaClient, userId: string) {
    return await this.create(prisma, userId, {
      tier: 'PRO',
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      requestsPerMonth: 100000,
      storageGB: 10,
      concurrentRequests: 20,
    });
  }

  async createEnterprise(prisma: PrismaClient, userId: string) {
    return await this.create(prisma, userId, {
      tier: 'ENTERPRISE',
      requestsPerHour: 10000,
      requestsPerDay: 100000,
      requestsPerMonth: 1000000,
      storageGB: 100,
      concurrentRequests: 100,
    });
  }
}

/**
 * Role Factory
 */
export class RoleFactory {
  async create(
    prisma: PrismaClient,
    data: {
      name: 'ADMIN' | 'MANAGER' | 'AGENT' | 'CUSTOMER';
      displayName?: string;
      description?: string;
      isSystem?: boolean;
    }
  ) {
    return await prisma.role.create({
      data: {
        name: data.name,
        displayName: data.displayName || data.name,
        description: data.description || `${data.name} role`,
        isSystem: data.isSystem !== undefined ? data.isSystem : false,
      },
    });
  }

  async createAdmin(prisma: PrismaClient) {
    return await this.create(prisma, {
      name: 'ADMIN',
      displayName: 'Administrator',
      description: 'Full system access',
      isSystem: true,
    });
  }

  async createAgent(prisma: PrismaClient) {
    return await this.create(prisma, {
      name: 'AGENT',
      displayName: 'Support Agent',
      description: 'Customer support agent',
      isSystem: true,
    });
  }

  async createManager(prisma: PrismaClient) {
    return await this.create(prisma, {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Team manager',
      isSystem: true,
    });
  }
}

/**
 * Permission Factory
 */
export class PermissionFactory {
  async create(
    prisma: PrismaClient,
    data: {
      resource: string;
      action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE';
      displayName?: string;
      description?: string;
    }
  ) {
    const name = `${data.resource}.${data.action.toLowerCase()}`;

    return await prisma.permission.create({
      data: {
        name,
        displayName: data.displayName || `${data.action} ${data.resource}`,
        description: data.description || `Permission to ${data.action} ${data.resource}`,
        resource: data.resource,
        action: data.action,
      },
    });
  }

  async createSet(
    prisma: PrismaClient,
    resource: string,
    actions: Array<'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE'>
  ) {
    const permissions = [];
    for (const action of actions) {
      permissions.push(await this.create(prisma, { resource, action }));
    }
    return permissions;
  }

  async createCRUD(prisma: PrismaClient, resource: string) {
    return await this.createSet(prisma, resource, ['CREATE', 'READ', 'UPDATE', 'DELETE']);
  }
}

/**
 * Customer Factory
 */
export class CustomerFactory {
  private defaults = {
    name: () => `Customer ${sequence()}`,
    email: () => `customer-${sequence()}@example.com`,
    phone: () => `555-${String(sequence()).padStart(4, '0')}`,
  };

  async create(prisma: PrismaClient, userId: string, overrides: Partial<typeof this.defaults> = {}) {
    const data = { ...this.defaults, ...overrides };

    return await prisma.customer.create({
      data: {
        userId,
        name: typeof data.name === 'function' ? data.name() : data.name,
        email: typeof data.email === 'function' ? data.email() : data.email,
        phone: typeof data.phone === 'function' ? data.phone() : data.phone,
      },
    });
  }

  async createMany(prisma: PrismaClient, userId: string, count: number, overrides: Partial<typeof this.defaults> = {}) {
    const customers = [];
    for (let i = 0; i < count; i++) {
      customers.push(await this.create(prisma, userId, overrides));
    }
    return customers;
  }
}

/**
 * Platform Factory
 */
export class PlatformFactory {
  private defaults = {
    name: () => `Platform ${sequence()}`,
    category: 'FREELANCE' as const,
  };

  async create(prisma: PrismaClient, userId: string, overrides: Partial<typeof this.defaults> = {}) {
    const data = { ...this.defaults, ...overrides };

    return await prisma.platform.create({
      data: {
        userId,
        name: typeof data.name === 'function' ? data.name() : data.name,
        category: data.category,
      },
    });
  }
}

/**
 * Earning Factory
 */
export class EarningFactory {
  private defaults = {
    amount: () => Math.random() * 1000 + 100, // Random amount between 100-1100
    source: () => `Source ${sequence()}`,
    description: () => `Earning ${sequence()}`,
    date: () => new Date(),
  };

  async create(
    prisma: PrismaClient,
    userId: string,
    overrides: Partial<typeof this.defaults & { platformId?: string }> = {}
  ) {
    const data = { ...this.defaults, ...overrides };

    return await prisma.earning.create({
      data: {
        userId,
        platformId: overrides.platformId || null,
        amount: typeof data.amount === 'function' ? data.amount() : data.amount,
        source: typeof data.source === 'function' ? data.source() : data.source,
        description: typeof data.description === 'function' ? data.description() : data.description,
        date: typeof data.date === 'function' ? data.date() : data.date,
      },
    });
  }

  async createMany(
    prisma: PrismaClient,
    userId: string,
    count: number,
    overrides: Partial<typeof this.defaults> = {}
  ) {
    const earnings = [];
    for (let i = 0; i < count; i++) {
      earnings.push(await this.create(prisma, userId, overrides));
    }
    return earnings;
  }
}

/**
 * Invoice Factory
 */
export class InvoiceFactory {
  private defaults = {
    invoiceNumber: () => `INV-${Date.now()}-${sequence()}`,
    amount: 1000,
    status: 'DRAFT' as const,
    issueDate: () => new Date(),
    dueDate: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };

  async create(
    prisma: PrismaClient,
    userId: string,
    customerId: string,
    overrides: Partial<typeof this.defaults> = {}
  ) {
    const data = { ...this.defaults, ...overrides };

    return await prisma.invoice.create({
      data: {
        userId,
        customerId,
        invoiceNumber: typeof data.invoiceNumber === 'function' ? data.invoiceNumber() : data.invoiceNumber,
        amount: typeof data.amount === 'function' ? data.amount() : data.amount,
        status: data.status,
        issueDate: typeof data.issueDate === 'function' ? data.issueDate() : data.issueDate,
        dueDate: typeof data.dueDate === 'function' ? data.dueDate() : data.dueDate,
      },
    });
  }
}

// Export factory instances
export const factories = {
  user: new UserFactory(),
  ticket: new TicketFactory(),
  quota: new QuotaFactory(),
  role: new RoleFactory(),
  permission: new PermissionFactory(),
  customer: new CustomerFactory(),
  platform: new PlatformFactory(),
  earning: new EarningFactory(),
  invoice: new InvoiceFactory(),
};
