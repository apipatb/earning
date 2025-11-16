import express from 'express';
import cors from 'cors';
import request from 'supertest';
import http from 'http';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });
dotenv.config(); // Fallback to .env

// Lazy load prisma to avoid initialization issues in test environments
let prisma: any = null;

const getPrisma = () => {
  if (!prisma) {
    prisma = require('../../lib/prisma').default;
  }
  return prisma;
};

/**
 * Test database setup and cleanup utilities
 */
export class TestSetup {
  static app: express.Application;
  static server: http.Server;
  static useMockDatabase = process.env.USE_MOCK_DATABASE === 'true';

  /**
   * Initialize the Express app and server for testing
   */
  static initializeApp() {
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Import routes
    const authRoutes = require('../../routes/auth.routes').default;
    const earningRoutes = require('../../routes/earning.routes').default;
    const invoiceRoutes = require('../../routes/invoice.routes').default;
    const customerRoutes = require('../../routes/customer.routes').default;
    const platformRoutes = require('../../routes/platform.routes').default;

    // Register routes
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/earnings', earningRoutes);
    app.use('/api/v1/invoices', invoiceRoutes);
    app.use('/api/v1/customers', customerRoutes);
    app.use('/api/v1/platforms', platformRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    this.app = app;
    this.server = http.createServer(app);
    return this.server;
  }

  /**
   * Clean all database tables
   */
  static async cleanDatabase() {
    if (this.useMockDatabase) {
      // No database cleanup needed for mock mode
      return;
    }

    try {
      const prisma = getPrisma();

      // Delete all data in reverse order of dependencies
      await prisma.invoiceLineItem.deleteMany({});
      await prisma.invoice.deleteMany({});
      await prisma.expense.deleteMany({});
      await prisma.sale.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.inventoryLog.deleteMany({});
      await prisma.customer.deleteMany({});
      await prisma.earning.deleteMany({});
      await prisma.goal.deleteMany({});
      await prisma.platform.deleteMany({});
      await prisma.user.deleteMany({});
    } catch (error) {
      console.error('Error cleaning database:', error);
      throw error;
    }
  }

  /**
   * Reset database sequences (if needed for some databases)
   */
  static async resetDatabase() {
    await this.cleanDatabase();
    // Additional reset logic can be added here if needed
  }

  /**
   * Disconnect from database
   */
  static async disconnect() {
    if (this.useMockDatabase) {
      return;
    }

    try {
      const prisma = getPrisma();
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Create a test user and return token
   */
  static async createTestUser(
    email = 'test@example.com',
    password = 'TestPassword123!',
    name = 'Test User'
  ) {
    const { hashPassword } = await import('../../utils/password');
    const { generateToken } = await import('../../utils/jwt');

    if (this.useMockDatabase) {
      const mockUser = {
        id: `user-${Math.random().toString(36).substr(2, 9)}`,
        email,
        name,
        createdAt: new Date(),
      };
      const token = generateToken(mockUser.id, mockUser.email);
      return { user: mockUser, token, password };
    }

    const passwordHash = await hashPassword(password);
    const prisma = getPrisma();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    const token = generateToken(user.id, user.email);

    return { user, token, password };
  }

  /**
   * Create a test platform
   */
  static async createTestPlatform(
    userId: string,
    name = 'Test Platform',
    category = 'freelance'
  ) {
    if (this.useMockDatabase) {
      return {
        id: `platform-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        name,
        category,
        color: '#FF5733',
        isActive: true,
        createdAt: new Date(),
      };
    }

    const prisma = getPrisma();
    return prisma.platform.create({
      data: {
        userId,
        name,
        category,
        color: '#FF5733',
        isActive: true,
      },
    });
  }

  /**
   * Create a test customer
   */
  static async createTestCustomer(
    userId: string,
    name = 'Test Customer',
    email = 'customer@example.com'
  ) {
    if (this.useMockDatabase) {
      return {
        id: `customer-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        name,
        email,
        phone: '+1234567890',
        address: '123 Test St',
        createdAt: new Date(),
      };
    }

    const prisma = getPrisma();
    return prisma.customer.create({
      data: {
        userId,
        name,
        email,
        phone: '+1234567890',
        address: '123 Test St',
      },
    });
  }

  /**
   * Create a test earning
   */
  static async createTestEarning(
    userId: string,
    platformId: string,
    amount = 100,
    date = new Date()
  ) {
    if (this.useMockDatabase) {
      return {
        id: `earning-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        platformId,
        amount,
        date,
        hours: 2,
        notes: 'Test earning',
        createdAt: new Date(),
      };
    }

    const prisma = getPrisma();
    return prisma.earning.create({
      data: {
        userId,
        platformId,
        amount,
        date,
        hours: 2,
        notes: 'Test earning',
      },
    });
  }
}

/**
 * Global test setup and teardown
 */
export async function setupIntegrationTests() {
  TestSetup.initializeApp();
  // Can add additional global setup here
}

export async function teardownIntegrationTests() {
  if (TestSetup.server) {
    TestSetup.server.close();
  }
  await TestSetup.disconnect();
}
