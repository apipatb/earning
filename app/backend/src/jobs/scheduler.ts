import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';
import { weeklySummaryJob } from './weekly-summary.job';
import { invoiceReminderJob } from './invoice-reminder.job';
import { cleanupJob } from './cleanup.job';
import { backupJob } from './backup.job';
import { analyticsAggregationJob } from './analytics-aggregation.job';

const prisma = new PrismaClient();

// Job interface for type safety
interface JobDefinition {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  description: string;
}

// Type for scheduled tasks from node-cron
type ScheduledTask = ReturnType<typeof cron.schedule>;

// Job registry
const jobs: JobDefinition[] = [
  {
    name: 'weekly-summary',
    schedule: '0 8 * * 1', // Every Monday at 8 AM
    task: weeklySummaryJob,
    description: 'Calculate and send weekly earnings summaries',
  },
  {
    name: 'invoice-reminder',
    schedule: '0 9 * * *', // Every day at 9 AM
    task: invoiceReminderJob,
    description: 'Send invoice payment reminders',
  },
  {
    name: 'cleanup',
    schedule: '0 2 * * 0', // Every Sunday at 2 AM
    task: cleanupJob,
    description: 'Clean up old logs and archive data',
  },
  {
    name: 'backup',
    schedule: '0 3 * * *', // Every day at 3 AM
    task: backupJob,
    description: 'Create database backups',
  },
  {
    name: 'analytics-aggregation',
    schedule: '0 0 * * *', // Every day at midnight
    task: analyticsAggregationJob,
    description: 'Aggregate daily analytics and update dashboard cache',
  },
];

class JobScheduler {
  private cronJobs: Map<string, ScheduledTask> = new Map();
  private isRunning: boolean = false;

  /**
   * Initialize and start all scheduled jobs
   */
  async initialize(): Promise<void> {
    logger.info('Initializing job scheduler');

    // Only run jobs if enabled in environment
    if (process.env.ENABLE_JOBS !== 'true') {
      logger.info('Job scheduling is disabled (set ENABLE_JOBS=true to enable)');
      return;
    }

    try {
      // Initialize jobs in database
      for (const job of jobs) {
        const existingJob = await prisma.job.findUnique({
          where: { jobName: job.name },
        });

        if (!existingJob) {
          await prisma.job.create({
            data: {
              jobName: job.name,
              status: 'idle',
              isEnabled: true,
            },
          });
          logger.info(`Initialized job: ${job.name}`);
        }
      }

      // Schedule all jobs
      for (const job of jobs) {
        this.scheduleJob(job);
      }

      this.isRunning = true;
      logger.info('Job scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize job scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(jobDef: JobDefinition): void {
    try {
      const scheduledTask = cron.schedule(
        jobDef.schedule,
        () => this.executeJob(jobDef)
      );

      this.cronJobs.set(jobDef.name, scheduledTask);
      logger.info(`Scheduled job: ${jobDef.name} (${jobDef.schedule})`);
    } catch (error) {
      logger.error(`Failed to schedule job ${jobDef.name}:`, error);
    }
  }

  /**
   * Execute a job with error handling and logging
   */
  private async executeJob(jobDef: JobDefinition): Promise<void> {
    const jobName = jobDef.name;
    const startTime = Date.now();

    try {
      // Check if job is enabled
      const jobRecord = await prisma.job.findUnique({
        where: { jobName },
      });

      if (!jobRecord || !jobRecord.isEnabled) {
        logger.info(`Job ${jobName} is disabled, skipping`);
        return;
      }

      // Update job status to running
      await prisma.job.update({
        where: { jobName },
        data: {
          status: 'running',
          lastRun: new Date(),
        },
      });

      logger.info(`Starting job: ${jobName}`);

      // Execute the job
      await jobDef.task();

      // Calculate duration
      const duration = Date.now() - startTime;

      // Update job status to success
      await prisma.job.update({
        where: { jobName },
        data: {
          status: 'success',
          nextRun: this.getNextRunTime(jobDef.schedule),
          error: null,
        },
      });

      // Log execution
      await prisma.jobLog.create({
        data: {
          jobId: jobRecord.id,
          status: 'success',
          duration,
        },
      });

      logger.info(`Job completed successfully: ${jobName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      try {
        // Update job status to error
        const jobRecord = await prisma.job.findUnique({
          where: { jobName },
        });

        if (jobRecord) {
          await prisma.job.update({
            where: { jobName },
            data: {
              status: 'error',
              error: errorMessage,
              nextRun: this.getNextRunTime(jobDef.schedule),
            },
          });

          // Log execution error
          await prisma.jobLog.create({
            data: {
              jobId: jobRecord.id,
              status: 'error',
              duration,
              error: errorMessage,
            },
          });
        }
      } catch (dbError) {
        logger.error(`Failed to update job status for ${jobName}:`, dbError);
      }

      logger.error(`Job failed: ${jobName}`, {
        error: errorMessage,
        duration,
      });
    }
  }

  /**
   * Manually trigger a job
   */
  async runJobNow(jobName: string): Promise<void> {
    const jobDef = jobs.find((j) => j.name === jobName);

    if (!jobDef) {
      throw new Error(`Job not found: ${jobName}`);
    }

    logger.info(`Manual trigger for job: ${jobName}`);
    await this.executeJob(jobDef);
  }

  /**
   * Get all job statuses
   */
  async getJobStatuses() {
    return await prisma.job.findMany({
      include: {
        logs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobName: string, limit: number = 10) {
    const job = await prisma.job.findUnique({
      where: { jobName },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    return await prisma.jobLog.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Disable a job
   */
  async disableJob(jobName: string): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { jobName },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    await prisma.job.update({
      where: { jobName },
      data: { isEnabled: false },
    });

    logger.info(`Job disabled: ${jobName}`);
  }

  /**
   * Enable a job
   */
  async enableJob(jobName: string): Promise<void> {
    const job = await prisma.job.findUnique({
      where: { jobName },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobName}`);
    }

    await prisma.job.update({
      where: { jobName },
      data: { isEnabled: true },
    });

    logger.info(`Job enabled: ${jobName}`);
  }

  /**
   * Stop all scheduled jobs
   */
  async stop(): Promise<void> {
    logger.info('Stopping job scheduler');

    this.cronJobs.forEach((task, jobName) => {
      task.stop();
      logger.info(`Stopped job: ${jobName}`);
    });

    this.cronJobs.clear();
    this.isRunning = false;
  }

  /**
   * Check if scheduler is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get next run time for a cron expression
   * This is a simplified estimation - for production, use a library like cron-parser
   */
  private getNextRunTime(cronExpression: string): Date {
    try {
      // Simple cron expression parser for common patterns
      // Format: minute hour day-of-month month day-of-week
      const parts = cronExpression.split(' ');
      if (parts.length < 5) {
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // Get the hour and minute
      const minute = parseInt(parts[0]);
      const hour = parseInt(parts[1]);

      // Create next run date
      const next = new Date();
      next.setHours(hour, minute, 0, 0);

      // If the time has already passed today, set it for tomorrow
      if (next <= new Date()) {
        next.setDate(next.getDate() + 1);
      }

      return next;
    } catch (error) {
      logger.warn(`Failed to parse cron expression ${cronExpression}, using default`, error);
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow
    }
  }
}

export const scheduler = new JobScheduler();
export { JobDefinition };
