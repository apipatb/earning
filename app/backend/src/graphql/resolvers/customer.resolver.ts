import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const CUSTOMER_CREATED = 'CUSTOMER_CREATED';
const CUSTOMER_UPDATED = 'CUSTOMER_UPDATED';

export const customerResolvers = {
  Query: {
    customers: async (_: any, { filter }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const where: any = { userId: context.user.id };
      const limit = filter?.limit || 100;
      const offset = filter?.offset || 0;

      if (filter?.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      if (filter?.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
          { phone: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      let orderBy: any = { name: 'asc' };
      switch (filter?.sortBy) {
        case 'ltv':
          orderBy = { totalPurchases: 'desc' };
          break;
        case 'recent':
          orderBy = { lastPurchase: 'desc' };
          break;
        case 'purchases':
          orderBy = { purchaseCount: 'desc' };
          break;
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          orderBy,
          skip: offset,
          take: limit,
        }),
        prisma.customer.count({ where }),
      ]);

      return {
        customers: customers.map((c) => ({
          ...c,
          averageOrderValue: c.purchaseCount > 0 ? Number(c.totalPurchases) / c.purchaseCount : 0,
        })),
        total,
        limit,
        offset,
      };
    },

    customer: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const customer = await prisma.customer.findFirst({
        where: { id, userId: context.user.id },
        include: {
          invoices: true,
          sales: { include: { product: true } },
        },
      });

      if (!customer) {
        throw new GraphQLError('Customer not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return {
        ...customer,
        averageOrderValue: customer.purchaseCount > 0 ? Number(customer.totalPurchases) / customer.purchaseCount : 0,
      };
    },

    topCustomers: async (_: any, { limit }: { limit?: number }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const customers = await prisma.customer.findMany({
        where: { userId: context.user.id },
        orderBy: { totalPurchases: 'desc' },
        take: limit || 10,
      });

      return customers.map((c) => ({
        ...c,
        averageOrderValue: c.purchaseCount > 0 ? Number(c.totalPurchases) / c.purchaseCount : 0,
      }));
    },
  },

  Mutation: {
    createCustomer: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const customer = await prisma.customer.create({
        data: {
          userId: context.user.id,
          ...input,
        },
      });

      const customerWithAOV = {
        ...customer,
        averageOrderValue: 0,
      };

      // Publish to subscribers
      pubsub.publish(CUSTOMER_CREATED, { customerCreated: customerWithAOV });

      return customerWithAOV;
    },

    updateCustomer: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.customer.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Customer not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const customer = await prisma.customer.update({
        where: { id },
        data: input,
      });

      const customerWithAOV = {
        ...customer,
        averageOrderValue: customer.purchaseCount > 0 ? Number(customer.totalPurchases) / customer.purchaseCount : 0,
      };

      // Publish to subscribers
      pubsub.publish(CUSTOMER_UPDATED, { customerUpdated: customerWithAOV });

      return customerWithAOV;
    },

    deleteCustomer: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const customer = await prisma.customer.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!customer) {
        throw new GraphQLError('Customer not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.customer.delete({ where: { id } });

      return true;
    },
  },

  Subscription: {
    customerCreated: {
      subscribe: () => pubsub.asyncIterator([CUSTOMER_CREATED]),
    },
    customerUpdated: {
      subscribe: () => pubsub.asyncIterator([CUSTOMER_UPDATED]),
    },
  },

  Customer: {
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
    invoices: async (parent: any) => {
      return await prisma.invoice.findMany({
        where: { customerId: parent.id },
        orderBy: { invoiceDate: 'desc' },
      });
    },
    sales: async (parent: any) => {
      return await prisma.sale.findMany({
        where: { customerId: parent.id },
        include: { product: true },
        orderBy: { saleDate: 'desc' },
      });
    },
  },
};
