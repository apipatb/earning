import { ApolloServer } from 'apollo-server-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { authMiddleware, GraphQLContext } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import { rateLimitMiddleware } from './middleware/rate-limit.middleware';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { Server } from 'http';

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_DEVELOPMENT = NODE_ENV === 'development';

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

export const createApolloServer = () => {
  return new ApolloServer({
    schema,
    context: async ({ req, res }) => {
      const context = await authMiddleware({ req, res });

      // Apply rate limiting for authenticated users
      if (context.user) {
        try {
          rateLimitMiddleware(context.user.id, req.body?.operationName);
        } catch (error) {
          // Rate limit errors will be thrown and handled by Apollo
          throw error;
        }
      }

      return context;
    },
    formatError: errorMiddleware.formatError,
    introspection: IS_DEVELOPMENT,
    csrfPrevention: true,
    cache: 'bounded',
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              // Cleanup if needed
            },
          };
        },
      },
    ],
  });
};

export const setupWebSocketServer = (httpServer: Server) => {
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/api/graphql/subscriptions',
  });

  useServer(
    {
      schema,
      context: async (ctx: any) => {
        // Extract token from connection params
        const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');

        if (token) {
          const context = await authMiddleware({
            req: { headers: { authorization: `Bearer ${token}` } },
            res: {},
          });
          return context;
        }

        return { user: null };
      },
      onConnect: async (ctx: any) => {
        console.log('WebSocket client connected');
      },
      onDisconnect() {
        console.log('WebSocket client disconnected');
      },
    },
    wsServer
  );

  return wsServer;
};
