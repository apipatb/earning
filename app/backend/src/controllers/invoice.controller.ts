import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import prisma from '../lib/prisma';
import { parseLimitParam, parseOffsetParam, parseDateParam, parseEnumParam, validateEnumParam } from '../utils/validation';
import { logger } from '../utils/logger';
import { WebhookService } from '../services/webhook.service';

const invoiceLineItemSchema = z.object({
  description: z.string().min(1).max(1000),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  totalPrice: z.number().positive(),
});

const invoiceSchema = z.object({
  customerId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1).max(100),
  subtotal: z.number().positive(),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  totalAmount: z.number().positive(),
  invoiceDate: z.string().datetime().or(z.string().date()).transform((val) => new Date(val)),
  dueDate: z.string().datetime().or(z.string().date()).transform((val) => new Date(val)),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled']).default('draft'),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z.array(invoiceLineItemSchema),
});

export const getAllInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, status: statusParam, customerId, limit, offset } = req.query;

    const where: any = { userId };

    if (startDate && endDate) {
      const start = parseDateParam(startDate as string);
      const end = parseDateParam(endDate as string);
      if (start && end) {
        where.invoiceDate = { gte: start, lte: end };
      }
    }

    // Validate status parameter if provided
    if (statusParam) {
      try {
        const allowedStatuses = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'] as const;
        const validStatus = validateEnumParam(statusParam as string, allowedStatuses, 'status');
        where.status = validStatus;
      } catch (error) {
        return res.status(400).json({
          error: 'Validation Error',
          message: error instanceof Error ? error.message : 'Invalid status parameter',
        });
      }
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const parsedLimit = parseLimitParam(limit as string | undefined, 50);
    const parsedOffset = parseOffsetParam(offset as string | undefined);

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { invoiceDate: 'desc' },
      take: parsedLimit,
      skip: parsedOffset,
    });

    const total = await prisma.invoice.count({ where });

    const formatted = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer,
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      discountAmount: Number(inv.discountAmount),
      totalAmount: Number(inv.totalAmount),
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      paidDate: inv.paidDate,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      lineItems: inv.lineItems.map((li) => ({
        id: li.id,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        totalPrice: Number(li.totalPrice),
      })),
      createdAt: inv.createdAt,
    }));

    res.json({ invoices: formatted, total, limit: parsedLimit, offset: parsedOffset });
  } catch (error) {
    logger.error('Get invoices error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch invoices',
    });
  }
};

export const createInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = invoiceSchema.parse(req.body);

    // Verify customer ownership if provided
    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, userId },
      });
      if (!customer) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Customer not found',
        });
      }
    }

    const { lineItems, ...invoiceData } = data;

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        ...invoiceData,
        lineItems: {
          create: lineItems,
        },
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    // Trigger webhook event
    WebhookService.triggerEvent(userId, 'INVOICE_CREATED', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      totalAmount: Number(invoice.totalAmount),
      status: invoice.status,
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
    });

    res.status(201).json({
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        discountAmount: Number(invoice.discountAmount),
        totalAmount: Number(invoice.totalAmount),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    logger.error('Create invoice error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create invoice',
    });
  }
};

export const updateInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const invoiceId = req.params.id;
    const data = invoiceSchema.partial().parse(req.body);

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    const { lineItems, ...invoiceData } = data;

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...invoiceData,
        ...(lineItems && {
          lineItems: {
            deleteMany: {},
            create: lineItems,
          },
        }),
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    // Trigger appropriate webhook events based on status change
    if (data.status && data.status !== invoice.status) {
      if (data.status.toUpperCase() === 'SENT') {
        WebhookService.triggerEvent(userId, 'INVOICE_SENT', {
          id: updated.id,
          invoiceNumber: updated.invoiceNumber,
          customer: updated.customer,
          totalAmount: Number(updated.totalAmount),
          status: updated.status,
          invoiceDate: updated.invoiceDate.toISOString(),
          dueDate: updated.dueDate.toISOString(),
        });
      } else if (data.status.toUpperCase() === 'OVERDUE') {
        WebhookService.triggerEvent(userId, 'INVOICE_OVERDUE', {
          id: updated.id,
          invoiceNumber: updated.invoiceNumber,
          customer: updated.customer,
          totalAmount: Number(updated.totalAmount),
          dueDate: updated.dueDate.toISOString(),
        });
      }
    }

    res.json({
      invoice: {
        ...updated,
        subtotal: Number(updated.subtotal),
        taxAmount: Number(updated.taxAmount),
        discountAmount: Number(updated.discountAmount),
        totalAmount: Number(updated.totalAmount),
      },
    });
  } catch (error) {
    logger.error('Update invoice error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update invoice',
    });
  }
};

export const markInvoicePaid = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const invoiceId = req.params.id;
    const { paymentMethod } = req.body;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidDate: new Date(),
        paymentMethod: paymentMethod || invoice.paymentMethod,
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    // Trigger webhook event
    WebhookService.triggerEvent(userId, 'INVOICE_PAID', {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      customer: updated.customer,
      totalAmount: Number(updated.totalAmount),
      paidDate: updated.paidDate?.toISOString(),
      paymentMethod: updated.paymentMethod,
    });

    res.json({ invoice: updated });
  } catch (error) {
    logger.error('Mark invoice paid error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to mark invoice as paid',
    });
  }
};

export const deleteInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const invoiceId = req.params.id;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invoice not found',
      });
    }

    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    logger.error('Delete invoice error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete invoice',
    });
  }
};

export const getInvoiceSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Use database-level aggregation instead of loading all invoices
    const [totalStats, paidStats, pendingStats, overdueStats] = await Promise.all([
      prisma.invoice.aggregate({
        where: { userId },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'paid' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: { in: ['draft', 'sent', 'viewed'] } },
        _count: true,
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { userId, status: 'overdue' },
        _count: true,
      }),
    ]);

    const summary = {
      total_invoices: totalStats._count,
      paid: paidStats._count,
      pending: pendingStats._count,
      overdue: overdueStats._count,
      total_amount: Number(totalStats._sum.totalAmount || 0),
      paid_amount: Number(paidStats._sum.totalAmount || 0),
      pending_amount: Number(pendingStats._sum.totalAmount || 0),
    };

    res.json({ summary });
  } catch (error) {
    logger.error('Get invoice summary error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch invoice summary',
    });
  }
};

export const getOverdueInvoices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = new Date();

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        userId,
        dueDate: { lt: today },
        status: { not: 'paid' },
      },
      include: {
        customer: true,
        lineItems: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const formatted = overdueInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.customer,
      totalAmount: Number(inv.totalAmount),
      dueDate: inv.dueDate,
      daysOverdue: Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      status: inv.status,
    }));

    res.json({
      overdueInvoices: formatted,
      total: formatted.length,
      totalAmount: formatted.reduce((sum, i) => sum + i.totalAmount, 0),
    });
  } catch (error) {
    logger.error('Get overdue invoices error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch overdue invoices',
    });
  }
};
