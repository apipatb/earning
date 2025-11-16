import { ApolloClient, InMemoryCache, HttpLink, split, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GRAPHQL_ENDPOINT = `${API_URL}/api/graphql`;
const WS_ENDPOINT = `${API_URL.replace('http', 'ws')}/api/graphql/subscriptions`;

// HTTP connection to the API
const httpLink = new HttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: 'include',
});

// WebSocket connection for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: WS_ENDPOINT,
    connectionParams: () => {
      const token = localStorage.getItem('token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    shouldRetry: () => true,
    retryAttempts: 5,
    retryWait: (retries) => {
      return new Promise((resolve) => {
        setTimeout(resolve, Math.min(1000 * 2 ** retries, 30000));
      });
    },
  })
);

// Authentication link to add JWT token to requests
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Error handling link
const errorLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((response) => {
    if (response.errors) {
      response.errors.forEach((error) => {
        console.error(`[GraphQL error]: ${error.message}`, error);

        // Handle authentication errors
        if (error.extensions?.code === 'UNAUTHENTICATED') {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      });
    }
    return response;
  });
});

// Split links based on operation type
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

// Create Apollo Client instance
export const apolloClient = new ApolloClient({
  link: errorLink.concat(splitLink),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          earnings: {
            // Handle pagination for earnings
            keyArgs: ['filter', ['platformId']],
            merge(existing = { earnings: [], total: 0 }, incoming) {
              return {
                ...incoming,
                earnings: [...existing.earnings, ...incoming.earnings],
              };
            },
          },
          invoices: {
            // Handle pagination for invoices
            keyArgs: ['filter', ['status', 'customerId']],
            merge(existing = { invoices: [], total: 0 }, incoming) {
              return {
                ...incoming,
                invoices: [...existing.invoices, ...incoming.invoices],
              };
            },
          },
          customers: {
            // Handle pagination for customers
            keyArgs: ['filter', ['isActive', 'search']],
            merge(existing = { customers: [], total: 0 }, incoming) {
              return {
                ...incoming,
                customers: [...existing.customers, ...incoming.customers],
              };
            },
          },
          products: {
            // Handle pagination for products
            keyArgs: ['filter', ['categoryId', 'lowStock']],
            merge(existing = { products: [], total: 0 }, incoming) {
              return {
                ...incoming,
                products: [...existing.products, ...incoming.products],
              };
            },
          },
        },
      },
      Earning: {
        fields: {
          amount: {
            // Ensure amounts are always numbers
            read(amount) {
              return typeof amount === 'number' ? amount : parseFloat(amount);
            },
          },
        },
      },
      Invoice: {
        fields: {
          totalAmount: {
            read(amount) {
              return typeof amount === 'number' ? amount : parseFloat(amount);
            },
          },
          subtotal: {
            read(amount) {
              return typeof amount === 'number' ? amount : parseFloat(amount);
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper function to clear cache
export const clearApolloCache = () => {
  apolloClient.clearStore();
};

// Helper function to refetch all queries
export const refetchAllQueries = () => {
  apolloClient.refetchQueries({ include: 'all' });
};
