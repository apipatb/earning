/**
 * Tests for Invoice Controller
 */

import {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  deleteInvoice,
  getInvoiceSummary,
  getOverdueInvoices,
} from '../invoice.controller';
import {
  createMockRequest,
  createMockResponse,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Invoice Controller', () => {
  const mockUserId = 'user-123';
  const mockCustomerId = 'customer-123';
  const mockInvoiceId = 'invoice-123';

  const mockLineItems = [
    {
      id: 'line-1',
      description: 'Web Development',
      quantity: 10,
      unitPrice: 100,
      totalPrice: 1000,
    },
  ];

  const mockInvoice = {
    id: mockInvoiceId,
    userId: mockUserId,
    customerId: mockCustomerId,
    invoiceNumber: 'INV-001',
    subtotal: 1000,
    taxAmount: 100,
    discountAmount: 0,
    totalAmount: 1100,
    invoiceDate: new Date('2025-01-01'),
    dueDate: new Date('2025-01-31'),
    paidDate: null,
    status: 'draft',
    paymentMethod: null,
    notes: 'Test invoice',
    terms: 'Net 30',
    lineItems: mockLineItems,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: {
      id: mockCustomerId,
      name: 'Test Customer',
      email: 'customer@example.com',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllInvoices', () => {
    it('should get all invoices for user', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllInvoices(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.invoices).toHaveLength(1);
      expect(response.total).toBe(1);
      expect(response.invoices[0].invoiceNumber).toBe('INV-001');
    });

    it('should filter invoices by status', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([paidInvoice]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { status: 'paid' },
      });
      const res = createMockResponse();

      await getAllInvoices(req, res);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'paid' }),
        })
      );
    });

    it('should filter invoices by date range', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        },
      });
      const res = createMockResponse();

      await getAllInvoices(req, res);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter invoices by customer', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { customerId: mockCustomerId },
      });
      const res = createMockResponse();

      await getAllInvoices(req, res);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: mockCustomerId }),
        })
      );
    });

    it('should apply pagination parameters', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(100);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { limit: '20', offset: '40' },
      });
      const res = createMockResponse();

      await getAllInvoices(req, res);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        })
      );
    });

    it('should only return invoices belonging to user', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([mockInvoice]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllInvoices(req, res);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      );
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with valid data', async () => {
      const mockCustomer = { id: mockCustomerId, userId: mockUserId };
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.invoice.create as jest.Mock).mockResolvedValue(mockInvoice);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          customerId: mockCustomerId,
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          taxAmount: 100,
          totalAmount: 1100,
          invoiceDate: '2025-01-01',
          dueDate: '2025-01-31',
          status: 'draft',
          lineItems: mockLineItems,
        },
      });
      const res = createMockResponse();

      await createInvoice(req, res);

      verifySuccessResponse(res, 201);
      expect(prisma.invoice.create).toHaveBeenCalled();
      const response = getResponseData(res);
      expect(response.invoice.invoiceNumber).toBe('INV-001');
    });

    it('should create invoice without customer', async () => {
      const invoiceWithoutCustomer = { ...mockInvoice, customerId: null };
      (prisma.invoice.create as jest.Mock).mockResolvedValue(invoiceWithoutCustomer);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          invoiceNumber: 'INV-002',
          subtotal: 500,
          taxAmount: 50,
          totalAmount: 550,
          invoiceDate: '2025-01-01',
          dueDate: '2025-01-31',
          lineItems: mockLineItems,
        },
      });
      const res = createMockResponse();

      await createInvoice(req, res);

      verifySuccessResponse(res, 201);
    });

    it('should reject invoice if customer not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          customerId: 'non-existent-customer',
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          totalAmount: 1000,
          invoiceDate: '2025-01-01',
          dueDate: '2025-01-31',
          lineItems: mockLineItems,
        },
      });
      const res = createMockResponse();

      await createInvoice(req, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('Not Found');
    });

    it('should reject invoice with invalid data', async () => {
      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          invoiceNumber: '',
          subtotal: -100,
          totalAmount: 0,
          lineItems: [],
        },
      });
      const res = createMockResponse();

      await createInvoice(req, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should require line items', async () => {
      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          totalAmount: 1000,
          invoiceDate: '2025-01-01',
          dueDate: '2025-01-31',
          lineItems: [],
        },
      });
      const res = createMockResponse();

      await createInvoice(req, res);

      verifyErrorResponse(res, 400);
    });
  });

  describe('updateInvoice', () => {
    it('should update invoice successfully', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      const updatedInvoice = { ...mockInvoice, status: 'sent' };
      (prisma.invoice.update as jest.Mock).mockResolvedValue(updatedInvoice);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockInvoiceId },
        body: { status: 'sent' },
      });
      const res = createMockResponse();

      await updateInvoice(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.invoice.status).toBe('sent');
    });

    it('should return 404 if invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: 'non-existent-id' },
        body: { status: 'sent' },
      });
      const res = createMockResponse();

      await updateInvoice(req, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('Not Found');
    });

    it('should verify user ownership before update', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'different-user', email: 'other@example.com' },
        params: { id: mockInvoiceId },
        body: { status: 'sent' },
      });
      const res = createMockResponse();

      await updateInvoice(req, res);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockInvoiceId,
            userId: 'different-user',
          }),
        })
      );
      verifyErrorResponse(res, 404);
    });
  });

  describe('markInvoicePaid', () => {
    it('should mark invoice as paid', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      const paidInvoice = {
        ...mockInvoice,
        status: 'paid',
        paidDate: new Date(),
        paymentMethod: 'CARD',
      };
      (prisma.invoice.update as jest.Mock).mockResolvedValue(paidInvoice);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockInvoiceId },
        body: { paymentMethod: 'CARD' },
      });
      const res = createMockResponse();

      await markInvoicePaid(req, res);

      verifySuccessResponse(res, 200);
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'paid',
            paidDate: expect.any(Date),
            paymentMethod: 'CARD',
          }),
        })
      );
    });

    it('should return 404 if invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: 'non-existent-id' },
        body: {},
      });
      const res = createMockResponse();

      await markInvoicePaid(req, res);

      verifyErrorResponse(res, 404);
    });

    it('should verify user ownership before marking paid', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'different-user', email: 'other@example.com' },
        params: { id: mockInvoiceId },
        body: {},
      });
      const res = createMockResponse();

      await markInvoicePaid(req, res);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'different-user' }),
        })
      );
    });
  });

  describe('deleteInvoice', () => {
    it('should delete invoice successfully', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.invoice.delete as jest.Mock).mockResolvedValue(mockInvoice);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockInvoiceId },
      });
      const res = createMockResponse();

      await deleteInvoice(req, res);

      verifySuccessResponse(res, 200);
      expect(prisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: mockInvoiceId },
      });
    });

    it('should return 404 if invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: 'non-existent-id' },
      });
      const res = createMockResponse();

      await deleteInvoice(req, res);

      verifyErrorResponse(res, 404);
      expect(prisma.invoice.delete).not.toHaveBeenCalled();
    });

    it('should verify user ownership before deletion', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'different-user', email: 'other@example.com' },
        params: { id: mockInvoiceId },
      });
      const res = createMockResponse();

      await deleteInvoice(req, res);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'different-user' }),
        })
      );
    });
  });

  describe('getInvoiceSummary', () => {
    it('should calculate invoice summary correctly', async () => {
      const invoices = [
        { ...mockInvoice, status: 'paid', totalAmount: 1000 },
        { ...mockInvoice, id: 'inv-2', status: 'sent', totalAmount: 500 },
        { ...mockInvoice, id: 'inv-3', status: 'overdue', totalAmount: 300 },
        { ...mockInvoice, id: 'inv-4', status: 'draft', totalAmount: 200 },
      ];
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(invoices);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getInvoiceSummary(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.summary.total_invoices).toBe(4);
      expect(response.summary.paid).toBe(1);
      expect(response.summary.pending).toBe(2);
      expect(response.summary.overdue).toBe(1);
      expect(response.summary.total_amount).toBe(2000);
      expect(response.summary.paid_amount).toBe(1000);
      expect(response.summary.pending_amount).toBe(1000);
    });

    it('should handle empty invoice list', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getInvoiceSummary(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.summary.total_invoices).toBe(0);
      expect(response.summary.total_amount).toBe(0);
    });
  });

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const overdueInvoice = {
        ...mockInvoice,
        dueDate: pastDate,
        status: 'sent',
      };
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([overdueInvoice]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getOverdueInvoices(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.overdueInvoices).toHaveLength(1);
      expect(response.overdueInvoices[0].daysOverdue).toBeGreaterThan(0);
      expect(response.total).toBe(1);
    });

    it('should exclude paid invoices from overdue', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getOverdueInvoices(req, res);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'paid' },
          }),
        })
      );
    });

    it('should calculate total overdue amount', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const overdueInvoices = [
        { ...mockInvoice, id: 'inv-1', dueDate: pastDate, totalAmount: 500 },
        { ...mockInvoice, id: 'inv-2', dueDate: pastDate, totalAmount: 300 },
      ];
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(overdueInvoices);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getOverdueInvoices(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.totalAmount).toBe(800);
    });
  });
});
