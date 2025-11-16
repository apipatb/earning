import { Response } from 'express';
import {
  getAllInvoices,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  deleteInvoice,
  getInvoiceSummary,
} from '../controllers/invoice.controller';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

jest.mock('../lib/prisma', () => ({
  invoice: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
  customer: {
    findFirst: jest.fn(),
  },
}));

describe('Invoice Controller', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let responseData: any;

  beforeEach(() => {
    jest.clearAllMocks();

    responseData = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        responseData = data;
        return mockResponse;
      }),
    } as any;

    mockRequest = {
      user: { id: 'user-123', email: 'test@example.com' },
      query: {},
      body: {},
      params: {},
    };
  });

  describe('getAllInvoices', () => {
    it('should fetch all invoices for a user', async () => {
      const mockInvoices = [
        {
          id: 'invoice-1',
          userId: 'user-123',
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          taxAmount: 100,
          discountAmount: 0,
          totalAmount: 1100,
          invoiceDate: new Date('2024-01-01'),
          dueDate: new Date('2024-02-01'),
          paidDate: null,
          status: 'sent',
          paymentMethod: null,
          customer: { id: 'cust-1', name: 'John Doe', email: 'john@example.com' },
          lineItems: [],
          createdAt: new Date(),
        },
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(1);

      await getAllInvoices(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.invoices).toBeDefined();
      expect(responseData.total).toBe(1);
    });

    it('should filter invoices by status', async () => {
      mockRequest.query = { status: 'paid' };

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);

      await getAllInvoices(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.invoice.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.status).toBe('paid');
    });

    it('should filter invoices by date range', async () => {
      mockRequest.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);

      await getAllInvoices(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.invoice.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.invoiceDate).toBeDefined();
    });

    it('should filter invoices by customer', async () => {
      mockRequest.query = { customerId: 'cust-1' };

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);

      await getAllInvoices(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.invoice.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.customerId).toBe('cust-1');
    });

    it('should handle pagination', async () => {
      mockRequest.query = { limit: '20', offset: '0' };

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(100);

      await getAllInvoices(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.limit).toBe(20);
      expect(responseData.offset).toBe(0);
    });

    it('should handle database errors', async () => {
      (prisma.invoice.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getAllInvoices(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseData.error).toBe('Internal Server Error');
    });
  });

  describe('createInvoice', () => {
    it('should create a new invoice successfully', async () => {
      mockRequest.body = {
        customerId: '550e8400-e29b-41d4-a716-446655440000',
        invoiceNumber: 'INV-001',
        subtotal: 1000,
        taxAmount: 100,
        discountAmount: 0,
        totalAmount: 1100,
        invoiceDate: '2024-01-01T00:00:00Z',
        dueDate: '2024-02-01T00:00:00Z',
        status: 'draft',
        lineItems: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
      });

      (prisma.invoice.create as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        userId: 'user-123',
        ...mockRequest.body,
        invoiceDate: new Date('2024-01-01'),
        dueDate: new Date('2024-02-01'),
        customer: { id: 'cust-1', name: 'John Doe', email: 'john@example.com' },
        lineItems: mockRequest.body.lineItems,
      });

      await createInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseData.invoice).toBeDefined();
    });

    it('should create invoice without customer', async () => {
      mockRequest.body = {
        invoiceNumber: 'INV-002',
        subtotal: 500,
        totalAmount: 500,
        invoiceDate: '2024-01-01T00:00:00Z',
        dueDate: '2024-02-01T00:00:00Z',
        lineItems: [],
      };

      (prisma.invoice.create as jest.Mock).mockResolvedValue({
        id: 'invoice-2',
        userId: 'user-123',
        ...mockRequest.body,
      });

      await createInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should reject creation if customer not found', async () => {
      mockRequest.body = {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        invoiceNumber: 'INV-003',
        subtotal: 1000,
        totalAmount: 1000,
        invoiceDate: '2024-01-01T00:00:00Z',
        dueDate: '2024-02-01T00:00:00Z',
        lineItems: [],
      };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await createInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should validate required fields', async () => {
      mockRequest.body = {
        // missing required fields
      };

      await createInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('Validation Error');
    });

    it('should handle database errors', async () => {
      mockRequest.body = {
        invoiceNumber: 'INV-004',
        subtotal: 1000,
        totalAmount: 1000,
        invoiceDate: '2024-01-01T00:00:00Z',
        dueDate: '2024-02-01T00:00:00Z',
        lineItems: [],
      };

      (prisma.invoice.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await createInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateInvoice', () => {
    it('should update an invoice successfully', async () => {
      mockRequest.params = { id: 'invoice-1' };
      mockRequest.body = {
        status: 'sent',
        totalAmount: 1200,
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        userId: 'user-123',
      });

      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        userId: 'user-123',
        status: 'sent',
        totalAmount: 1200,
      });

      await updateInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.invoice).toBeDefined();
    });

    it('should reject update if invoice not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockRequest.body = { status: 'sent' };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await updateInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should update line items when provided', async () => {
      mockRequest.params = { id: 'invoice-1' };
      mockRequest.body = {
        lineItems: [
          {
            description: 'Updated Service',
            quantity: 2,
            unitPrice: 500,
            totalPrice: 1000,
          },
        ],
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
      });

      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        lineItems: mockRequest.body.lineItems,
      });

      await updateInvoice(mockRequest as AuthRequest, mockResponse as Response);

      const updateCall = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.lineItems).toBeDefined();
    });
  });

  describe('markInvoicePaid', () => {
    it('should mark invoice as paid successfully', async () => {
      mockRequest.params = { id: 'invoice-1' };
      mockRequest.body = { paymentMethod: 'credit_card' };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        userId: 'user-123',
        status: 'sent',
      });

      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        status: 'paid',
        paidDate: new Date(),
        paymentMethod: 'credit_card',
      });

      await markInvoicePaid(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      const updateCall = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.status).toBe('paid');
    });

    it('should reject marking non-existent invoice as paid', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockRequest.body = { paymentMethod: 'credit_card' };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await markInvoicePaid(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteInvoice', () => {
    it('should delete an invoice successfully', async () => {
      mockRequest.params = { id: 'invoice-1' };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
        userId: 'user-123',
      });

      (prisma.invoice.delete as jest.Mock).mockResolvedValue({});

      await deleteInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.message).toBe('Invoice deleted successfully');
    });

    it('should reject deletion if invoice not found', async () => {
      mockRequest.params = { id: 'nonexistent' };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await deleteInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors during deletion', async () => {
      mockRequest.params = { id: 'invoice-1' };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: 'invoice-1',
      });

      (prisma.invoice.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await deleteInvoice(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getInvoiceSummary', () => {
    it('should calculate invoice summary statistics', async () => {
      const mockInvoices = [
        {
          id: 'invoice-1',
          status: 'paid',
          totalAmount: 1000,
        },
        {
          id: 'invoice-2',
          status: 'sent',
          totalAmount: 500,
        },
        {
          id: 'invoice-3',
          status: 'overdue',
          totalAmount: 300,
        },
      ];

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      await getInvoiceSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.summary).toBeDefined();
      expect(responseData.summary.total_invoices).toBe(3);
      expect(responseData.summary.paid).toBe(1);
    });

    it('should handle empty invoice list', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      await getInvoiceSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.summary.total_invoices).toBe(0);
      expect(responseData.summary.total_amount).toBe(0);
    });

    it('should handle database errors', async () => {
      (prisma.invoice.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getInvoiceSummary(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
