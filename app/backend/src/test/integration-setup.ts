/**
 * Integration Test Setup
 * Real database connection for integration tests
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as crypto from 'crypto';

// Create a unique test database for this test run
const TEST_DB_SCHEMA = `test_${crypto.randomBytes(8).toString('hex')}`;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/earning_test';

// Parse base URL and create schema-specific URL
function getTestDatabaseUrl(): string {
  const url = new URL(DATABASE_URL);
  // Add schema parameter for PostgreSQL
  url.searchParams.set('schema', TEST_DB_SCHEMA);
  return url.toString();
}

// Global test database client
let testPrisma: PrismaClient | null = null;

/**
 * Get or create test database client
 */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: getTestDatabaseUrl(),
        },
      },
      log: process.env.DEBUG_TESTS === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return testPrisma;
}

/**
 * Setup test database schema
 * Creates a fresh schema for each test run
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    console.log(`Setting up test database schema: ${TEST_DB_SCHEMA}`);

    // Create the schema
    const prisma = getTestPrismaClient();
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${TEST_DB_SCHEMA}"`);

    // Run migrations on the test schema
    const testDbUrl = getTestDatabaseUrl();
    process.env.DATABASE_URL = testDbUrl;

    try {
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'pipe',
      });
    } catch (error) {
      // If migrations fail, try pushing the schema
      console.log('Migration failed, trying db push...');
      execSync('npx prisma db push --skip-generate', {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'pipe',
      });
    }

    console.log('Test database setup complete');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Teardown test database schema
 * Drops the entire schema after tests complete
 */
export async function teardownTestDatabase(): Promise<void> {
  try {
    if (testPrisma) {
      console.log(`Tearing down test database schema: ${TEST_DB_SCHEMA}`);

      // Drop the schema
      await testPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_DB_SCHEMA}" CASCADE`);

      // Disconnect
      await testPrisma.$disconnect();
      testPrisma = null;

      console.log('Test database teardown complete');
    }
  } catch (error) {
    console.error('Failed to teardown test database:', error);
    throw error;
  }
}

/**
 * Clean all data from database tables
 * Useful for cleaning between tests while keeping schema
 */
export async function cleanDatabase(): Promise<void> {
  const prisma = getTestPrismaClient();

  try {
    // Clean in correct order to respect foreign key constraints
    // Start with dependent tables first

    // Customer service and support
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."message_sentiment" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."suggested_reply" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."ticket_message" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."ticket_assignment_history" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."ticket_portal_access" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."support_ticket" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."ticket" CASCADE`;

    // Live chat
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."live_chat_message" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."live_chat_session" CASCADE`;

    // Knowledge base
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."article_view" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."article_feedback" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."knowledge_base_article" CASCADE`;

    // API and quotas
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."api_usage" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."api_quota" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."webhook_delivery" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."webhook" CASCADE`;

    // Roles and permissions
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."user_role" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."role_permission" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."permission" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."role" CASCADE`;

    // Business entities
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."sale" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."invoice_item" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."invoice_payment" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."invoice" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."product" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."customer" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."expense" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."earning" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."goal" CASCADE`;
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."platform" CASCADE`;

    // Users (base table)
    await prisma.$executeRaw`TRUNCATE TABLE "${TEST_DB_SCHEMA}"."user" CASCADE`;

  } catch (error) {
    console.error('Failed to clean database:', error);
    throw error;
  }
}

/**
 * Execute in transaction for test isolation
 * Automatically rolls back after test completes
 */
export async function withTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const prisma = getTestPrismaClient();

  return await prisma.$transaction(async (tx) => {
    return await callback(tx as PrismaClient);
  });
}

/**
 * Clean up between tests
 */
export async function cleanupAfterTest(): Promise<void> {
  const prisma = getTestPrismaClient();

  // Clean all data
  await cleanDatabase();

  // Reset any connection state
  await prisma.$disconnect();
  await prisma.$connect();
}
