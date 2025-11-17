/**
 * Type-Safe Prisma Query Builders
 * Provides reusable query builder functions for common database operations
 */

import { Prisma } from '@prisma/client';

/**
 * Common filter options that can be applied to queries
 */
export interface FilterOptions {
  /** Search term for text fields */
  search?: string;
  /** Start date for date range filtering */
  startDate?: Date;
  /** End date for date range filtering */
  endDate?: Date;
  /** Status filter (generic, specific values depend on model) */
  status?: string;
  /** Active/inactive filter */
  isActive?: boolean;
  /** Category filter */
  category?: string;
  /** Additional custom filters */
  [key: string]: any;
}

/**
 * Build type-safe WHERE clause for Customer queries
 * Automatically includes userId and supports common filters
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.CustomerWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildCustomerWhere(userId, {
 *   search: 'John',
 *   isActive: true
 * });
 * const customers = await prisma.customer.findMany({ where });
 */
export function buildCustomerWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Text search across name, email, phone, company
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Active status filter
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // Date range filter (lastPurchase)
  if (filters.startDate || filters.endDate) {
    where.lastPurchase = {};
    if (filters.startDate) {
      where.lastPurchase.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.lastPurchase.lte = filters.endDate;
    }
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Earning queries
 * Automatically includes userId and supports date range, platform, and status filters
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.EarningWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildEarningWhere(userId, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 *   platformId: 'platform-uuid'
 * });
 * const earnings = await prisma.earning.findMany({ where });
 */
export function buildEarningWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.EarningWhereInput {
  const where: Prisma.EarningWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.date.lte = filters.endDate;
    }
  }

  // Platform filter
  if (filters.platformId) {
    where.platformId = filters.platformId;
  }

  // Search in notes
  if (filters.search) {
    where.notes = { contains: filters.search, mode: 'insensitive' };
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Expense queries
 * Automatically includes userId and supports date range, category, and vendor filters
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.ExpenseWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildExpenseWhere(userId, {
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 *   category: 'Software',
 *   isTaxDeductible: true
 * });
 * const expenses = await prisma.expense.findMany({ where });
 */
export function buildExpenseWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    where.expenseDate = {};
    if (filters.startDate) {
      where.expenseDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.expenseDate.lte = filters.endDate;
    }
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category;
  }

  // Vendor filter
  if (filters.vendor) {
    where.vendor = { contains: filters.vendor, mode: 'insensitive' };
  }

  // Tax deductible filter
  if (filters.isTaxDeductible !== undefined) {
    where.isTaxDeductible = filters.isTaxDeductible;
  }

  // Search in description or vendor
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { vendor: { contains: filters.search, mode: 'insensitive' } },
      { category: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Invoice queries
 * Automatically includes userId and supports date range, status, and customer filters
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.InvoiceWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildInvoiceWhere(userId, {
 *   status: 'PAID',
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31')
 * });
 * const invoices = await prisma.invoice.findMany({ where });
 */
export function buildInvoiceWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Status filter
  if (filters.status) {
    where.status = filters.status as any;
  }

  // Customer filter
  if (filters.customerId) {
    where.customerId = filters.customerId;
  }

  // Date range filter (invoice date)
  if (filters.startDate || filters.endDate) {
    where.invoiceDate = {};
    if (filters.startDate) {
      where.invoiceDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.invoiceDate.lte = filters.endDate;
    }
  }

  // Due date range filter
  if (filters.dueStartDate || filters.dueEndDate) {
    where.dueDate = {};
    if (filters.dueStartDate) {
      where.dueDate.gte = filters.dueStartDate;
    }
    if (filters.dueEndDate) {
      where.dueDate.lte = filters.dueEndDate;
    }
  }

  // Search in invoice number or notes
  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Sale queries
 * Automatically includes userId and supports date range, status, and product filters
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.SaleWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildSaleWhere(userId, {
 *   status: 'COMPLETED',
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 *   productId: 'product-uuid'
 * });
 * const sales = await prisma.sale.findMany({ where });
 */
export function buildSaleWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Status filter
  if (filters.status) {
    where.status = filters.status as any;
  }

  // Product filter
  if (filters.productId) {
    where.productId = filters.productId;
  }

  // Date range filter (sale date)
  if (filters.startDate || filters.endDate) {
    where.saleDate = {};
    if (filters.startDate) {
      where.saleDate.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.saleDate.lte = filters.endDate;
    }
  }

  // Customer search
  if (filters.customer) {
    where.customer = { contains: filters.customer, mode: 'insensitive' };
  }

  // Search in customer or notes
  if (filters.search) {
    where.OR = [
      { customer: { contains: filters.search, mode: 'insensitive' } },
      { notes: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Product queries
 * Automatically includes userId and supports filters for name, category, and active status
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.ProductWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildProductWhere(userId, {
 *   search: 'laptop',
 *   category: 'Electronics',
 *   isActive: true
 * });
 * const products = await prisma.product.findMany({ where });
 */
export function buildProductWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Active status filter
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category;
  }

  // Search in name, description, or SKU
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Goal queries
 * Automatically includes userId and supports status filtering
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.GoalWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildGoalWhere(userId, {
 *   status: 'ACTIVE'
 * });
 * const goals = await prisma.goal.findMany({ where });
 */
export function buildGoalWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.GoalWhereInput {
  const where: Prisma.GoalWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Status filter
  if (filters.status) {
    where.status = filters.status as any;
  }

  // Search in title or description
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

/**
 * Build type-safe WHERE clause for Platform queries
 * Automatically includes userId and supports active status filtering
 *
 * @param userId - User ID to filter by (required)
 * @param filters - Additional filter options
 * @returns Prisma.PlatformWhereInput for use in findMany, count, etc.
 *
 * @example
 * const where = buildPlatformWhere(userId, {
 *   isActive: true,
 *   category: 'FREELANCE'
 * });
 * const platforms = await prisma.platform.findMany({ where });
 */
export function buildPlatformWhere(
  userId: string,
  filters?: FilterOptions
): Prisma.PlatformWhereInput {
  const where: Prisma.PlatformWhereInput = {
    userId,
  };

  if (!filters) return where;

  // Active status filter
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  // Category filter
  if (filters.category) {
    where.category = filters.category as any;
  }

  // Search in name
  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }

  return where;
}
