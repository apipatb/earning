/**
 * Jest setup file for backend tests
 * Initializes test environment and mocks
 *
 * NOTE: This file sets up MOCKED Prisma client for unit tests.
 * Integration tests should use integration-setup.ts instead.
 */

import { setupTestDatabase, teardownTestDatabase } from './integration-setup';

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/earning_test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only';
process.env.NODE_ENV = 'test';
process.env.API_PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Extend Jest timeout for database operations
jest.setTimeout(30000); // Increased for integration tests

// Check if this is an integration test
const isIntegrationTest = process.env.TEST_MODE === 'integration' ||
                          expect.getState().testPath?.includes('integration');

// Only mock Prisma for unit tests, not integration tests
if (!isIntegrationTest) {
  // Mock Prisma client for unit tests
  jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      earning: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      expense: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      customer: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      product: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      platform: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      sale: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      ticket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      apiQuota: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      role: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permission: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userRole: {
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      rolePermission: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaClient)),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn(),
    };

    return {
      PrismaClient: jest.fn(() => mockPrismaClient),
    };
  });
}

// Global setup for integration tests
if (isIntegrationTest) {
  beforeAll(async () => {
    try {
      await setupTestDatabase();
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await teardownTestDatabase();
    } catch (error) {
      console.error('Failed to teardown test database:', error);
    }
  });
}

// Cleanup after each test
afterEach(() => {
  if (!isIntegrationTest) {
    jest.clearAllMocks();
  }
});
