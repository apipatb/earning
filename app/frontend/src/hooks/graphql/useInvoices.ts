import { useQuery, useMutation, useSubscription, gql } from '@apollo/client';

// Query to get invoices
const GET_INVOICES = gql`
  query GetInvoices($filter: InvoicesFilterInput) {
    invoices(filter: $filter) {
      invoices {
        id
        invoiceNumber
        customerId
        customer {
          id
          name
          email
        }
        subtotal
        taxAmount
        discountAmount
        totalAmount
        invoiceDate
        dueDate
        paidDate
        status
        paymentMethod
        notes
        lineItems {
          id
          description
          quantity
          unitPrice
          totalPrice
        }
        createdAt
        updatedAt
      }
      total
      limit
      offset
    }
  }
`;

// Query to get invoice summary
const GET_INVOICE_SUMMARY = gql`
  query GetInvoiceSummary {
    invoiceSummary {
      totalInvoices
      paid
      pending
      overdue
      totalAmount
      paidAmount
      pendingAmount
    }
  }
`;

// Query to get overdue invoices
const GET_OVERDUE_INVOICES = gql`
  query GetOverdueInvoices {
    overdueInvoices {
      id
      invoiceNumber
      customer {
        id
        name
        email
      }
      totalAmount
      dueDate
      daysOverdue
      status
    }
  }
`;

// Mutation to create invoice
const CREATE_INVOICE = gql`
  mutation CreateInvoice($input: CreateInvoiceInput!) {
    createInvoice(input: $input) {
      id
      invoiceNumber
      customer {
        id
        name
        email
      }
      subtotal
      taxAmount
      discountAmount
      totalAmount
      invoiceDate
      dueDate
      status
      lineItems {
        id
        description
        quantity
        unitPrice
        totalPrice
      }
    }
  }
`;

// Mutation to update invoice
const UPDATE_INVOICE = gql`
  mutation UpdateInvoice($id: ID!, $input: UpdateInvoiceInput!) {
    updateInvoice(id: $id, input: $input) {
      id
      invoiceNumber
      totalAmount
      status
    }
  }
`;

// Mutation to mark invoice as paid
const MARK_INVOICE_PAID = gql`
  mutation MarkInvoicePaid($id: ID!, $paymentMethod: String) {
    markInvoicePaid(id: $id, paymentMethod: $paymentMethod) {
      id
      invoiceNumber
      status
      paidDate
      paymentMethod
    }
  }
`;

// Mutation to delete invoice
const DELETE_INVOICE = gql`
  mutation DeleteInvoice($id: ID!) {
    deleteInvoice(id: $id)
  }
`;

// Subscription for invoice paid
const INVOICE_PAID = gql`
  subscription OnInvoicePaid {
    invoicePaid {
      id
      invoiceNumber
      totalAmount
      paidDate
      customer {
        id
        name
      }
    }
  }
`;

// Custom hook to fetch invoices
export const useInvoices = (filter?: any) => {
  return useQuery(GET_INVOICES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
};

// Custom hook to fetch invoice summary
export const useInvoiceSummary = () => {
  return useQuery(GET_INVOICE_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
};

// Custom hook to fetch overdue invoices
export const useOverdueInvoices = () => {
  return useQuery(GET_OVERDUE_INVOICES, {
    fetchPolicy: 'cache-and-network',
  });
};

// Custom hook to create invoice
export const useCreateInvoice = () => {
  return useMutation(CREATE_INVOICE, {
    refetchQueries: [{ query: GET_INVOICES }, { query: GET_INVOICE_SUMMARY }],
    awaitRefetchQueries: true,
  });
};

// Custom hook to update invoice
export const useUpdateInvoice = () => {
  return useMutation(UPDATE_INVOICE);
};

// Custom hook to mark invoice as paid
export const useMarkInvoicePaid = () => {
  return useMutation(MARK_INVOICE_PAID, {
    refetchQueries: [{ query: GET_INVOICE_SUMMARY }],
  });
};

// Custom hook to delete invoice
export const useDeleteInvoice = () => {
  return useMutation(DELETE_INVOICE, {
    refetchQueries: [{ query: GET_INVOICES }, { query: GET_INVOICE_SUMMARY }],
    awaitRefetchQueries: true,
  });
};

// Custom hook to subscribe to invoice paid
export const useInvoicePaidSubscription = () => {
  return useSubscription(INVOICE_PAID);
};
