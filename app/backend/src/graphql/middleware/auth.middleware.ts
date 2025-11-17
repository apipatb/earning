import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import prisma from '../../lib/prisma';
import { logger } from '../../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface GraphQLContext {
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
  req: any;
  res: any;
}

export const authMiddleware = async ({ req, res }: any): Promise<GraphQLContext> => {
  const context: GraphQLContext = { req, res };

  // Get token from headers
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return context;
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (user) {
      context.user = user;
    }
  } catch (error) {
    // Token is invalid, but don't throw error
    // Let individual resolvers handle authentication requirements
    logger.error('JWT verification failed', error as Error);
  }

  return context;
};

export const requireAuth = (context: GraphQLContext) => {
  if (!context.user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
};

export const requireOwnership = async (
  context: GraphQLContext,
  resourceType: string,
  resourceId: string
) => {
  requireAuth(context);

  const userId = context.user!.id;

  let isOwner = false;

  switch (resourceType) {
    case 'platform':
      const platform = await prisma.platform.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!platform;
      break;
    case 'earning':
      const earning = await prisma.earning.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!earning;
      break;
    case 'invoice':
      const invoice = await prisma.invoice.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!invoice;
      break;
    case 'customer':
      const customer = await prisma.customer.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!customer;
      break;
    case 'product':
      const product = await prisma.product.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!product;
      break;
    case 'expense':
      const expense = await prisma.expense.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!expense;
      break;
    case 'goal':
      const goal = await prisma.goal.findFirst({
        where: { id: resourceId, userId },
      });
      isOwner = !!goal;
      break;
  }

  if (!isOwner) {
    throw new GraphQLError('Forbidden', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
};
