import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';

// Query to get earnings
const GET_EARNINGS = gql`
  query GetEarnings($filter: EarningsFilterInput) {
    earnings(filter: $filter) {
      earnings {
        id
        platformId
        date
        hours
        amount
        hourlyRate
        notes
        platform {
          id
          name
          color
          category
        }
        createdAt
        updatedAt
      }
      total
      hasMore
    }
  }
`;

// Mutation to create earning
const CREATE_EARNING = gql`
  mutation CreateEarning($input: CreateEarningInput!) {
    createEarning(input: $input) {
      id
      platformId
      date
      hours
      amount
      hourlyRate
      notes
      platform {
        id
        name
        color
      }
    }
  }
`;

// Mutation to update earning
const UPDATE_EARNING = gql`
  mutation UpdateEarning($id: ID!, $input: UpdateEarningInput!) {
    updateEarning(id: $id, input: $input) {
      id
      platformId
      date
      hours
      amount
      hourlyRate
      notes
      platform {
        id
        name
        color
      }
    }
  }
`;

// Mutation to delete earning
const DELETE_EARNING = gql`
  mutation DeleteEarning($id: ID!) {
    deleteEarning(id: $id)
  }
`;

// Subscription for earning created
const EARNING_CREATED = gql`
  subscription OnEarningCreated {
    earningCreated {
      id
      platformId
      date
      hours
      amount
      hourlyRate
      platform {
        id
        name
        color
      }
    }
  }
`;

// Subscription for earning updated
const EARNING_UPDATED = gql`
  subscription OnEarningUpdated {
    earningUpdated {
      id
      platformId
      date
      hours
      amount
      hourlyRate
      platform {
        id
        name
        color
      }
    }
  }
`;

// Custom hook to fetch earnings
export const useEarnings = (filter?: any) => {
  return useQuery(GET_EARNINGS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
};

// Custom hook to create earning
export const useCreateEarning = () => {
  return useMutation(CREATE_EARNING, {
    refetchQueries: [{ query: GET_EARNINGS }],
    awaitRefetchQueries: true,
  });
};

// Custom hook to update earning
export const useUpdateEarning = () => {
  return useMutation(UPDATE_EARNING);
};

// Custom hook to delete earning
export const useDeleteEarning = () => {
  return useMutation(DELETE_EARNING, {
    refetchQueries: [{ query: GET_EARNINGS }],
    awaitRefetchQueries: true,
  });
};

// Custom hook to subscribe to earning created
export const useEarningCreatedSubscription = () => {
  return useSubscription(EARNING_CREATED);
};

// Custom hook to subscribe to earning updated
export const useEarningUpdatedSubscription = () => {
  return useSubscription(EARNING_UPDATED);
};
