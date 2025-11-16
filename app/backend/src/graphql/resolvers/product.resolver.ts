import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

export const productResolvers = {
  Query: {
    products: async (_: any, { filter }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const where: any = { userId: context.user.id };
      const limit = filter?.limit || 100;
      const offset = filter?.offset || 0;

      if (filter?.categoryId) {
        where.categoryId = filter.categoryId;
      }

      if (filter?.lowStock) {
        where.stockQuantity = {
          lte: prisma.product.fields.lowStockThreshold,
        };
      }

      if (filter?.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { sku: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.product.count({ where }),
      ]);

      return {
        products,
        total,
        limit,
        offset,
      };
    },

    product: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const product = await prisma.product.findFirst({
        where: { id, userId: context.user.id },
        include: { sales: true },
      });

      if (!product) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return product;
    },
  },

  Mutation: {
    createProduct: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return await prisma.product.create({
        data: {
          userId: context.user.id,
          ...input,
        },
      });
    },

    updateProduct: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.product.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return await prisma.product.update({
        where: { id },
        data: input,
      });
    },

    deleteProduct: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const product = await prisma.product.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!product) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.product.delete({ where: { id } });

      return true;
    },
  },

  Product: {
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
    sales: async (parent: any) => {
      return await prisma.sale.findMany({
        where: { productId: parent.id },
        orderBy: { saleDate: 'desc' },
      });
    },
    category: async (parent: any) => {
      if (!parent.categoryId) return null;
      return await prisma.productCategory.findUnique({
        where: { id: parent.categoryId },
      });
    },
  },
};
