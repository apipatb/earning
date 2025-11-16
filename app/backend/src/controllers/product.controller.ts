import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, ControllerHandler, ProductFilter, ProductWithStats } from '../types';
import prisma from '../lib/prisma';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
});

export const getAllProducts: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { isActive } = req.query as ProductFilter;

    interface ProductWhere {
      userId: string;
      isActive?: boolean;
    }
    const where: ProductWhere = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        sales: {
          select: {
            quantity: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate stats for each product
    const productsWithStats = products.map((product) => {
      const totalSales = product.sales.length;
      const totalRevenue = product.sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const totalQuantity = product.sales.reduce((sum, s) => sum + Number(s.quantity), 0);

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        category: product.category,
        sku: product.sku,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        stats: {
          total_sales: totalSales,
          total_revenue: totalRevenue,
          total_quantity: totalQuantity,
        },
      };
    });

    res.json({ products: productsWithStats });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch products',
    });
  }
};

export const createProduct: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data = productSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        sku: data.sku,
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create product',
    });
  }
};

export const updateProduct: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const productId = req.params.id;
    const data = productSchema.partial().parse(req.body);

    // Check ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data,
    });

    res.json({ product: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update product',
    });
  }
};

export const deleteProduct: ControllerHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const productId = req.params.id;

    // Check ownership
    const product = await prisma.product.findFirst({
      where: { id: productId, userId },
    });

    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Product not found',
      });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete product',
    });
  }
};
