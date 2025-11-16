/**
 * Tests for Customer Controller
 */

import {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDetails,
  getTopCustomers,
} from '../customer.controller';
import {
  createMockRequest,
  createMockResponse,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Customer Controller', () => {
  const mockUserId = 'user-123';
  const mockCustomerId = 'customer-123';

  const mockCustomer = {
    id: mockCustomerId,
    userId: mockUserId,
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '1234567890',
    company: 'Test Company',
    address: '123 Test St',
    city: 'Test City',
    country: 'Test Country',
    totalPurchases: 5000,
    totalQuantity: 50,
    purchaseCount: 10,
    lastPurchase: new Date('2025-01-15'),
    notes: 'VIP customer',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCustomers', () => {
    it('should get all customers for user', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.customers).toHaveLength(1);
      expect(response.customers[0].name).toBe('Test Customer');
      expect(response.pagination.total).toBe(1);
    });

    it('should filter customers by active status', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { isActive: 'true' },
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should filter customers by inactive status', async () => {
      const inactiveCustomer = { ...mockCustomer, isActive: false };
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([inactiveCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { isActive: 'false' },
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it('should search customers by name, email, or phone', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { search: 'Test' },
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
              expect.objectContaining({ email: expect.anything() }),
              expect.objectContaining({ phone: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should sort customers by name (default)', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        })
      );
    });

    it('should sort customers by total purchases (ltv)', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { sortBy: 'ltv' },
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { totalPurchases: 'desc' },
        })
      );
    });

    it('should sort customers by last purchase date', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { sortBy: 'recent' },
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastPurchase: 'desc' },
        })
      );
    });

    it('should apply pagination parameters', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(100);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { limit: '20', offset: '40' },
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 40,
        })
      );
    });

    it('should calculate average order value correctly', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      const response = getResponseData(res);
      expect(response.customers[0].averageOrderValue).toBe(500);
    });

    it('should only return customers belonging to user', async () => {
      (prisma.customer.count as jest.Mock).mockResolvedValue(1);
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([mockCustomer]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      );
    });
  });

  describe('createCustomer', () => {
    it('should create customer with valid data', async () => {
      (prisma.customer.create as jest.Mock).mockResolvedValue(mockCustomer);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          name: 'New Customer',
          email: 'new@example.com',
          phone: '9876543210',
          company: 'New Company',
        },
      });
      const res = createMockResponse();

      await createCustomer(req, res);

      verifySuccessResponse(res, 201);
      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            name: 'New Customer',
            email: 'new@example.com',
          }),
        })
      );
    });

    it('should create customer with minimal data', async () => {
      const minimalCustomer = {
        ...mockCustomer,
        email: null,
        phone: null,
        company: null,
      };
      (prisma.customer.create as jest.Mock).mockResolvedValue(minimalCustomer);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          name: 'Minimal Customer',
        },
      });
      const res = createMockResponse();

      await createCustomer(req, res);

      verifySuccessResponse(res, 201);
    });

    it('should reject customer with empty name', async () => {
      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          name: '',
          email: 'customer@example.com',
        },
      });
      const res = createMockResponse();

      await createCustomer(req, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });

    it('should reject customer with invalid email', async () => {
      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        body: {
          name: 'Test Customer',
          email: 'invalid-email',
        },
      });
      const res = createMockResponse();

      await createCustomer(req, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      const updatedCustomer = { ...mockCustomer, name: 'Updated Name' };
      (prisma.customer.update as jest.Mock).mockResolvedValue(updatedCustomer);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockCustomerId },
        body: { name: 'Updated Name' },
      });
      const res = createMockResponse();

      await updateCustomer(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.customer.name).toBe('Updated Name');
    });

    it('should return 404 if customer not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: 'non-existent-id' },
        body: { name: 'Updated Name' },
      });
      const res = createMockResponse();

      await updateCustomer(req, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('Not Found');
    });

    it('should verify user ownership before update', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'different-user', email: 'other@example.com' },
        params: { id: mockCustomerId },
        body: { name: 'Updated Name' },
      });
      const res = createMockResponse();

      await updateCustomer(req, res);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockCustomerId,
            userId: 'different-user',
          }),
        })
      );
      verifyErrorResponse(res, 404);
    });

    it('should allow partial updates', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.customer.update as jest.Mock).mockResolvedValue(mockCustomer);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockCustomerId },
        body: { phone: '9999999999' },
      });
      const res = createMockResponse();

      await updateCustomer(req, res);

      verifySuccessResponse(res, 200);
      expect(prisma.customer.update).toHaveBeenCalled();
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer successfully', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.customer.delete as jest.Mock).mockResolvedValue(mockCustomer);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockCustomerId },
      });
      const res = createMockResponse();

      await deleteCustomer(req, res);

      verifySuccessResponse(res, 200);
      expect(prisma.customer.delete).toHaveBeenCalledWith({
        where: { id: mockCustomerId },
      });
    });

    it('should return 404 if customer not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: 'non-existent-id' },
      });
      const res = createMockResponse();

      await deleteCustomer(req, res);

      verifyErrorResponse(res, 404);
      expect(prisma.customer.delete).not.toHaveBeenCalled();
    });

    it('should verify user ownership before deletion', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'different-user', email: 'other@example.com' },
        params: { id: mockCustomerId },
      });
      const res = createMockResponse();

      await deleteCustomer(req, res);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'different-user' }),
        })
      );
      verifyErrorResponse(res, 404);
    });
  });

  describe('getCustomerDetails', () => {
    it('should get customer with invoices', async () => {
      const customerWithInvoices = {
        ...mockCustomer,
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-001',
            totalAmount: 1000,
            status: 'paid',
            invoiceDate: new Date('2025-01-01'),
          },
          {
            id: 'inv-2',
            invoiceNumber: 'INV-002',
            totalAmount: 500,
            status: 'sent',
            invoiceDate: new Date('2025-01-15'),
          },
        ],
      };
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(customerWithInvoices);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockCustomerId },
      });
      const res = createMockResponse();

      await getCustomerDetails(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.customer.invoices).toHaveLength(2);
      expect(response.customer.averageOrderValue).toBe(500);
    });

    it('should return 404 if customer not found', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: 'non-existent-id' },
      });
      const res = createMockResponse();

      await getCustomerDetails(req, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.error).toBe('Not Found');
    });

    it('should verify user ownership', async () => {
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'different-user', email: 'other@example.com' },
        params: { id: mockCustomerId },
      });
      const res = createMockResponse();

      await getCustomerDetails(req, res);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: mockCustomerId,
            userId: 'different-user',
          }),
        })
      );
    });

    it('should include invoices ordered by date', async () => {
      const customerWithInvoices = {
        ...mockCustomer,
        invoices: [],
      };
      (prisma.customer.findFirst as jest.Mock).mockResolvedValue(customerWithInvoices);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        params: { id: mockCustomerId },
      });
      const res = createMockResponse();

      await getCustomerDetails(req, res);

      expect(prisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            invoices: expect.objectContaining({
              orderBy: { invoiceDate: 'desc' },
            }),
          }),
        })
      );
    });
  });

  describe('getTopCustomers', () => {
    it('should return top customers by total purchases', async () => {
      const topCustomers = [
        { ...mockCustomer, id: 'c1', totalPurchases: 10000, purchaseCount: 20 },
        { ...mockCustomer, id: 'c2', totalPurchases: 5000, purchaseCount: 10 },
        { ...mockCustomer, id: 'c3', totalPurchases: 2000, purchaseCount: 5 },
      ];
      (prisma.customer.findMany as jest.Mock).mockResolvedValue(topCustomers);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getTopCustomers(req, res);

      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.topCustomers).toHaveLength(3);
      expect(response.topCustomers[0].totalPurchases).toBe(10000);
    });

    it('should apply custom limit parameter', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: { limit: '5' },
      });
      const res = createMockResponse();

      await getTopCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should use default limit of 10', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getTopCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should calculate average order value for each customer', async () => {
      const topCustomers = [
        { ...mockCustomer, totalPurchases: 10000, purchaseCount: 20 },
      ];
      (prisma.customer.findMany as jest.Mock).mockResolvedValue(topCustomers);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getTopCustomers(req, res);

      const response = getResponseData(res);
      expect(response.topCustomers[0].averageOrderValue).toBe(500);
    });

    it('should handle customers with zero purchases', async () => {
      const topCustomers = [
        { ...mockCustomer, totalPurchases: 0, purchaseCount: 0 },
      ];
      (prisma.customer.findMany as jest.Mock).mockResolvedValue(topCustomers);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getTopCustomers(req, res);

      const response = getResponseData(res);
      expect(response.topCustomers[0].averageOrderValue).toBe(0);
    });

    it('should only return customers belonging to user', async () => {
      (prisma.customer.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: mockUserId, email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getTopCustomers(req, res);

      expect(prisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        })
      );
    });
  });
});
