/**
 * Query Optimization Utility
 *
 * This file provides reusable patterns and helpers for optimized Prisma queries.
 * Follows the database optimization strategy defined in DATABASE_OPTIMIZATION.md
 *
 * Usage:
 * - Import specific query builders
 * - Pass them to Prisma query methods
 * - Reduces N+1 queries and improves performance
 */

import prisma from '../lib/prisma';

/**
 * Earnings Query Helpers
 */
export const earningsIncludes = {
  // For list views (most common)
  withPlatform: {
    platform: {
      select: {
        id: true,
        name: true,
        color: true,
        category: true,
      },
    },
  },

  // For detailed views
  full: {
    platform: true,
  },

  // Minimal fields only
  minimal: {
    platform: {
      select: {
        id: true,
        name: true,
      },
    },
  },
};

export const earningsSelect = {
  // For API response
  api: {
    id: true,
    date: true,
    amount: true,
    hours: true,
    notes: true,
    platformId: true,
    createdAt: true,
    updatedAt: true,
  },

  // Lightweight for analytics
  analytics: {
    date: true,
    amount: true,
    hours: true,
    platformId: true,
  },
};

/**
 * Example: Optimized earnings list query
 * Uses index: [userId, date DESC]
 */
export async function getEarningsList(
  userId: string,
  startDate?: Date,
  endDate?: Date,
  platformId?: string,
  limit: number = 50,
  offset: number = 0
) {
  const where: any = { userId };

  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate };
  }

  if (platformId) {
    where.platformId = platformId;
  }

  const [earnings, total] = await Promise.all([
    prisma.earning.findMany({
      where,
      include: earningsIncludes.withPlatform,
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.earning.count({ where }),
  ]);

  return { earnings, total, hasMore: total > offset + limit };
}

/**
 * Customer Query Helpers
 */
export const customerIncludes = {
  // For customer details page
  withInvoices: {
    invoices: {
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        invoiceDate: true,
      },
      orderBy: { invoiceDate: 'desc' as const },
    },
  },

  // Minimal related data
  minimal: {
    invoices: false,
  },
};

export const customerSelect = {
  // For API response
  api: {
    id: true,
    name: true,
    email: true,
    phone: true,
    company: true,
    address: true,
    city: true,
    country: true,
    totalPurchases: true,
    totalQuantity: true,
    purchaseCount: true,
    lastPurchase: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  },

  // For LTV analysis
  ltv: {
    id: true,
    name: true,
    email: true,
    totalPurchases: true,
    purchaseCount: true,
    lastPurchase: true,
  },
};

/**
 * Example: Get top customers by LTV
 * Uses index: [userId, totalPurchases DESC]
 */
export async function getTopCustomersByLTV(
  userId: string,
  limit: number = 10
) {
  return prisma.customer.findMany({
    where: { userId, isActive: true },
    select: customerSelect.ltv,
    orderBy: { totalPurchases: 'desc' },
    take: limit,
  });
}

/**
 * Example: Get recently active customers
 * Uses index: [userId, lastPurchase DESC]
 */
export async function getRecentCustomers(
  userId: string,
  limit: number = 10
) {
  return prisma.customer.findMany({
    where: { userId, isActive: true },
    select: customerSelect.ltv,
    orderBy: { lastPurchase: 'desc' },
    take: limit,
  });
}

/**
 * Invoice Query Helpers
 */
export const invoiceIncludes = {
  // For invoice list
  basic: {
    customer: {
      select: { id: true, name: true, email: true },
    },
  },

  // For invoice details
  full: {
    customer: true,
    lineItems: true,
  },

  // Minimal data
  minimal: {
    customer: {
      select: { id: true, name: true },
    },
  },
};

export const invoiceSelect = {
  // For API response
  api: {
    id: true,
    invoiceNumber: true,
    customerId: true,
    subtotal: true,
    taxAmount: true,
    discountAmount: true,
    totalAmount: true,
    invoiceDate: true,
    dueDate: true,
    paidDate: true,
    status: true,
    paymentMethod: true,
    createdAt: true,
    updatedAt: true,
  },

  // For analytics
  analytics: {
    id: true,
    invoiceNumber: true,
    totalAmount: true,
    status: true,
    invoiceDate: true,
    dueDate: true,
    paidDate: true,
  },
};

/**
 * Example: Get overdue invoices
 * Uses index: [userId, dueDate ASC, status]
 *
 * Optimized for the getOverdueInvoices query pattern
 */
export async function getOverdueInvoices(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.invoice.findMany({
    where: {
      userId,
      dueDate: { lt: today },
      status: { not: 'paid' },
    },
    include: invoiceIncludes.full,
    orderBy: { dueDate: 'asc' },
  });
}

/**
 * Example: Get invoice summary
 * Aggregates counts and amounts by status
 *
 * Note: For large datasets, consider using raw SQL or materialized views
 */
export async function getInvoiceSummary(userId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    select: invoiceSelect.analytics,
  });

  const summary = {
    total_invoices: invoices.length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    pending: invoices.filter((i) =>
      ['draft', 'sent', 'viewed'].includes(i.status)
    ).length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    total_amount: invoices.reduce(
      (sum, i) => sum + Number(i.totalAmount),
      0
    ),
    paid_amount: invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.totalAmount), 0),
    pending_amount: invoices
      .filter((i) => ['draft', 'sent', 'viewed', 'overdue'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.totalAmount), 0),
  };

  return summary;
}

/**
 * Sale Query Helpers
 */
export const saleIncludes = {
  // For sale list
  withProduct: {
    product: {
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
      },
    },
  },

  // Complete data
  full: {
    product: true,
  },
};

export const saleSelect = {
  // For API response
  api: {
    id: true,
    productId: true,
    quantity: true,
    unitPrice: true,
    totalAmount: true,
    saleDate: true,
    customer: true,
    notes: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  },

  // For analytics
  analytics: {
    quantity: true,
    totalAmount: true,
    saleDate: true,
    productId: true,
    status: true,
  },
};

/**
 * Expense Query Helpers
 */
export const expenseSelect = {
  // For API response
  api: {
    id: true,
    category: true,
    description: true,
    amount: true,
    expenseDate: true,
    vendor: true,
    isTaxDeductible: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
  },

  // For tax reporting
  taxReport: {
    category: true,
    amount: true,
    expenseDate: true,
    vendor: true,
    isTaxDeductible: true,
  },
};

/**
 * Example: Get expenses by category
 * Uses index: [userId, category]
 */
export async function getExpensesByCategory(
  userId: string,
  category?: string
) {
  const where: any = { userId };
  if (category) {
    where.category = category;
  }

  return prisma.expense.findMany({
    where,
    select: expenseSelect.api,
    orderBy: { expenseDate: 'desc' },
  });
}

/**
 * Example: Get tax deductible expenses
 */
export async function getTaxDeductibleExpenses(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.expense.findMany({
    where: {
      userId,
      isTaxDeductible: true,
      expenseDate: { gte: startDate, lte: endDate },
    },
    select: expenseSelect.taxReport,
    orderBy: { expenseDate: 'desc' },
  });
}

/**
 * Common Query Patterns with Performance Notes
 */

/**
 * Pattern: User Dashboard Analytics
 *
 * Instead of:
 * - 1 query for user
 * - 1 query for platforms
 * - 1 query for earnings
 * - 1 query for invoices
 *
 * Use Promise.all() to fetch in parallel
 */
export async function getDashboardData(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Parallel queries - 4 queries executed at once, not sequentially
  const [earnings, platforms, overdue, recentCustomers] = await Promise.all([
    // Uses index [userId, date DESC]
    prisma.earning.findMany({
      where: {
        userId,
        date: { gte: thirtyDaysAgo, lte: today },
      },
      include: earningsIncludes.withPlatform,
      orderBy: { date: 'desc' },
      take: 30,
    }),

    // Uses index [userId, isActive]
    prisma.platform.findMany({
      where: { userId, isActive: true },
    }),

    // Uses index [userId, dueDate ASC, status]
    prisma.invoice.findMany({
      where: {
        userId,
        dueDate: { lt: today },
        status: { not: 'paid' },
      },
      take: 10,
    }),

    // Uses index [userId, lastPurchase DESC]
    prisma.customer.findMany({
      where: { userId, isActive: true },
      orderBy: { lastPurchase: 'desc' },
      take: 5,
    }),
  ]);

  return {
    earnings,
    platforms,
    overdueInvoices: overdue,
    recentCustomers,
  };
}

/**
 * Pagination Helper
 *
 * Prevents N+1 and ensures proper index usage
 */
export async function paginate<T>(
  model: any,
  where: any,
  orderBy: any,
  page: number = 1,
  pageSize: number = 50,
  include?: any,
  select?: any
) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      take: pageSize,
      skip,
      ...(include && { include }),
      ...(select && { select }),
    }),
    model.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasMore: total > skip + pageSize,
  };
}

/**
 * Search Helper
 *
 * Combines multiple text fields into single search
 * Note: For production with millions of records, use PostgreSQL full-text search
 */
export async function searchCustomers(
  userId: string,
  query: string,
  limit: number = 20
) {
  const searchTerm = query.toLowerCase();

  return prisma.customer.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    select: customerSelect.api,
    take: limit,
  });
}

/**
 * Batch Operations
 *
 * Instead of updating items one by one, batch them
 */
export async function updateCustomerMetrics(
  customerId: string,
  metrics: {
    totalPurchases?: number;
    totalQuantity?: number;
    purchaseCount?: number;
    lastPurchase?: Date;
  }
) {
  // Single update query instead of multiple
  return prisma.customer.update({
    where: { id: customerId },
    data: metrics,
  });
}

/**
 * Transactional Operations
 *
 * For operations that must succeed together
 */
export async function createSaleWithCustomerUpdate(
  userId: string,
  customerId: string,
  saleData: any
) {
  return prisma.$transaction(async (tx) => {
    // Create sale
    const sale = await tx.sale.create({
      data: {
        userId,
        ...saleData,
      },
    });

    // Update customer metrics in same transaction
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPurchases: {
          increment: saleData.totalAmount,
        },
        totalQuantity: {
          increment: saleData.quantity,
        },
        purchaseCount: {
          increment: 1,
        },
        lastPurchase: new Date(),
      },
    });

    return sale;
  });
}

export default {
  earningsIncludes,
  earningsSelect,
  customerIncludes,
  customerSelect,
  invoiceIncludes,
  invoiceSelect,
  saleIncludes,
  saleSelect,
  expenseSelect,
  getEarningsList,
  getTopCustomersByLTV,
  getRecentCustomers,
  getOverdueInvoices,
  getInvoiceSummary,
  getExpensesByCategory,
  getTaxDeductibleExpenses,
  getDashboardData,
  paginate,
  searchCustomers,
  updateCustomerMetrics,
  createSaleWithCustomerUpdate,
};
