import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

export const saleResolvers = {
  Query: {
    sales: async (_: any, args: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const limit = args.limit || 100;
      const offset = args.offset || 0;

      return await prisma.sale.findMany({
        where: { userId: context.user.id },
        include: {
          product: true,
          customer: true,
        },
        orderBy: { saleDate: 'desc' },
        take: limit,
        skip: offset,
      });
    },

    sale: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const sale = await prisma.sale.findFirst({
        where: { id, userId: context.user.id },
        include: {
          product: true,
          customer: true,
        },
      });

      if (!sale) {
        throw new GraphQLError('Sale not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return sale;
    },
  },

  Mutation: {
    createSale: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Verify product ownership
      const product = await prisma.product.findFirst({
        where: { id: input.productId, userId: context.user.id },
      });

      if (!product) {
        throw new GraphQLError('Product not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return await prisma.sale.create({
        data: {
          userId: context.user.id,
          ...input,
          saleDate: new Date(input.saleDate),
          status: input.status?.toLowerCase() || 'completed',
        },
        include: {
          product: true,
          customer: true,
        },
      });
    },

    updateSale: async (_: any, { id, status }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.sale.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Sale not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return await prisma.sale.update({
        where: { id },
        data: { status: status.toLowerCase() },
        include: {
          product: true,
          customer: true,
        },
      });
    },

    deleteSale: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const sale = await prisma.sale.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!sale) {
        throw new GraphQLError('Sale not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.sale.delete({ where: { id } });

      return true;
    },
  },

  Sale: {
    product: async (parent: any) => {
      return await prisma.product.findUnique({
        where: { id: parent.productId },
      });
    },
    customer: async (parent: any) => {
      if (!parent.customerId) return null;
      return await prisma.customer.findUnique({
        where: { id: parent.customerId },
      });
    },
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },
};
