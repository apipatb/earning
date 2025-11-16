import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

const GOAL_PROGRESS_UPDATED = 'GOAL_PROGRESS_UPDATED';
const GOAL_COMPLETED = 'GOAL_COMPLETED';

export const goalResolvers = {
  Query: {
    goals: async (_: any, { status }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const where: any = { userId: context.user.id };

      if (status) {
        where.status = status.toLowerCase();
      }

      return await prisma.goal.findMany({
        where,
        include: { earnings: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    goal: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const goal = await prisma.goal.findFirst({
        where: { id, userId: context.user.id },
        include: { earnings: true },
      });

      if (!goal) {
        throw new GraphQLError('Goal not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return goal;
    },
  },

  Mutation: {
    createGoal: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const goalData: any = {
        userId: context.user.id,
        ...input,
        currentAmount: 0,
        status: 'active',
      };

      if (input.deadline) {
        goalData.deadline = new Date(input.deadline);
      }

      return await prisma.goal.create({
        data: goalData,
      });
    },

    updateGoal: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.goal.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Goal not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      const updateData: any = { ...input };
      if (input.deadline) {
        updateData.deadline = new Date(input.deadline);
      }
      if (input.status) {
        updateData.status = input.status.toLowerCase();
      }

      const goal = await prisma.goal.update({
        where: { id },
        data: updateData,
      });

      // Publish progress update
      pubsub.publish(GOAL_PROGRESS_UPDATED, { goalProgressUpdated: goal });

      // Check if goal is completed
      if (goal.status === 'completed') {
        pubsub.publish(GOAL_COMPLETED, { goalCompleted: goal });
      }

      return goal;
    },

    deleteGoal: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const goal = await prisma.goal.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!goal) {
        throw new GraphQLError('Goal not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.goal.delete({ where: { id } });

      return true;
    },
  },

  Subscription: {
    goalProgressUpdated: {
      subscribe: () => pubsub.asyncIterator([GOAL_PROGRESS_UPDATED]),
    },
    goalCompleted: {
      subscribe: () => pubsub.asyncIterator([GOAL_COMPLETED]),
    },
  },

  Goal: {
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
    earnings: async (parent: any) => {
      return await prisma.earning.findMany({
        where: { goalId: parent.id },
      });
    },
  },
};
