import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { parseLimitParam, parseOffsetParam, parseDateParam, parseEnumParam, validateSearchParam, validateEnumParam } from '../utils/validation';
import { logger } from '../utils/logger';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(255).optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const getAllCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { isActive, search: searchParam, sortBy: sortByParam = 'name', limit: limitParam, offset: offsetParam } = req.query;

    // Validate sortBy parameter
    let sortBy: string;
    try {
      const allowedSortValues = ['name', 'ltv', 'recent', 'purchases'] as const;
      sortBy = sortByParam ? validateEnumParam(sortByParam as string, allowedSortValues, 'sortBy') : 'name';
    } catch (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error instanceof Error ? error.message : 'Invalid sortBy parameter',
      });
    }

    // Validate search parameter
    let search: string | undefined;
    try {
      search = validateSearchParam(searchParam as string | undefined, 200);
    } catch (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error instanceof Error ? error.message : 'Invalid search parameter',
      });
    }

    // Parse pagination parameters with safe defaults
    const limit = parseLimitParam(limitParam as string | undefined);
    const offset = parseOffsetParam(offsetParam as string | undefined);

    const where: any = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    switch (sortBy) {
      case 'ltv':
        orderBy.totalPurchases = 'desc';
        break;
      case 'recent':
        orderBy.lastPurchase = 'desc';
        break;
      case 'purchases':
        orderBy.purchaseCount = 'desc';
        break;
      default:
        orderBy.name = 'asc';
    }

    // Get total count for pagination
    const total = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
    });

    const customersWithLTV = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      address: customer.address,
      city: customer.city,
      country: customer.country,
      totalPurchases: Number(customer.totalPurchases),
      totalQuantity: Number(customer.totalQuantity),
      purchaseCount: customer.purchaseCount,
      lastPurchase: customer.lastPurchase,
      averageOrderValue: customer.purchaseCount > 0 ? Number(customer.totalPurchases) / customer.purchaseCount : 0,
      notes: customer.notes,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
    }));

    const hasMore = offset + limit < total;

    res.json({
      data: customersWithLTV,
      total,
      limit,
      offset,
      hasMore,
    });
  } catch (error) {
    logger.error('Get customers error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch customers',
    });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = customerSchema.parse(req.body);

    const customer = await prisma.customer.create({
      data: {
        userId,
        ...data,
      },
    });

    res.status(201).json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create customer error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create customer',
    });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const customerId = req.params.id;
    const data = customerSchema.partial().parse(req.body);

    // Check ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId },
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
      });
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    res.json({ customer: updated });
  } catch (error) {
    logger.error('Update customer error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update customer',
    });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const customerId = req.params.id;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId },
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
      });
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    logger.error('Delete customer error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete customer',
    });
  }
};

export const getCustomerDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const customerId = req.params.id;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId },
      include: {
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
            invoiceDate: true,
          },
          orderBy: { invoiceDate: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
      });
    }

    res.json({
      customer: {
        ...customer,
        totalPurchases: Number(customer.totalPurchases),
        totalQuantity: Number(customer.totalQuantity),
        averageOrderValue: customer.purchaseCount > 0 ? Number(customer.totalPurchases) / customer.purchaseCount : 0,
      },
    });
  } catch (error) {
    logger.error('Get customer details error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch customer details',
    });
  }
};

export const getTopCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit } = req.query;

    const parsedLimit = parseLimitParam(limit as string | undefined, 10);

    const topCustomers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { totalPurchases: 'desc' },
      take: parsedLimit,
      select: {
        id: true,
        name: true,
        email: true,
        totalPurchases: true,
        purchaseCount: true,
        lastPurchase: true,
      },
    });

    const formatted = topCustomers.map((c) => ({
      ...c,
      totalPurchases: Number(c.totalPurchases),
      averageOrderValue: c.purchaseCount > 0 ? Number(c.totalPurchases) / c.purchaseCount : 0,
    }));

    res.json({ topCustomers: formatted });
  } catch (error) {
    logger.error('Get top customers error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch top customers',
    });
  }
};
