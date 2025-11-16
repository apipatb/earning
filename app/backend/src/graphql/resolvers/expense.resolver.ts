import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

export const expenseResolvers = {
  Query: {
    expenses: async (_: any, args: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const where: any = { userId: context.user.id };
      const limit = args.limit || 100;
      const offset = args.offset || 0;

      if (args.startDate && args.endDate) {
        where.date = {
          gte: new Date(args.startDate),
          lte: new Date(args.endDate),
        };
      }

      if (args.category) {
        where.category = args.category;
      }

      return await prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        skip: offset,
      });
    },

    expense: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const expense = await prisma.expense.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!expense) {
        throw new GraphQLError('Expense not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return expense;
    },
  },

  Mutation: {
    createExpense: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return await prisma.expense.create({
        data: {
          userId: context.user.id,
          ...input,
          date: new Date(input.date),
        },
      });
    },

    updateExpense: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.expense.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Expense not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updateData: any = { ...input };
      if (input.date) {
        updateData.date = new Date(input.date);
      }

      return await prisma.expense.update({
        where: { id },
        data: updateData,
      });
    },

    deleteExpense: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const expense = await prisma.expense.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!expense) {
        throw new GraphQLError('Expense not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.expense.delete({ where: { id } });

      return true;
    },
  },

  Expense: {
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },
};
