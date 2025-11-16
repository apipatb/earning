import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

export const platformResolvers = {
  Query: {
    platforms: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return await prisma.platform.findMany({
        where: { userId: context.user.id },
        orderBy: { name: 'asc' },
      });
    },

    platform: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const platform = await prisma.platform.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!platform) {
        throw new GraphQLError('Platform not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return platform;
    },
  },

  Mutation: {
    createPlatform: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return await prisma.platform.create({
        data: {
          userId: context.user.id,
          ...input,
        },
      });
    },

    updatePlatform: async (_: any, { id, input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const existing = await prisma.platform.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!existing) {
        throw new GraphQLError('Platform not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return await prisma.platform.update({
        where: { id },
        data: input,
      });
    },

    deletePlatform: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const platform = await prisma.platform.findFirst({
        where: { id, userId: context.user.id },
      });

      if (!platform) {
        throw new GraphQLError('Platform not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await prisma.platform.delete({ where: { id } });

      return true;
    },
  },

  Platform: {
    user: async (parent: any) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
    earnings: async (parent: any) => {
      return await prisma.earning.findMany({
        where: { platformId: parent.id },
        orderBy: { date: 'desc' },
      });
    },
  },
};
