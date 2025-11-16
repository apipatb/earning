import { Response } from 'express';
import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDetails,
  getTopCustomers,
} from '../controllers/customer.controller';
import prisma from '../lib/prisma';
import { AuthRequest } from '../types';

jest.mock('../lib/prisma', () => ({
  customer: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
}));

describe('Customer Controller', () => {
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

  describe('getAllCustomers', () => {
    it('should fetch all customers for a user', async () => {
      const mockCustomers = [
        {
          id: 'cust-1',
          userId: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          company: 'Acme Inc',
          address: '123 Main St',
          city: 'New York',
          country: 'USA',
          totalPurchases: 5000,
          totalQuantity: 10,
          purchaseCount: 5,
          lastPurchase: new Date('2024-01-15'),
          notes: 'VIP customer',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.customers).toBeDefined();
      expect(responseData.customers.length).toBe(1);
    });

    it('should filter customers by active status', async () => {
      mockRequest.query = { isActive: 'true' };

      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.isActive).toBe(true);
    });

    it('should search customers by name, email, or phone', async () => {
      mockRequest.query = { search: 'john' };

      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
    });

    it('should sort customers by lifetime value (ltv)', async () => {
      mockRequest.query = { sortBy: 'ltv' };

      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.orderBy.totalPurchases).toBe('desc');
    });

    it('should sort customers by recent purchases', async () => {
      mockRequest.query = { sortBy: 'recent' };

      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.orderBy.lastPurchase).toBe('desc');
    });

    it('should sort customers by purchase count', async () => {
      mockRequest.query = { sortBy: 'purchases' };

      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.orderBy.purchaseCount).toBe('desc');
    });

    it('should default to sorting by name', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.orderBy.name).toBe('asc');
    });

    it('should calculate average order value', async () => {
      const mockCustomers = [
        {
          id: 'cust-1',
          name: 'John Doe',
          totalPurchases: 5000,
          purchaseCount: 5,
        },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockCustomers);

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.customers[0].averageOrderValue).toBe(1000);
    });

    it('should handle database errors', async () => {
      (prisma.customer.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getAllCustomers(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(responseData.error).toBe('Internal Server Error');
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer successfully', async () => {
      mockRequest.body = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-5678',
        company: 'Smith Corp',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        country: 'USA',
        notes: 'New customer',
      };

      (prisma.customer.create as jest.Mock).mockResolvedValue({
        id: 'cust-2',
        userId: 'user-123',
        ...mockRequest.body,
        createdAt: new Date(),
      });

      await createCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseData.customer).toBeDefined();
    });

    it('should create customer with minimal required fields', async () => {
      mockRequest.body = {
        name: 'Minimal Customer',
      };

      (prisma.customer.create as jest.Mock).mockResolvedValue({
        id: 'cust-3',
        userId: 'user-123',
        ...mockRequest.body,
      });

      await createCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should reject creation without required name field', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };

      await createCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(responseData.error).toBe('Validation Error');
    });

    it('should reject invalid email format', async () => {
      mockRequest.body = {
        name: 'Test Customer',
        email: 'invalid-email',
      };

      await createCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      mockRequest.body = {
        name: 'Test Customer',
      };

      (prisma.customer.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await createCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateCustomer', () => {
    it('should update a customer successfully', async () => {
      mockRequest.params = { id: 'cust-1' };
      mockRequest.body = {
        phone: '555-9999',
        notes: 'Updated notes',
      };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        userId: 'user-123',
      });

      (prisma.customer.update as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        ...mockRequest.body,
      });

      await updateCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.customer).toBeDefined();
    });

    it('should reject update if customer not found', async () => {
      mockRequest.params = { id: 'nonexistent' };
      mockRequest.body = { phone: '555-9999' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await updateCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should handle partial updates', async () => {
      mockRequest.params = { id: 'cust-1' };
      mockRequest.body = { company: 'Updated Company' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
      });

      (prisma.customer.update as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        company: 'Updated Company',
      });

      await updateCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle database errors during update', async () => {
      mockRequest.params = { id: 'cust-1' };
      mockRequest.body = { name: 'Updated Name' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
      });

      (prisma.customer.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      await updateCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteCustomer', () => {
    it('should delete a customer successfully', async () => {
      mockRequest.params = { id: 'cust-1' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        userId: 'user-123',
      });

      (prisma.customer.delete as jest.Mock).mockResolvedValue({});

      await deleteCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.message).toBe('Customer deleted successfully');
    });

    it('should reject deletion if customer not found', async () => {
      mockRequest.params = { id: 'nonexistent' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await deleteCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });

    it('should handle database errors during deletion', async () => {
      mockRequest.params = { id: 'cust-1' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
      });

      (prisma.customer.delete as jest.Mock).mockRejectedValue(new Error('Database error'));

      await deleteCustomer(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCustomerDetails', () => {
    it('should fetch detailed customer information with invoices', async () => {
      mockRequest.params = { id: 'cust-1' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        totalPurchases: 5000,
        totalQuantity: 10,
        purchaseCount: 5,
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            totalAmount: 1000,
            status: 'paid',
            invoiceDate: new Date('2024-01-01'),
          },
        ],
      });

      await getCustomerDetails(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.customer).toBeDefined();
      expect(responseData.customer.invoices).toBeDefined();
    });

    it('should reject if customer not found', async () => {
      mockRequest.params = { id: 'nonexistent' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      await getCustomerDetails(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(responseData.error).toBe('Not Found');
    });

    it('should calculate average order value', async () => {
      mockRequest.params = { id: 'cust-1' };

      (prisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        name: 'John Doe',
        totalPurchases: 5000,
        purchaseCount: 5,
        invoices: [],
      });

      await getCustomerDetails(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.customer.averageOrderValue).toBe(1000);
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: 'cust-1' };

      (prisma.customer.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getCustomerDetails(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getTopCustomers', () => {
    it('should fetch top customers by lifetime value', async () => {
      const mockTopCustomers = [
        {
          id: 'cust-1',
          name: 'Top Customer',
          email: 'top@example.com',
          totalPurchases: 10000,
          purchaseCount: 10,
          lastPurchase: new Date('2024-01-15'),
        },
        {
          id: 'cust-2',
          name: 'Second Customer',
          email: 'second@example.com',
          totalPurchases: 5000,
          purchaseCount: 5,
          lastPurchase: new Date('2024-01-10'),
        },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockTopCustomers);

      await getTopCustomers(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalled();
      expect(responseData.topCustomers).toBeDefined();
      expect(responseData.topCustomers.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      mockRequest.query = { limit: '5' };

      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      await getTopCustomers(mockRequest as AuthRequest, mockResponse as Response);

      const callArgs = (prisma.customer.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.take).toBe(5);
    });

    it('should calculate average order value for top customers', async () => {
      const mockTopCustomers = [
        {
          id: 'cust-1',
          name: 'Top Customer',
          totalPurchases: 10000,
          purchaseCount: 10,
        },
      ];

      (prisma.customer.findMany as jest.Mock).mockResolvedValue(mockTopCustomers);

      await getTopCustomers(mockRequest as AuthRequest, mockResponse as Response);

      expect(responseData.topCustomers[0].averageOrderValue).toBe(1000);
    });

    it('should handle database errors', async () => {
      (prisma.customer.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

      await getTopCustomers(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
