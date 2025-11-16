import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const INVOICE_CREATED = 'INVOICE_CREATED';
const INVOICE_UPDATED = 'INVOICE_UPDATED';
const INVOICE_PAID = 'INVOICE_PAID';
const INVOICE_OVERDUE = 'INVOICE_OVERDUE';

export const invoiceResolvers = {
  Query: {
    invoices: async (_: any, { filter }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const where: any = { userId: context.user.id };
      const limit = filter?.limit || 50;
      const offset = filter?.offset || 0;

      if (filter?.startDate && filter?.endDate) {
        where.invoiceDate = {
          gte: new Date(filter.startDate),
          lte: new Date(filter.endDate),
        };
      }

      if (filter?.status) {
        where.status = filter.status.toLowerCase();
      }

      if (filter?.customerId) {
        where.customerId = filter.customerId;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            customer: true,
            lineItems: true,
          },
          orderBy: { invoiceDate: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.invoice.count({ where }),
      ]);

      return {
        invoices,
        total,
        limit,
        offset,
      };
    },

    invoice: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId: context.user.id },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      if (!invoice) {
        throw new GraphQLError('Invoice not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return invoice;
    },

    invoiceSummary: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const invoices = await prisma.invoice.findMany({
        where: { userId: context.user.id },
      });

      return {
        totalInvoices: invoices.length,
        paid: invoices.filter((i) => i.status === 'paid').length,
        pending: invoices.filter((i) => ['draft', 'sent', 'viewed'].includes(i.status)).length,
        overdue: invoices.filter((i) => i.status === 'overdue').length,
        totalAmount: invoices.reduce((sum, i) => sum + Number(i.totalAmount), 0),
        paidAmount: invoices
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + Number(i.totalAmount), 0),
        pendingAmount: invoices
          .filter((i) => ['draft', 'sent', 'viewed', 'overdue'].includes(i.status))
          .reduce((sum, i) => sum + Number(i.totalAmount), 0),
      };
    },

    overdueInvoices: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const today = new Date();
      const invoices = await prisma.invoice.findMany({
        where: {
          userId: context.user.id,
          dueDate: { lt: today },
          status: { not: 'paid' },
        },
        include: { customer: true },
        orderBy: { dueDate: 'asc' },
      });

      return invoices.map((inv) => ({
        ...inv,
        daysOverdue: Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      }));
    },
  },

  Mutation: {
    createInvoice: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Verify customer ownership if provided
      if (input.customerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: input.customerId, userId: context.user.id },
        });
        if (!customer) {
          throw new GraphQLError('Customer not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
      }

      const { lineItems, ...invoiceData } = input;

      const invoice = await prisma.invoice.create({
        data: {
          userId: context.user.id,
          ...invoiceData,
          invoiceDate: new Date(invoiceData.invoiceDate),
          dueDate: new Date(invoiceData.dueDate),
          status: invoiceData.status?.toLowerCase() || 'draft',
          lineItems: {
            create: lineItems,
          },
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      // Publish to subscribers
      pubsub.publish(INVOICE_CREATED, { invoiceCreated: invoice });

      return invoice;
    },

    updateInvoice: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.invoice.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Invoice not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const { lineItems, ...invoiceData } = input;
      const updateData: any = { ...invoiceData };

      if (invoiceData.invoiceDate) {
        updateData.invoiceDate = new Date(invoiceData.invoiceDate);
      }
      if (invoiceData.dueDate) {
        updateData.dueDate = new Date(invoiceData.dueDate);
      }
      if (invoiceData.status) {
        updateData.status = invoiceData.status.toLowerCase();
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          ...updateData,
          ...(lineItems && {
            lineItems: {
              deleteMany: {},
              create: lineItems,
            },
          }),
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      // Publish to subscribers
      pubsub.publish(INVOICE_UPDATED, { invoiceUpdated: invoice });

      // Check for status changes
      if (input.status && input.status.toLowerCase() !== existing.status) {
        if (input.status.toLowerCase() === 'overdue') {
          pubsub.publish(INVOICE_OVERDUE, { invoiceOverdue: invoice });
        }
      }

      return invoice;
    },

    markInvoicePaid: async (_: any, { id, paymentMethod }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.invoice.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Invoice not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'paid',
          paidDate: new Date(),
          paymentMethod: paymentMethod || existing.paymentMethod,
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      // Publish to subscribers
      pubsub.publish(INVOICE_PAID, { invoicePaid: invoice });

      return invoice;
    },

    deleteInvoice: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!invoice) {
        throw new GraphQLError('Invoice not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.invoice.delete({ where: { id } });

      return true;
    },
  },

  Subscription: {
    invoiceCreated: {
      subscribe: () => pubsub.asyncIterator([INVOICE_CREATED]),
    },
    invoiceUpdated: {
      subscribe: () => pubsub.asyncIterator([INVOICE_UPDATED]),
    },
    invoicePaid: {
      subscribe: () => pubsub.asyncIterator([INVOICE_PAID]),
    },
    invoiceOverdue: {
      subscribe: () => pubsub.asyncIterator([INVOICE_OVERDUE]),
    },
  },

  Invoice: {
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
    lineItems: async (parent: any) => {
      return await prisma.invoiceLineItem.findMany({
        where: { invoiceId: parent.id },
      });
    },
  },
};
