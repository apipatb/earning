import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { logInfo, logDebug, logError, logWarn } from '../lib/logger';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  CustomerFilterSchema,
} from '../schemas/validation.schemas';
import { validateRequest, validatePartialRequest, ValidationException } from '../utils/validate-request.util';

export const getAllCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const requestId = (req as any).requestId || 'unknown';

    // Validate query parameters
    const filters = await validateRequest(req.query, CustomerFilterSchema);

    logDebug('Fetching customers', {
      requestId,
      userId,
      filters,
    });

    const where: any = { userId };
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    switch (filters.sortBy) {
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

    const customers = await prisma.customer.findMany({
      where,
      orderBy,
      take: filters.limit,
      skip: filters.offset,
    });

    const total = await prisma.customer.count({ where });

    const customersWithLTV = customers.map((customer: any) => ({
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

    logInfo('Customers fetched successfully', {
      requestId,
      userId,
      count: customers.length,
      total,
    });

    res.json({ customers: customersWithLTV, total, limit: filters.limit, offset: filters.offset });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error fetching customers', {
        requestId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Invalid filter parameters',
        errors: error.errors,
      });
    }
    const requestId = (req as any).requestId || 'unknown';
    logError('Failed to fetch customers', error, { requestId });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch customers',
    });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const requestId = (req as any).requestId || 'unknown';

    // Validate request body
    const data = await validateRequest(req.body, CreateCustomerSchema);

    logDebug('Creating customer', {
      requestId,
      userId,
      customerName: data.name,
      email: data.email,
    });

    const customer = await prisma.customer.create({
      data: {
        userId,
        ...data,
      },
    });

    logInfo('Customer created successfully', {
      requestId,
      userId,
      customerId: customer.id,
      customerName: customer.name,
    });

    res.status(201).json({ customer });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error creating customer', {
        requestId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Customer validation failed',
        errors: error.errors,
      });
    }
    const requestId = (req as any).requestId || 'unknown';
    logError('Failed to create customer', error, { requestId });
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
    const requestId = (req as any).requestId || 'unknown';

    // Validate request body (partial update)
    const data = await validatePartialRequest(req.body, UpdateCustomerSchema);

    logDebug('Updating customer', {
      requestId,
      userId,
      customerId,
      updates: Object.keys(data),
    });

    // Check ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId },
    });

    if (!customer) {
      logWarn('Customer not found for update', {
        requestId,
        userId,
        customerId,
      });
      return res.status(404).json({
        error: 'Not Found',
        message: 'Customer not found',
      });
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data,
    });

    logInfo('Customer updated successfully', {
      requestId,
      userId,
      customerId,
      updatedFields: Object.keys(data),
    });

    res.json({ customer: updated });
  } catch (error) {
    if (error instanceof ValidationException) {
      const requestId = (req as any).requestId || 'unknown';
      logWarn('Validation error updating customer', {
        requestId,
        errors: error.errors,
      });
      return res.status(error.statusCode).json({
        error: 'Validation Error',
        message: 'Customer validation failed',
        errors: error.errors,
      });
    }
    const requestId = (req as any).requestId || 'unknown';
    logError('Failed to update customer', error, { requestId });
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
    console.error('Delete customer error:', error);
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
    console.error('Get customer details error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch customer details',
    });
  }
};

export const getTopCustomers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '10' } = req.query;

    const topCustomers = await prisma.customer.findMany({
      where: { userId },
      orderBy: { totalPurchases: 'desc' },
      take: parseInt(limit as string),
      select: {
        id: true,
        name: true,
        email: true,
        totalPurchases: true,
        purchaseCount: true,
        lastPurchase: true,
      },
    });

    const formatted = topCustomers.map((c: any) => ({
      ...c,
      totalPurchases: Number(c.totalPurchases),
      averageOrderValue: c.purchaseCount > 0 ? Number(c.totalPurchases) / c.purchaseCount : 0,
    }));

    res.json({ topCustomers: formatted });
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch top customers',
    });
  }
};
