import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Invoice Creation & Management
export const createInvoice = async (req: Request, res: Response) => {
  try {
    const { clientName, clientEmail, amount, description, dueDate, items, taxRate } = req.body;
    const userId = (req as any).userId;

    const invoiceNumber = `INV-${Date.now()}`;

    const invoice = await prisma.invoice.create({
      data: {
        userId,
        invoiceNumber,
        clientName,
        clientEmail,
        totalAmount: parseFloat(amount),
        taxRate: taxRate || 0,
        taxAmount: (parseFloat(amount) * (taxRate || 0)) / 100,
        finalAmount: parseFloat(amount) * (1 + (taxRate || 0) / 100),
        description,
        items: items ? JSON.stringify(items) : null,
        status: 'draft',
        dueDate: new Date(dueDate),
        issuedAt: new Date(),
      },
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create invoice' });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, limit = 50 } = req.query;

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        ...(status && { status: status as string }),
      },
      orderBy: { issuedAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const userId = (req as any).userId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        payments: true,
        tax: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { clientName, clientEmail, description, dueDate, status } = req.body;
    const userId = (req as any).userId;

    const invoice = await prisma.invoice.updateMany({
      where: { id: invoiceId, userId },
      data: {
        clientName,
        clientEmail,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        updatedAt: new Date(),
      },
    });

    res.json({ success: invoice.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to update invoice' });
  }
};

export const publishInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const userId = (req as any).userId;

    const invoice = await prisma.invoice.updateMany({
      where: { id: invoiceId, userId, status: 'draft' },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    res.json({ success: invoice.count > 0 });
  } catch (error) {
    res.status(400).json({ error: 'Failed to publish invoice' });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const userId = (req as any).userId;

    await prisma.invoice.deleteMany({
      where: { id: invoiceId, userId, status: 'draft' },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete invoice' });
  }
};

// Invoice Tax Management
export const setInvoiceTax = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const { taxRate, taxName } = req.body;
    const userId = (req as any).userId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const tax = await prisma.invoiceTax.create({
      data: {
        invoiceId,
        taxName: taxName || 'Sales Tax',
        taxRate,
        taxAmount: (invoice.totalAmount * taxRate) / 100,
      },
    });

    res.status(201).json(tax);
  } catch (error) {
    res.status(400).json({ error: 'Failed to set tax' });
  }
};

export const getInvoiceTaxes = async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.query;
    const userId = (req as any).userId;

    const taxes = await prisma.invoiceTax.findMany({
      where: {
        invoice: { userId },
        ...(invoiceId && { invoiceId: invoiceId as string }),
      },
    });

    res.json(taxes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch taxes' });
  }
};

// Payment Tracking
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { invoiceId, paymentAmount, paymentDate, paymentMethod, notes } = req.body;
    const userId = (req as any).userId;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId,
        paymentAmount: parseFloat(paymentAmount),
        paymentDate: new Date(paymentDate),
        paymentMethod: paymentMethod || 'bank_transfer',
        notes: notes || null,
        status: 'completed',
      },
    });

    // Update invoice status if fully paid
    const totalPaid =
      (await prisma.invoicePayment.aggregate({
        where: { invoiceId },
        _sum: { paymentAmount: true },
      })) || 0;

    if (totalPaid._sum?.paymentAmount >= invoice.finalAmount) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'paid' },
      });
    } else {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'partially_paid' },
      });
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: 'Failed to record payment' });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { invoiceId, limit = 50 } = req.query;

    const payments = await prisma.invoicePayment.findMany({
      where: {
        invoice: { userId },
        ...(invoiceId && { invoiceId: invoiceId as string }),
      },
      orderBy: { paymentDate: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// Invoice Analytics
export const getInvoiceAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        issuedAt: { gte: startDate },
      },
      include: {
        payments: true,
      },
    });

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.finalAmount, 0);
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + (inv.payments.reduce((s, p) => s + p.paymentAmount, 0) || 0),
      0
    );

    const statusBreakdown = {
      draft: invoices.filter((i) => i.status === 'draft').length,
      sent: invoices.filter((i) => i.status === 'sent').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      partially_paid: invoices.filter((i) => i.status === 'partially_paid').length,
      overdue: invoices.filter((i) => i.status === 'overdue').length,
    };

    const analytics = {
      period: days,
      totalInvoices: invoices.length,
      totalInvoiced,
      totalPaid,
      outstanding: totalInvoiced - totalPaid,
      collectionRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
      statusBreakdown,
      timestamp: new Date(),
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice analytics' });
  }
};

// Invoice Templates
export const createInvoiceTemplate = async (req: Request, res: Response) => {
  try {
    const { templateName, companyName, companyEmail, companyPhone, companyAddress, defaultTaxRate } =
      req.body;
    const userId = (req as any).userId;

    // Delete existing template if any
    await prisma.invoiceTemplate.deleteMany({ where: { userId } });

    const template = await prisma.invoiceTemplate.create({
      data: {
        userId,
        templateName,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        defaultTaxRate: defaultTaxRate || 0,
      },
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create template' });
  }
};

export const getInvoiceTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const template = await prisma.invoiceTemplate.findFirst({
      where: { userId },
    });

    res.json(template || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

// Invoice Reports
export const generateInvoiceReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status } = req.body;
    const userId = (req as any).userId;

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        ...(status && { status }),
        issuedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        payments: true,
      },
    });

    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        totalInvoices: invoices.length,
        totalAmount: invoices.reduce((sum, inv) => sum + inv.finalAmount, 0),
        totalPaid: invoices.reduce(
          (sum, inv) => sum + (inv.payments.reduce((s, p) => s + p.paymentAmount, 0) || 0),
          0
        ),
      },
      invoices,
      generatedAt: new Date(),
    };

    res.json(report);
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate report' });
  }
};

// Invoice Statistics
export const getInvoiceStatistics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days = 90 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        issuedAt: { gte: startDate },
      },
      include: {
        payments: true,
      },
    });

    const stats = {
      period: days,
      totalInvoices: invoices.length,
      avgInvoiceAmount:
        invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.finalAmount, 0) / invoices.length : 0,
      collectionRate:
        invoices.length > 0
          ? (invoices.filter((i) => i.status === 'paid').length / invoices.length) * 100
          : 0,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.finalAmount, 0),
      timestamp: new Date(),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice statistics' });
  }
};

// Recurring Invoices
export const createRecurringInvoice = async (req: Request, res: Response) => {
  try {
    const {
      clientName,
      clientEmail,
      amount,
      frequency,
      description,
      startDate,
      endDate,
      dayOfMonth,
    } = req.body;
    const userId = (req as any).userId;

    const recurring = await prisma.recurringInvoice.create({
      data: {
        userId,
        clientName,
        clientEmail,
        amount: parseFloat(amount),
        frequency, // monthly, quarterly, yearly
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        dayOfMonth: dayOfMonth || 1,
        isActive: true,
      },
    });

    res.status(201).json(recurring);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create recurring invoice' });
  }
};

export const getRecurringInvoices = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const recurring = await prisma.recurringInvoice.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(recurring);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recurring invoices' });
  }
};
