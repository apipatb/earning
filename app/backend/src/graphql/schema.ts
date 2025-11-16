import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar DateTime
  scalar Decimal

  type User {
    id: ID!
    email: String!
    name: String
    createdAt: DateTime!
    platforms: [Platform!]!
    earnings: [Earning!]!
    goals: [Goal!]!
    products: [Product!]!
    customers: [Customer!]!
    invoices: [Invoice!]!
    expenses: [Expense!]!
  }

  type Platform {
    id: ID!
    name: String!
    category: String!
    color: String
    userId: String!
    user: User!
    earnings: [Earning!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Earning {
    id: ID!
    platformId: String!
    platform: Platform!
    userId: String!
    user: User!
    date: DateTime!
    hours: Float
    amount: Decimal!
    hourlyRate: Float
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Invoice {
    id: ID!
    invoiceNumber: String!
    customerId: String
    customer: Customer
    userId: String!
    user: User!
    subtotal: Decimal!
    taxAmount: Decimal!
    discountAmount: Decimal!
    totalAmount: Decimal!
    invoiceDate: DateTime!
    dueDate: DateTime!
    paidDate: DateTime
    status: InvoiceStatus!
    paymentMethod: String
    notes: String
    terms: String
    lineItems: [InvoiceLineItem!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type InvoiceLineItem {
    id: ID!
    invoiceId: String!
    description: String!
    quantity: Decimal!
    unitPrice: Decimal!
    totalPrice: Decimal!
    createdAt: DateTime!
  }

  type Customer {
    id: ID!
    name: String!
    email: String
    phone: String
    company: String
    address: String
    city: String
    country: String
    totalPurchases: Decimal!
    totalQuantity: Decimal!
    purchaseCount: Int!
    lastPurchase: DateTime
    averageOrderValue: Float!
    notes: String
    isActive: Boolean!
    userId: String!
    user: User!
    invoices: [Invoice!]!
    sales: [Sale!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Product {
    id: ID!
    name: String!
    description: String
    sku: String
    price: Decimal!
    cost: Decimal
    stockQuantity: Int!
    lowStockThreshold: Int
    categoryId: String
    category: ProductCategory
    userId: String!
    user: User!
    sales: [Sale!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProductCategory {
    id: ID!
    name: String!
    description: String
    userId: String!
    products: [Product!]!
  }

  type Sale {
    id: ID!
    productId: String!
    product: Product!
    customerId: String
    customer: Customer
    quantity: Int!
    unitPrice: Decimal!
    totalPrice: Decimal!
    saleDate: DateTime!
    status: SaleStatus!
    paymentMethod: String
    notes: String
    userId: String!
    user: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Expense {
    id: ID!
    category: String!
    amount: Decimal!
    date: DateTime!
    description: String
    receipt: String
    userId: String!
    user: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Goal {
    id: ID!
    title: String!
    description: String
    targetAmount: Decimal!
    currentAmount: Decimal!
    deadline: DateTime
    status: GoalStatus!
    userId: String!
    user: User!
    earnings: [Earning!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Report {
    id: ID!
    name: String!
    type: String!
    format: String!
    data: String
    generatedAt: DateTime!
    userId: String!
  }

  # Analytics Types
  type AnalyticsSummary {
    period: String!
    startDate: DateTime!
    endDate: DateTime!
    totalEarnings: Decimal!
    totalHours: Float!
    avgHourlyRate: Float!
    byPlatform: [PlatformBreakdown!]!
    dailyBreakdown: [DailyBreakdown!]!
  }

  type PlatformBreakdown {
    platform: Platform!
    earnings: Decimal!
    hours: Float!
    hourlyRate: Float!
    percentage: Float!
  }

  type DailyBreakdown {
    date: DateTime!
    earnings: Decimal!
    hours: Float!
  }

  type InvoiceSummary {
    totalInvoices: Int!
    paid: Int!
    pending: Int!
    overdue: Int!
    totalAmount: Decimal!
    paidAmount: Decimal!
    pendingAmount: Decimal!
  }

  type OverdueInvoice {
    id: ID!
    invoiceNumber: String!
    customer: Customer
    totalAmount: Decimal!
    dueDate: DateTime!
    daysOverdue: Int!
    status: InvoiceStatus!
  }

  # Pagination Types
  type EarningsConnection {
    earnings: [Earning!]!
    total: Int!
    hasMore: Boolean!
  }

  type InvoicesConnection {
    invoices: [Invoice!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  type CustomersConnection {
    customers: [Customer!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  type ProductsConnection {
    products: [Product!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  # Enums
  enum InvoiceStatus {
    DRAFT
    SENT
    VIEWED
    PAID
    OVERDUE
    CANCELLED
  }

  enum SaleStatus {
    COMPLETED
    PENDING
    CANCELLED
  }

  enum GoalStatus {
    ACTIVE
    COMPLETED
    CANCELLED
  }

  enum PlatformCategory {
    FREELANCE
    DELIVERY
    SERVICES
    OTHER
  }

  enum ReportFormat {
    PDF
    CSV
    EXCEL
  }

  # Input Types
  input CreateUserInput {
    email: String!
    password: String!
    name: String
  }

  input UpdateUserInput {
    email: String
    name: String
    password: String
  }

  input CreatePlatformInput {
    name: String!
    category: String!
    color: String
  }

  input UpdatePlatformInput {
    name: String
    category: String
    color: String
  }

  input CreateEarningInput {
    platformId: ID!
    date: DateTime!
    hours: Float
    amount: Decimal!
    notes: String
  }

  input UpdateEarningInput {
    platformId: ID
    date: DateTime
    hours: Float
    amount: Decimal
    notes: String
  }

  input CreateInvoiceInput {
    customerId: ID
    invoiceNumber: String!
    subtotal: Decimal!
    taxAmount: Decimal
    discountAmount: Decimal
    totalAmount: Decimal!
    invoiceDate: DateTime!
    dueDate: DateTime!
    status: InvoiceStatus
    paymentMethod: String
    notes: String
    terms: String
    lineItems: [InvoiceLineItemInput!]!
  }

  input UpdateInvoiceInput {
    customerId: ID
    invoiceNumber: String
    subtotal: Decimal
    taxAmount: Decimal
    discountAmount: Decimal
    totalAmount: Decimal
    invoiceDate: DateTime
    dueDate: DateTime
    status: InvoiceStatus
    paymentMethod: String
    notes: String
    terms: String
    lineItems: [InvoiceLineItemInput!]
  }

  input InvoiceLineItemInput {
    description: String!
    quantity: Decimal!
    unitPrice: Decimal!
    totalPrice: Decimal!
  }

  input CreateCustomerInput {
    name: String!
    email: String
    phone: String
    company: String
    address: String
    city: String
    country: String
    notes: String
  }

  input UpdateCustomerInput {
    name: String
    email: String
    phone: String
    company: String
    address: String
    city: String
    country: String
    notes: String
    isActive: Boolean
  }

  input CreateProductInput {
    name: String!
    description: String
    sku: String
    price: Decimal!
    cost: Decimal
    stockQuantity: Int!
    lowStockThreshold: Int
    categoryId: ID
  }

  input UpdateProductInput {
    name: String
    description: String
    sku: String
    price: Decimal
    cost: Decimal
    stockQuantity: Int
    lowStockThreshold: Int
    categoryId: ID
  }

  input CreateSaleInput {
    productId: ID!
    customerId: ID
    quantity: Int!
    unitPrice: Decimal!
    totalPrice: Decimal!
    saleDate: DateTime!
    status: SaleStatus
    paymentMethod: String
    notes: String
  }

  input CreateExpenseInput {
    category: String!
    amount: Decimal!
    date: DateTime!
    description: String
    receipt: String
  }

  input UpdateExpenseInput {
    category: String
    amount: Decimal
    date: DateTime
    description: String
    receipt: String
  }

  input CreateGoalInput {
    title: String!
    description: String
    targetAmount: Decimal!
    deadline: DateTime
  }

  input UpdateGoalInput {
    title: String
    description: String
    targetAmount: Decimal
    deadline: DateTime
    status: GoalStatus
  }

  input GenerateReportInput {
    name: String!
    type: String!
    format: ReportFormat!
    startDate: DateTime
    endDate: DateTime
    filters: String
  }

  # Filter Inputs
  input EarningsFilterInput {
    startDate: DateTime
    endDate: DateTime
    platformId: ID
    limit: Int
    offset: Int
  }

  input InvoicesFilterInput {
    startDate: DateTime
    endDate: DateTime
    status: InvoiceStatus
    customerId: ID
    limit: Int
    offset: Int
  }

  input CustomersFilterInput {
    isActive: Boolean
    search: String
    sortBy: String
    limit: Int
    offset: Int
  }

  input ProductsFilterInput {
    categoryId: ID
    lowStock: Boolean
    search: String
    limit: Int
    offset: Int
  }

  input AnalyticsFilterInput {
    period: String
    startDate: DateTime
    endDate: DateTime
  }

  # Queries
  type Query {
    # User queries
    me: User
    user(id: ID!): User

    # Platform queries
    platforms: [Platform!]!
    platform(id: ID!): Platform

    # Earning queries
    earnings(filter: EarningsFilterInput): EarningsConnection!
    earning(id: ID!): Earning

    # Invoice queries
    invoices(filter: InvoicesFilterInput): InvoicesConnection!
    invoice(id: ID!): Invoice
    invoiceSummary: InvoiceSummary!
    overdueInvoices: [OverdueInvoice!]!

    # Customer queries
    customers(filter: CustomersFilterInput): CustomersConnection!
    customer(id: ID!): Customer
    topCustomers(limit: Int): [Customer!]!

    # Product queries
    products(filter: ProductsFilterInput): ProductsConnection!
    product(id: ID!): Product

    # Sale queries
    sales(limit: Int, offset: Int): [Sale!]!
    sale(id: ID!): Sale

    # Expense queries
    expenses(startDate: DateTime, endDate: DateTime, category: String, limit: Int, offset: Int): [Expense!]!
    expense(id: ID!): Expense

    # Goal queries
    goals(status: GoalStatus): [Goal!]!
    goal(id: ID!): Goal

    # Analytics queries
    analyticsSummary(filter: AnalyticsFilterInput): AnalyticsSummary!

    # Report queries
    reports: [Report!]!
    report(id: ID!): Report
  }

  # Mutations
  type Mutation {
    # User mutations
    register(input: CreateUserInput!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    updateUser(input: UpdateUserInput!): User!
    deleteUser: Boolean!

    # Platform mutations
    createPlatform(input: CreatePlatformInput!): Platform!
    updatePlatform(id: ID!, input: UpdatePlatformInput!): Platform!
    deletePlatform(id: ID!): Boolean!

    # Earning mutations
    createEarning(input: CreateEarningInput!): Earning!
    updateEarning(id: ID!, input: UpdateEarningInput!): Earning!
    deleteEarning(id: ID!): Boolean!

    # Invoice mutations
    createInvoice(input: CreateInvoiceInput!): Invoice!
    updateInvoice(id: ID!, input: UpdateInvoiceInput!): Invoice!
    markInvoicePaid(id: ID!, paymentMethod: String): Invoice!
    deleteInvoice(id: ID!): Boolean!

    # Customer mutations
    createCustomer(input: CreateCustomerInput!): Customer!
    updateCustomer(id: ID!, input: UpdateCustomerInput!): Customer!
    deleteCustomer(id: ID!): Boolean!

    # Product mutations
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    # Sale mutations
    createSale(input: CreateSaleInput!): Sale!
    updateSale(id: ID!, status: SaleStatus!): Sale!
    deleteSale(id: ID!): Boolean!

    # Expense mutations
    createExpense(input: CreateExpenseInput!): Expense!
    updateExpense(id: ID!, input: UpdateExpenseInput!): Expense!
    deleteExpense(id: ID!): Boolean!

    # Goal mutations
    createGoal(input: CreateGoalInput!): Goal!
    updateGoal(id: ID!, input: UpdateGoalInput!): Goal!
    deleteGoal(id: ID!): Boolean!

    # Report mutations
    generateReport(input: GenerateReportInput!): Report!
  }

  # Subscriptions
  type Subscription {
    # Earning subscriptions
    earningCreated: Earning!
    earningUpdated: Earning!
    earningDeleted: ID!

    # Invoice subscriptions
    invoiceCreated: Invoice!
    invoiceUpdated: Invoice!
    invoicePaid: Invoice!
    invoiceOverdue: Invoice!

    # Customer subscriptions
    customerCreated: Customer!
    customerUpdated: Customer!

    # Goal subscriptions
    goalProgressUpdated: Goal!
    goalCompleted: Goal!
  }

  # Auth payload
  type AuthPayload {
    token: String!
    user: User!
  }
`;
