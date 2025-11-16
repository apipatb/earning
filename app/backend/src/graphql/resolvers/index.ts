import { GraphQLScalarType, Kind } from 'graphql';
import { userResolvers } from './user.resolver';
import { platformResolvers } from './platform.resolver';
import { earningResolvers } from './earning.resolver';
import { invoiceResolvers } from './invoice.resolver';
import { customerResolvers } from './customer.resolver';
import { productResolvers } from './product.resolver';
import { saleResolvers } from './sale.resolver';
import { expenseResolvers } from './expense.resolver';
import { goalResolvers } from './goal.resolver';
import { analyticsResolvers } from './analytics.resolver';
import { reportResolvers } from './report.resolver';

// Custom scalar types
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type',
  serialize(value: any) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const DecimalScalar = new GraphQLScalarType({
  name: 'Decimal',
  description: 'Decimal custom scalar type for precise monetary values',
  serialize(value: any) {
    return Number(value);
  },
  parseValue(value: any) {
    return Number(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.FLOAT || ast.kind === Kind.INT) {
      return parseFloat(ast.value);
    }
    return null;
  },
});

// Merge all resolvers
export const resolvers = {
  DateTime: DateTimeScalar,
  Decimal: DecimalScalar,

  Query: {
    ...userResolvers.Query,
    ...platformResolvers.Query,
    ...earningResolvers.Query,
    ...invoiceResolvers.Query,
    ...customerResolvers.Query,
    ...productResolvers.Query,
    ...saleResolvers.Query,
    ...expenseResolvers.Query,
    ...goalResolvers.Query,
    ...analyticsResolvers.Query,
    ...reportResolvers.Query,
  },

  Mutation: {
    ...userResolvers.Mutation,
    ...platformResolvers.Mutation,
    ...earningResolvers.Mutation,
    ...invoiceResolvers.Mutation,
    ...customerResolvers.Mutation,
    ...productResolvers.Mutation,
    ...saleResolvers.Mutation,
    ...expenseResolvers.Mutation,
    ...goalResolvers.Mutation,
    ...reportResolvers.Mutation,
  },

  Subscription: {
    ...earningResolvers.Subscription,
    ...invoiceResolvers.Subscription,
    ...customerResolvers.Subscription,
    ...goalResolvers.Subscription,
  },

  User: userResolvers.User,
  Platform: platformResolvers.Platform,
  Earning: earningResolvers.Earning,
  Invoice: invoiceResolvers.Invoice,
  Customer: customerResolvers.Customer,
  Product: productResolvers.Product,
  Sale: saleResolvers.Sale,
  Expense: expenseResolvers.Expense,
  Goal: goalResolvers.Goal,
};
