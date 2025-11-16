import { Prisma } from '@prisma/client';

/**
 * Type-safe Prisma where clause builders
 * Replaces unsafe 'any' type assertions in controllers
 */

export type UserWhereInput = Prisma.UserWhereInput;
export type PlatformWhereInput = Prisma.PlatformWhereInput;
export type EarningWhereInput = Prisma.EarningWhereInput;
export type GoalWhereInput = Prisma.GoalWhereInput;
export type ProductWhereInput = Prisma.ProductWhereInput;
export type SaleWhereInput = Prisma.SaleWhereInput;
export type CustomerWhereInput = Prisma.CustomerWhereInput;
export type ExpenseWhereInput = Prisma.ExpenseWhereInput;
export type InvoiceWhereInput = Prisma.InvoiceWhereInput;
export type InventoryLogWhereInput = Prisma.InventoryLogWhereInput;

/**
 * Utility type for building where clauses with userId
 */
export interface UserOwnedWhereBase {
  userId: string;
}

/**
 * Standard query result types for each model
 */
export type PlatformWithStats = Prisma.PlatformGetPayload<{
  include: { earnings: true };
}>;

export type ProductWithStats = Prisma.ProductGetPayload<{
  include: { sales: true };
}>;

export type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: {
    customer: true;
    lineItems: true;
  };
}>;

export type InvoiceWithoutDetails = Prisma.InvoiceGetPayload<{
  include: {
    customer: { select: { id: true; name: true; email: true } };
  };
}>;

export type GoalWithProgress = Prisma.GoalGetPayload<{
  include: { earnings: true };
}>;

export type CustomerWithStats = Prisma.CustomerGetPayload<{
  include: {
    invoices: true;
    sales: { include: { product: true } };
  };
}>;

/**
 * Filter option enums for validation
 */
export const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'] as const;
export const SALE_STATUSES = ['completed', 'pending', 'cancelled'] as const;
export const INVENTORY_LOG_TYPES = ['purchase', 'sale', 'adjustment', 'damage', 'return'] as const;
export const GOAL_STATUSES = ['active', 'completed', 'cancelled'] as const;
export const PLATFORM_CATEGORIES = ['freelance', 'delivery', 'services', 'other'] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type SaleStatus = (typeof SALE_STATUSES)[number];
export type InventoryLogType = (typeof INVENTORY_LOG_TYPES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type PlatformCategory = (typeof PLATFORM_CATEGORIES)[number];
