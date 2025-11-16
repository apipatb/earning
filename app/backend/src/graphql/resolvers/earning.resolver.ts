import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const EARNING_CREATED = 'EARNING_CREATED';
const EARNING_UPDATED = 'EARNING_UPDATED';
const EARNING_DELETED = 'EARNING_DELETED';

export const earningResolvers = {
  Query: {
    earnings: async (_: any, { filter }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const where: any = { userId: context.user.id };
      const limit = filter?.limit || 100;
      const offset = filter?.offset || 0;

      if (filter?.startDate && filter?.endDate) {
        where.date = {
          gte: new Date(filter.startDate),
          lte: new Date(filter.endDate),
        };
      }

      if (filter?.platformId) {
        where.platformId = filter.platformId;
      }

      const [earnings, total] = await Promise.all([
        prisma.earning.findMany({
          where,
          include: {
            platform: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.earning.count({ where }),
      ]);

      return {
        earnings: earnings.map((e) => ({
          ...e,
          hourlyRate: e.hours ? Number(e.amount) / Number(e.hours) : null,
        })),
        total,
        hasMore: total > offset + limit,
      };
    },

    earning: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const earning = await prisma.earning.findFirst({
        where: { id, userId: context.user.id },
        include: { platform: true },
      });

      if (!earning) {
        throw new GraphQLError('Earning not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return {
        ...earning,
        hourlyRate: earning.hours ? Number(earning.amount) / Number(earning.hours) : null,
      };
    },
  },

  Mutation: {
    createEarning: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Verify platform ownership
      const platform = await prisma.platform.findFirst({
        where: { id: input.platformId, userId: context.user.id },
      });

      if (!platform) {
        throw new GraphQLError('Platform not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const earning = await prisma.earning.create({
        data: {
          userId: context.user.id,
          platformId: input.platformId,
          date: new Date(input.date),
          hours: input.hours,
          amount: input.amount,
          notes: input.notes,
        },
        include: { platform: true },
      });

      const earningWithRate = {
        ...earning,
        hourlyRate: earning.hours ? Number(earning.amount) / Number(earning.hours) : null,
      };

      // Publish to subscribers
      pubsub.publish(EARNING_CREATED, { earningCreated: earningWithRate });

      return earningWithRate;
    },

    updateEarning: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.earning.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Earning not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updateData: any = {};
      if (input.amount !== undefined) updateData.amount = input.amount;
      if (input.hours !== undefined) updateData.hours = input.hours;
      if (input.date !== undefined) updateData.date = new Date(input.date);
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.platformId !== undefined) updateData.platformId = input.platformId;

      const earning = await prisma.earning.update({
        where: { id },
        data: updateData,
        include: { platform: true },
      });

      const earningWithRate = {
        ...earning,
        hourlyRate: earning.hours ? Number(earning.amount) / Number(earning.hours) : null,
      };

      // Publish to subscribers
      pubsub.publish(EARNING_UPDATED, { earningUpdated: earningWithRate });

      return earningWithRate;
    },

    deleteEarning: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const earning = await prisma.earning.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!earning) {
        throw new GraphQLError('Earning not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.earning.delete({ where: { id } });

      // Publish to subscribers
      pubsub.publish(EARNING_DELETED, { earningDeleted: id });

      return true;
    },
  },

  Subscription: {
    earningCreated: {
      subscribe: () => pubsub.asyncIterator([EARNING_CREATED]),
    },
    earningUpdated: {
      subscribe: () => pubsub.asyncIterator([EARNING_UPDATED]),
    },
    earningDeleted: {
      subscribe: () => pubsub.asyncIterator([EARNING_DELETED]),
    },
  },

  Earning: {
    platform: async (parent: any) => {
      return await prisma.platform.findUnique({
        where: { id: parent.platformId },
      });
    },
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },
};
