import { PrismaClient } from '@prisma/client';
import { scheduler } from '../jobs/scheduler';
import logger from '../lib/logger';
import request from 'supertest';

const prisma = new PrismaClient();

// Mock dependencies
jest.mock('../lib/logger');

describe('Job Scheduler', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.jobLog.deleteMany({});
    await prisma.job.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.jobLog.deleteMany({});
    await prisma.job.deleteMany({});
  });

  describe('Initialization', () => {
    it('should initialize job scheduler when enabled', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();
      expect(newScheduler.getIsRunning()).toBe(true);

      await newScheduler.stop();
    });

    it('should not initialize when disabled', async () => {
      process.env.ENABLE_JOBS = 'false';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();
      expect(newScheduler.getIsRunning()).toBe(false);
    });

    it('should create job records in database', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      const jobs = await prisma.job.findMany();
      expect(jobs.length).toBeGreaterThan(0);

      await newScheduler.stop();
    });
  });

  describe('Job Execution', () => {
    it('should execute a job successfully', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      // Run a job manually
      await newScheduler.runJobNow('analytics-aggregation');

      // Check job status
      const job = await prisma.job.findUnique({
        where: { jobName: 'analytics-aggregation' },
      });

      expect(job).toBeDefined();
      expect(job?.status).toBe('success');
      expect(job?.lastRun).toBeDefined();

      await newScheduler.stop();
    });

    it('should handle job execution errors', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      // Try to run a non-existent job
      await expect(newScheduler.runJobNow('non-existent-job')).rejects.toThrow(
        'Job not found'
      );

      await newScheduler.stop();
    });

    it('should log job execution', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      // Run a job
      await newScheduler.runJobNow('analytics-aggregation');

      // Check job logs
      const logs = await newScheduler.getJobLogs('analytics-aggregation');

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].status).toBe('success');

      await newScheduler.stop();
    });
  });

  describe('Job Status Management', () => {
    it('should get all job statuses', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      const statuses = await newScheduler.getJobStatuses();

      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(0);

      await newScheduler.stop();
    });

    it('should disable a job', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      await newScheduler.disableJob('analytics-aggregation');

      const job = await prisma.job.findUnique({
        where: { jobName: 'analytics-aggregation' },
      });

      expect(job?.isEnabled).toBe(false);

      await newScheduler.stop();
    });

    it('should enable a job', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      await newScheduler.disableJob('analytics-aggregation');
      await newScheduler.enableJob('analytics-aggregation');

      const job = await prisma.job.findUnique({
        where: { jobName: 'analytics-aggregation' },
      });

      expect(job?.isEnabled).toBe(true);

      await newScheduler.stop();
    });
  });

  describe('Job Logs', () => {
    it('should retrieve job logs with limit', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      // Run job multiple times
      await newScheduler.runJobNow('analytics-aggregation');
      await newScheduler.runJobNow('analytics-aggregation');

      const logs = await newScheduler.getJobLogs('analytics-aggregation', 5);

      expect(logs.length).toBeLessThanOrEqual(5);

      await newScheduler.stop();
    });

    it('should throw error for non-existent job logs', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      await expect(newScheduler.getJobLogs('non-existent-job')).rejects.toThrow(
        'Job not found'
      );

      await newScheduler.stop();
    });
  });

  describe('Jobs Controller', () => {
    let app: any;
    let authToken: string;

    beforeAll(async () => {
      // Create a test user and get auth token
      const server = require('../server').default;
      app = server;

      // Mock authentication for tests
      process.env.ADMIN_EMAILS = 'admin@test.com';
      authToken = 'mock-token'; // In real tests, this would be a valid JWT
    });

    it('should get job statuses via API', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      const response = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      await newScheduler.stop();
    });

    it('should run job via API', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      const response = await request(app)
        .post('/api/jobs/analytics-aggregation/run')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      await newScheduler.stop();
    });

    it('should return 404 for non-existent job', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      const response = await request(app)
        .post('/api/jobs/non-existent/run')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      await newScheduler.stop();
    });
  });

  describe('Job-specific Tests', () => {
    it('should aggregate daily earnings', async () => {
      // Create test data
      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@test.com`,
          passwordHash: 'hashed_password',
          name: 'Test User',
        },
      });

      const platform = await prisma.platform.create({
        data: {
          userId: user.id,
          name: 'Test Platform',
          category: 'freelance',
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.earning.create({
        data: {
          userId: user.id,
          platformId: platform.id,
          amount: 100,
          date: today,
        },
      });

      // Run analytics job
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();
      await newScheduler.initialize();

      await newScheduler.runJobNow('analytics-aggregation');

      // Verify job completed
      const job = await prisma.job.findUnique({
        where: { jobName: 'analytics-aggregation' },
      });

      expect(job?.status).toBe('success');

      await newScheduler.stop();
    });

    it('should send invoice reminders', async () => {
      // Create test data
      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@test.com`,
          passwordHash: 'hashed_password',
          name: 'Test User',
        },
      });

      const customer = await prisma.customer.create({
        data: {
          userId: user.id,
          name: 'Test Customer',
          email: 'customer@test.com',
        },
      });

      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      await prisma.invoice.create({
        data: {
          userId: user.id,
          customerId: customer.id,
          invoiceNumber: 'INV-001',
          invoiceDate: tenDaysAgo,
          dueDate: tenDaysAgo,
          status: 'sent',
          subtotal: 1000,
          totalAmount: 1000,
        },
      });

      // Run invoice reminder job
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();
      await newScheduler.initialize();

      await newScheduler.runJobNow('invoice-reminder');

      // Verify job completed
      const job = await prisma.job.findUnique({
        where: { jobName: 'invoice-reminder' },
      });

      expect(job?.status).toBe('success');

      await newScheduler.stop();
    });
  });

  describe('Job Scheduling', () => {
    it('should calculate next run time correctly', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      const statuses = await newScheduler.getJobStatuses();

      // Check that nextRun is calculated for all jobs
      for (const job of statuses) {
        expect(job.nextRun).toBeDefined();
        expect(new Date(job.nextRun) > new Date()).toBe(true);
      }

      await newScheduler.stop();
    });

    it('should stop scheduler properly', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();
      expect(newScheduler.getIsRunning()).toBe(true);

      await newScheduler.stop();
      expect(newScheduler.getIsRunning()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      // Try to get logs for invalid job
      await expect(newScheduler.getJobLogs('invalid-job')).rejects.toThrow();

      await newScheduler.stop();
    });

    it('should log errors appropriately', async () => {
      process.env.ENABLE_JOBS = 'true';
      const newScheduler = new (require('../jobs/scheduler').JobScheduler)();

      await newScheduler.initialize();

      // Attempt to run invalid job
      try {
        await newScheduler.runJobNow('invalid-job');
      } catch {
        // Expected
      }

      expect(logger.error).toHaveBeenCalled();

      await newScheduler.stop();
    });
  });
});
