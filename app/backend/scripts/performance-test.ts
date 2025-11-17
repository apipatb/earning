/**
 * Performance Testing Script
 *
 * This script generates test data and measures performance of key endpoints
 * Run with: npx ts-node scripts/performance-test.ts
 */

import prisma from '../src/lib/prisma';
import { logger } from '../src/utils/logger';
import { measureQueryTime, getMemoryStats } from '../src/utils/performance';

// Configuration
const TEST_CONFIG = {
  USERS_COUNT: 5,
  PRODUCTS_PER_USER: 100,
  CUSTOMERS_PER_USER: 200,
  SALES_PER_USER: 1000,
  INVOICES_PER_USER: 500,
  EXPENSES_PER_USER: 500,
  PLATFORMS_PER_USER: 5,
  EARNINGS_PER_PLATFORM: 200,
};

interface PerformanceResult {
  operation: string;
  duration: number;
  recordCount: number;
  avgPerRecord: number;
  memoryBefore: any;
  memoryAfter: any;
}

const results: PerformanceResult[] = [];

/**
 * Create test user
 */
async function createTestUser(index: number) {
  return prisma.user.create({
    data: {
      email: `perftest${index}@test.com`,
      passwordHash: 'test-hash-' + Math.random(),
      name: `Performance Test User ${index}`,
      currency: 'USD',
      timezone: 'UTC',
    },
  });
}

/**
 * Generate test data
 */
async function generateTestData() {
  logger.info('Starting test data generation...');

  // Clean up existing test data
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'perftest' } },
  });

  for (let i = 0; i < TEST_CONFIG.USERS_COUNT; i++) {
    const user = await createTestUser(i);
    logger.info(`Created test user ${i + 1}/${TEST_CONFIG.USERS_COUNT}: ${user.email}`);

    // Create platforms
    const platforms = [];
    for (let p = 0; p < TEST_CONFIG.PLATFORMS_PER_USER; p++) {
      const platform = await prisma.platform.create({
        data: {
          userId: user.id,
          name: `Platform ${p}`,
          category: ['freelance', 'delivery', 'services', 'other'][p % 4] as any,
          expectedRate: 50 + Math.random() * 100,
        },
      });
      platforms.push(platform);

      // Create earnings for platform
      const earningData = [];
      for (let e = 0; e < TEST_CONFIG.EARNINGS_PER_PLATFORM; e++) {
        const date = new Date();
        date.setDate(date.getDate() - e);
        earningData.push({
          userId: user.id,
          platformId: platform.id,
          date,
          amount: 50 + Math.random() * 200,
          hours: 1 + Math.random() * 8,
        });
      }
      await prisma.earning.createMany({ data: earningData });
    }

    // Create products
    const productData = [];
    for (let p = 0; p < TEST_CONFIG.PRODUCTS_PER_USER; p++) {
      productData.push({
        userId: user.id,
        name: `Product ${p}`,
        price: 10 + Math.random() * 100,
        quantity: 100,
        category: `Category ${p % 10}`,
      });
    }
    await prisma.product.createMany({ data: productData });
    const products = await prisma.product.findMany({ where: { userId: user.id } });

    // Create customers
    const customerData = [];
    for (let c = 0; c < TEST_CONFIG.CUSTOMERS_PER_USER; c++) {
      customerData.push({
        userId: user.id,
        name: `Customer ${c}`,
        email: `customer${c}@test.com`,
        phone: `+1234567890${c}`,
      });
    }
    await prisma.customer.createMany({ data: customerData });
    const customers = await prisma.customer.findMany({ where: { userId: user.id } });

    // Create sales
    const salesData = [];
    for (let s = 0; s < TEST_CONFIG.SALES_PER_USER; s++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = 1 + Math.floor(Math.random() * 10);
      const unitPrice = Number(product.price);
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(s / 10));

      salesData.push({
        userId: user.id,
        productId: product.id,
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice,
        saleDate: date,
        status: 'COMPLETED',
      });
    }
    await prisma.sale.createMany({ data: salesData });

    // Create invoices
    const invoiceData = [];
    for (let inv = 0; inv < TEST_CONFIG.INVOICES_PER_USER; inv++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const subtotal = 100 + Math.random() * 1000;
      const taxAmount = subtotal * 0.1;
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(inv / 5));
      const dueDate = new Date(date);
      dueDate.setDate(dueDate.getDate() + 30);

      const invoice = await prisma.invoice.create({
        data: {
          userId: user.id,
          customerId: customer.id,
          invoiceNumber: `INV-${i}-${inv}`,
          subtotal,
          taxAmount,
          totalAmount: subtotal + taxAmount,
          invoiceDate: date,
          dueDate,
          status: ['DRAFT', 'SENT', 'PAID', 'OVERDUE'][Math.floor(Math.random() * 4)] as any,
        },
      });

      // Add line items
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          description: `Service ${inv}`,
          quantity: 1,
          unitPrice: subtotal,
          totalPrice: subtotal,
        },
      });
    }

    // Create expenses
    const expenseData = [];
    for (let e = 0; e < TEST_CONFIG.EXPENSES_PER_USER; e++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(e / 5));

      expenseData.push({
        userId: user.id,
        category: ['Office', 'Travel', 'Marketing', 'Software', 'Other'][e % 5],
        description: `Expense ${e}`,
        amount: 10 + Math.random() * 500,
        expenseDate: date,
        isTaxDeductible: Math.random() > 0.5,
      });
    }
    await prisma.expense.createMany({ data: expenseData });

    logger.info(`Completed data generation for user ${i + 1}/${TEST_CONFIG.USERS_COUNT}`);
  }

  logger.info('Test data generation complete!');
}

/**
 * Test performance of a query
 */
async function testPerformance(
  operation: string,
  fn: () => Promise<any>,
  recordCount: number
) {
  const memoryBefore = getMemoryStats();

  const duration = await measureQueryTime(operation, fn, 0);

  const memoryAfter = getMemoryStats();

  const result: PerformanceResult = {
    operation,
    duration,
    recordCount,
    avgPerRecord: duration / recordCount,
    memoryBefore,
    memoryAfter,
  };

  results.push(result);
  logger.info(`${operation}: ${duration}ms (${recordCount} records, ${result.avgPerRecord.toFixed(2)}ms/record)`);

  return result;
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  logger.info('Starting performance tests...');

  const testUser = await prisma.user.findFirst({
    where: { email: { startsWith: 'perftest' } },
  });

  if (!testUser) {
    throw new Error('No test user found. Run data generation first.');
  }

  // Test 1: Get all products with stats
  await testPerformance(
    'Get All Products (with sales stats)',
    async () => {
      const products = await prisma.product.findMany({
        where: { userId: testUser.id },
        take: 50,
      });

      // Simulate the N+1 pattern (before optimization)
      const productsWithStats = await Promise.all(
        products.map(async (product) => {
          const salesStats = await prisma.sale.aggregate({
            where: { productId: product.id },
            _count: true,
            _sum: {
              totalAmount: true,
              quantity: true,
            },
          });

          return {
            ...product,
            stats: salesStats,
          };
        })
      );

      return productsWithStats;
    },
    50
  );

  // Test 2: Get all customers (paginated)
  await testPerformance(
    'Get All Customers (paginated)',
    async () => {
      return prisma.customer.findMany({
        where: { userId: testUser.id },
        orderBy: { totalPurchases: 'desc' },
        take: 100,
      });
    },
    100
  );

  // Test 3: Get sales summary
  await testPerformance(
    'Get Sales Summary (aggregated)',
    async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      return prisma.sale.aggregate({
        where: {
          userId: testUser.id,
          saleDate: { gte: startDate },
        },
        _count: true,
        _sum: {
          totalAmount: true,
          quantity: true,
        },
      });
    },
    1
  );

  // Test 4: Get invoice summary
  await testPerformance(
    'Get Invoice Summary (multiple aggregations)',
    async () => {
      return Promise.all([
        prisma.invoice.aggregate({
          where: { userId: testUser.id },
          _count: true,
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { userId: testUser.id, status: 'PAID' },
          _count: true,
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { userId: testUser.id, status: { in: ['DRAFT', 'SENT'] } },
          _count: true,
          _sum: { totalAmount: true },
        }),
      ]);
    },
    3
  );

  // Test 5: Get expense summary with grouping
  await testPerformance(
    'Get Expense Summary (with groupBy)',
    async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [totalStats, grouped] = await Promise.all([
        prisma.expense.aggregate({
          where: {
            userId: testUser.id,
            expenseDate: { gte: startDate },
          },
          _count: true,
          _sum: { amount: true },
        }),
        prisma.expense.groupBy({
          by: ['category'],
          where: {
            userId: testUser.id,
            expenseDate: { gte: startDate },
          },
          _sum: { amount: true },
        }),
      ]);

      return { totalStats, grouped };
    },
    1
  );

  // Test 6: Complex join query
  await testPerformance(
    'Get Invoices with Customer (includes)',
    async () => {
      return prisma.invoice.findMany({
        where: { userId: testUser.id },
        include: {
          customer: true,
          lineItems: true,
        },
        take: 100,
      });
    },
    100
  );

  logger.info('Performance tests complete!');
}

/**
 * Display results
 */
function displayResults() {
  console.log('\n' + '='.repeat(80));
  console.log('PERFORMANCE TEST RESULTS');
  console.log('='.repeat(80));

  results.forEach((result) => {
    console.log(`\n${result.operation}:`);
    console.log(`  Duration: ${result.duration}ms`);
    console.log(`  Records: ${result.recordCount}`);
    console.log(`  Avg/Record: ${result.avgPerRecord.toFixed(2)}ms`);
    console.log(`  Memory Delta: ${result.memoryAfter.heapUsed - result.memoryBefore.heapUsed}MB`);

    // Performance thresholds
    const threshold = result.recordCount > 10 ? 500 : 100;
    if (result.duration > threshold) {
      console.log(`  ⚠️  WARNING: Query exceeded ${threshold}ms threshold`);
    } else {
      console.log(`  ✓ Performance acceptable`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const avgDuration = totalDuration / results.length;

  console.log(`Total operations: ${results.length}`);
  console.log(`Total duration: ${totalDuration}ms`);
  console.log(`Average duration: ${avgDuration.toFixed(2)}ms`);

  const slowQueries = results.filter((r) => r.duration > 500);
  console.log(`Slow queries (>500ms): ${slowQueries.length}`);

  if (slowQueries.length > 0) {
    console.log('\nSlow queries:');
    slowQueries.forEach((q) => {
      console.log(`  - ${q.operation}: ${q.duration}ms`);
    });
  }

  console.log('\n');
}

/**
 * Cleanup test data
 */
async function cleanup() {
  logger.info('Cleaning up test data...');
  await prisma.user.deleteMany({
    where: { email: { startsWith: 'perftest' } },
  });
  logger.info('Cleanup complete!');
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    switch (command) {
      case 'generate':
        await generateTestData();
        break;

      case 'test':
        await runPerformanceTests();
        displayResults();
        break;

      case 'cleanup':
        await cleanup();
        break;

      case 'all':
      default:
        await generateTestData();
        await runPerformanceTests();
        displayResults();
        await cleanup();
        break;
    }

    logger.info('Performance test script completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Performance test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateTestData, runPerformanceTests, cleanup };
