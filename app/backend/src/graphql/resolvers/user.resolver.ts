import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { GraphQLError } from 'graphql';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const userResolvers = {
  Query: {
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return await prisma.user.findUnique({
        where: { id: context.user.id },
      });
    },

    user: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Users can only query their own data
      if (context.user.id !== id) {
        throw new GraphQLError('Forbidden', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return await prisma.user.findUnique({
        where: { id },
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: any) => {
      const { email, password, name } = input;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new GraphQLError('User already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        token,
        user,
      };
    },

    login: async (_: any, { email, password }: any) => {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        token,
        user,
      };
    },

    updateUser: async (_: any, { input }: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const updateData: any = {};

      if (input.email) updateData.email = input.email;
      if (input.name) updateData.name = input.name;
      if (input.password) {
        updateData.password = await bcrypt.hash(input.password, 10);
      }

      return await prisma.user.update({
        where: { id: context.user.id },
        data: updateData,
      });
    },

    deleteUser: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      await prisma.user.delete({
        where: { id: context.user.id },
      });

      return true;
    },
  },

  User: {
    platforms: async (parent: any) => {
      return await prisma.platform.findMany({
        where: { userId: parent.id },
      });
    },

    earnings: async (parent: any) => {
      return await prisma.earning.findMany({
        where: { userId: parent.id },
        orderBy: { date: 'desc' },
      });
    },

    goals: async (parent: any) => {
      return await prisma.goal.findMany({
        where: { userId: parent.id },
      });
    },

    products: async (parent: any) => {
      return await prisma.product.findMany({
        where: { userId: parent.id },
      });
    },

    customers: async (parent: any) => {
      return await prisma.customer.findMany({
        where: { userId: parent.id },
      });
    },

    invoices: async (parent: any) => {
      return await prisma.invoice.findMany({
        where: { userId: parent.id },
      });
    },

    expenses: async (parent: any) => {
      return await prisma.expense.findMany({
        where: { userId: parent.id },
      });
    },
  },
};
