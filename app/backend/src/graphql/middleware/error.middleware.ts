import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

export const formatError = (error: any) => {
  // Log error for monitoring
  logger.error('GraphQL Error:', {
    message: error.message,
    path: error.path,
    extensions: error.extensions,
  });

  // Don't expose internal server errors to clients
  if (error.extensions?.code === 'INTERNAL_SERVER_ERROR') {
    return new GraphQLError('An internal server error occurred', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
  }

  // Return original error for other cases
  return error;
};

export const errorMiddleware = {
  formatError,
};
