/**
 * Tests for Product Controller
 */

import { getAllProducts, createProduct, updateProduct, deleteProduct } from '../product.controller';
import {
  createMockRequest,
  createMockResponse,
  verifySuccessResponse,
  verifyErrorResponse,
  getResponseData,
} from '../../test/utils';
import prisma from '../../lib/prisma';

jest.mock('../../lib/prisma');

describe('Product Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllProducts', () => {
    it('should return all products with stats successfully', async () => {
      const mockProducts = [
        {
          id: '1',
          userId: 'user-123',
          name: 'Product 1',
          description: 'Test product 1',
          price: 99.99,
          category: 'Electronics',
          sku: 'PROD-001',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          sales: [
            { quantity: 5, totalAmount: 499.95 },
            { quantity: 3, totalAmount: 299.97 },
          ],
        },
        {
          id: '2',
          userId: 'user-123',
          name: 'Product 2',
          description: 'Test product 2',
          price: 49.99,
          category: 'Books',
          sku: 'PROD-002',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          sales: [],
        },
      ];

      (prisma.product.count as jest.Mock).mockResolvedValue(2);
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: {},
      });
      const res = createMockResponse();

      await getAllProducts(req as any, res);

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(prisma.product.findMany).toHaveBeenCalled();
      verifySuccessResponse(res, 200);

      const response = getResponseData(res);
      expect(response.products).toHaveLength(2);
      expect(response.products[0].stats.total_sales).toBe(2);
      expect(response.products[0].stats.total_revenue).toBe(799.92);
      expect(response.products[0].stats.total_quantity).toBe(8);
      expect(response.products[1].stats.total_sales).toBe(0);
      expect(response.pagination.total).toBe(2);
    });

    it('should filter by active status', async () => {
      (prisma.product.count as jest.Mock).mockResolvedValue(1);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { isActive: 'true' },
      });
      const res = createMockResponse();

      await getAllProducts(req as any, res);

      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', isActive: true },
      });
    });

    it('should support pagination', async () => {
      (prisma.product.count as jest.Mock).mockResolvedValue(100);
      (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        query: { limit: '10', offset: '20' },
      });
      const res = createMockResponse();

      await getAllProducts(req as any, res);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      (prisma.product.count as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
      });
      const res = createMockResponse();

      await getAllProducts(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to fetch products');
    });
  });

  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      const mockProduct = {
        id: '1',
        userId: 'user-123',
        name: 'New Product',
        description: 'A new test product',
        price: 149.99,
        category: 'Electronics',
        sku: 'PROD-NEW',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'New Product',
          description: 'A new test product',
          price: 149.99,
          category: 'Electronics',
          sku: 'PROD-NEW',
        },
      });
      const res = createMockResponse();

      await createProduct(req as any, res);

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          name: 'New Product',
          price: 149.99,
        }),
      });
      verifySuccessResponse(res, 201);
      const response = getResponseData(res);
      expect(response.product.id).toBe('1');
    });

    it('should reject product with missing name', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          price: 99.99,
        },
      });
      const res = createMockResponse();

      await createProduct(req as any, res);

      verifyErrorResponse(res, 400);
      const response = getResponseData(res);
      expect(response.error).toBe('Validation Error');
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('should reject product with negative price', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'Invalid Product',
          price: -10,
        },
      });
      const res = createMockResponse();

      await createProduct(req as any, res);

      verifyErrorResponse(res, 400);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('should reject product with zero price', async () => {
      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'Zero Price Product',
          price: 0,
        },
      });
      const res = createMockResponse();

      await createProduct(req as any, res);

      verifyErrorResponse(res, 400);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.product.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        body: {
          name: 'Test Product',
          price: 99.99,
        },
      });
      const res = createMockResponse();

      await createProduct(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to create product');
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      const existingProduct = {
        id: '1',
        userId: 'user-123',
        name: 'Old Name',
        price: 99.99,
      };

      const updatedProduct = {
        ...existingProduct,
        name: 'Updated Name',
        price: 149.99,
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue(updatedProduct);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: {
          name: 'Updated Name',
          price: 149.99,
        },
      });
      const res = createMockResponse();

      await updateProduct(req as any, res);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: '1', userId: 'user-123' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          name: 'Updated Name',
          price: 149.99,
        }),
      });
      verifySuccessResponse(res, 200);
    });

    it('should return 404 if product not found', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
        body: { name: 'Updated Name' },
      });
      const res = createMockResponse();

      await updateProduct(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Product not found');
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should prevent updating other users products', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-product' },
        body: { name: 'Hacked Name' },
      });
      const res = createMockResponse();

      await updateProduct(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should allow partial updates', async () => {
      const existingProduct = {
        id: '1',
        userId: 'user-123',
        name: 'Product Name',
        price: 99.99,
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.product.update as jest.Mock).mockResolvedValue({
        ...existingProduct,
        description: 'New description',
      });

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: { description: 'New description' },
      });
      const res = createMockResponse();

      await updateProduct(req as any, res);

      verifySuccessResponse(res, 200);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.product.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
        body: { name: 'Updated Name' },
      });
      const res = createMockResponse();

      await updateProduct(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to update product');
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      const existingProduct = {
        id: '1',
        userId: 'user-123',
        name: 'Product to Delete',
      };

      (prisma.product.findFirst as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.product.delete as jest.Mock).mockResolvedValue(existingProduct);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await deleteProduct(req as any, res);

      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: '1', userId: 'user-123' },
      });
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      verifySuccessResponse(res, 200);
      const response = getResponseData(res);
      expect(response.message).toBe('Product deleted successfully');
    });

    it('should return 404 if product not found', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'nonexistent' },
      });
      const res = createMockResponse();

      await deleteProduct(req as any, res);

      verifyErrorResponse(res, 404);
      const response = getResponseData(res);
      expect(response.message).toBe('Product not found');
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('should prevent deleting other users products', async () => {
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(null);

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: 'other-product' },
      });
      const res = createMockResponse();

      await deleteProduct(req as any, res);

      verifyErrorResponse(res, 404);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (prisma.product.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await deleteProduct(req as any, res);

      verifyErrorResponse(res, 500);
      const response = getResponseData(res);
      expect(response.message).toBe('Failed to delete product');
    });

    it('should handle cascade deletion errors', async () => {
      const existingProduct = { id: '1', userId: 'user-123' };
      (prisma.product.findFirst as jest.Mock).mockResolvedValue(existingProduct);
      (prisma.product.delete as jest.Mock).mockRejectedValue(
        new Error('Foreign key constraint violation')
      );

      const req = createMockRequest({
        user: { id: 'user-123', email: 'test@example.com' },
        params: { id: '1' },
      });
      const res = createMockResponse();

      await deleteProduct(req as any, res);

      verifyErrorResponse(res, 500);
    });
  });
});
