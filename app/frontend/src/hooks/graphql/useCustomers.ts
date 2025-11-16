import { useQuery, useMutation, gql } from '@apollo/client';

// Query to get customers
const GET_CUSTOMERS = gql`
  query GetCustomers($filter: CustomersFilterInput) {
    customers(filter: $filter) {
      customers {
        id
        name
        email
        phone
        company
        address
        city
        country
        totalPurchases
        totalQuantity
        purchaseCount
        lastPurchase
        averageOrderValue
        notes
        isActive
        createdAt
        updatedAt
      }
      total
      limit
      offset
    }
  }
`;

// Query to get top customers
const GET_TOP_CUSTOMERS = gql`
  query GetTopCustomers($limit: Int) {
    topCustomers(limit: $limit) {
      id
      name
      email
      totalPurchases
      purchaseCount
      averageOrderValue
      lastPurchase
    }
  }
`;

// Query to get single customer
const GET_CUSTOMER = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      name
      email
      phone
      company
      address
      city
      country
      totalPurchases
      totalQuantity
      purchaseCount
      lastPurchase
      averageOrderValue
      notes
      isActive
      invoices {
        id
        invoiceNumber
        totalAmount
        status
        invoiceDate
      }
      sales {
        id
        quantity
        totalPrice
        saleDate
        product {
          name
        }
      }
    }
  }
`;

// Mutation to create customer
const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      email
      phone
      company
      isActive
    }
  }
`;

// Mutation to update customer
const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      name
      email
      phone
      company
      isActive
    }
  }
`;

// Mutation to delete customer
const DELETE_CUSTOMER = gql`
  mutation DeleteCustomer($id: ID!) {
    deleteCustomer(id: $id)
  }
`;

// Custom hook to fetch customers
export const useCustomers = (filter?: any) => {
  return useQuery(GET_CUSTOMERS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
};

// Custom hook to fetch top customers
export const useTopCustomers = (limit?: number) => {
  return useQuery(GET_TOP_CUSTOMERS, {
    variables: { limit },
    fetchPolicy: 'cache-and-network',
  });
};

// Custom hook to fetch single customer
export const useCustomer = (id: string) => {
  return useQuery(GET_CUSTOMER, {
    variables: { id },
    skip: !id,
  });
};

// Custom hook to create customer
export const useCreateCustomer = () => {
  return useMutation(CREATE_CUSTOMER, {
    refetchQueries: [{ query: GET_CUSTOMERS }],
    awaitRefetchQueries: true,
  });
};

// Custom hook to update customer
export const useUpdateCustomer = () => {
  return useMutation(UPDATE_CUSTOMER);
};

// Custom hook to delete customer
export const useDeleteCustomer = () => {
  return useMutation(DELETE_CUSTOMER, {
    refetchQueries: [{ query: GET_CUSTOMERS }],
    awaitRefetchQueries: true,
  });
};
