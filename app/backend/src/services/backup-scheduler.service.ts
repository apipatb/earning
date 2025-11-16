import cron from 'node-cron';
import { PrismaClient, BackupType, BackupFrequency } from '@prisma/client';
import { BackupService } from './backup.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface ScheduledTask {
  id: string;
  frequency: BackupFrequency;
  task: cron.ScheduledTask;
}

export class BackupSchedulerService {
  private static scheduledTasks: Map<string, ScheduledTask> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the backup scheduler
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Backup scheduler already initialized');
      return;
    }

    try {
      // Initialize backup and restore services
      await BackupService.initialize();

      // Load all enabled schedules from database
      const schedules = await prisma.backupSchedule.findMany({
        where: { isEnabled: true },
      });

      logger.info(`Found ${schedules.length} enabled backup schedule(s)`);

      // Schedule each backup
      for (const schedule of schedules) {
        await this.scheduleBackup(schedule.id, schedule.frequency, schedule.time, schedule.backupType);
      }

      // Set up daily cleanup job at 3 AM
      this.setupCleanupJob();

      this.isInitialized = true;
      logger.info('Backup scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize backup scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule a backup based on frequency
   */
  static async scheduleBackup(
    scheduleId: string,
    frequency: BackupFrequency,
    time: string,
    backupType: BackupType
  ): Promise<void> {
    try {
      const cronExpression = this.getCronExpression(frequency, time);
      logger.info(`Scheduling ${frequency} backup at ${time}`, { scheduleId, cronExpression });

      const task = cron.schedule(cronExpression, async () => {
        await this.executeScheduledBackup(scheduleId, backupType);
      }, {
        timezone: process.env.TZ || 'UTC',
      });

      // Store the task
      this.scheduledTasks.set(scheduleId, {
        id: scheduleId,
        frequency,
        task,
      });

      logger.info(`Backup scheduled successfully`, { scheduleId, frequency, time });
    } catch (error) {
      logger.error('Failed to schedule backup:', error);
      throw error;
    }
  }

  /**
   * Execute a scheduled backup
   */
  private static async executeScheduledBackup(scheduleId: string, backupType: BackupType): Promise<void> {
    try {
      logger.info(`Executing scheduled backup`, { scheduleId, backupType });

      // Update last run time
      const now = new Date();
      await prisma.backupSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRun: now,
          nextRun: this.calculateNextRun(scheduleId),
        },
      });

      // Execute backup
      await BackupService.createBackup({
        type: backupType,
        compress: true,
        encrypt: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        includeFiles: true,
        retention: 30,
      });

      logger.info(`Scheduled backup completed successfully`, { scheduleId });
    } catch (error) {
      logger.error('Scheduled backup failed:', error);
      // Don't throw - we don't want to stop the cron job
    }
  }

  /**
   * Calculate next run time for a schedule
   */
  private static async calculateNextRun(scheduleId: string): Promise<Date> {
    const schedule = await prisma.backupSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const [hours, minutes] = schedule.time.split(':').map(Number);
    const now = new Date();
    const nextRun = new Date(now);

    nextRun.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case BackupFrequency.DAILY:
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case BackupFrequency.WEEKLY:
        const daysUntilMonday = (8 - nextRun.getDay()) % 7;
        nextRun.setDate(nextRun.getDate() + (daysUntilMonday || 7));
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;

      case BackupFrequency.MONTHLY:
        nextRun.setMonth(nextRun.getMonth() + 1, 1);
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Convert frequency and time to cron expression
   */
  private static getCronExpression(frequency: BackupFrequency, time: string): string {
    const [hours, minutes] = time.split(':');

    switch (frequency) {
      case BackupFrequency.DAILY:
        // Run every day at specified time
        return `${minutes} ${hours} * * *`;

      case BackupFrequency.WEEKLY:
        // Run every Monday at specified time
        return `${minutes} ${hours} * * 1`;

      case BackupFrequency.MONTHLY:
        // Run on the 1st of each month at specified time
        return `${minutes} ${hours} 1 * *`;

      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }

  /**
   * Set up daily cleanup job
   */
  private static setupCleanupJob(): void {
    // Run cleanup every day at 3 AM
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Running scheduled backup cleanup');
        await BackupService.cleanupOldBackups();
        logger.info('Scheduled backup cleanup completed');
      } catch (error) {
        logger.error('Scheduled backup cleanup failed:', error);
      }
    }, {
      timezone: process.env.TZ || 'UTC',
    });

    logger.info('Cleanup job scheduled for 3:00 AM daily');
  }

  /**
   * Cancel a scheduled backup
   */
  static async cancelSchedule(scheduleId: string): Promise<void> {
    const scheduledTask = this.scheduledTasks.get(scheduleId);

    if (scheduledTask) {
      scheduledTask.task.stop();
      this.scheduledTasks.delete(scheduleId);
      logger.info(`Backup schedule cancelled`, { scheduleId });
    }
  }

  /**
   * Update a schedule
   */
  static async updateSchedule(
    scheduleId: string,
    frequency: BackupFrequency,
    time: string,
    backupType: BackupType
  ): Promise<void> {
    // Cancel existing schedule
    await this.cancelSchedule(scheduleId);

    // Create new schedule
    await this.scheduleBackup(scheduleId, frequency, time, backupType);
  }

  /**
   * Stop all scheduled backups
   */
  static stopAll(): void {
    for (const [scheduleId, scheduledTask] of this.scheduledTasks.entries()) {
      scheduledTask.task.stop();
      logger.info(`Stopped scheduled backup`, { scheduleId });
    }

    this.scheduledTasks.clear();
    this.isInitialized = false;
    logger.info('All backup schedules stopped');
  }

  /**
   * Get active schedules
   */
  static getActiveSchedules(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * Trigger weekly full backup (used by cron)
   */
  static async triggerWeeklyFullBackup(): Promise<void> {
    try {
      logger.info('Starting weekly full backup');

      await BackupService.createBackup({
        type: BackupType.FULL,
        compress: true,
        encrypt: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        includeFiles: true,
        retention: 90, // Keep weekly backups for 90 days
      });

      logger.info('Weekly full backup completed successfully');
    } catch (error) {
      logger.error('Weekly full backup failed:', error);
    }
  }
}

// Default schedules to create if none exist
export const DEFAULT_SCHEDULES = [
  {
    frequency: BackupFrequency.DAILY,
    time: '02:00',
    isEnabled: true,
    backupType: BackupType.INCREMENTAL,
    metadata: JSON.stringify({ retention: 30 }),
  },
  {
    frequency: BackupFrequency.WEEKLY,
    time: '02:00',
    isEnabled: true,
    backupType: BackupType.FULL,
    metadata: JSON.stringify({ retention: 90 }),
  },
];

/**
 * Initialize default backup schedules if none exist
 */
export async function initializeDefaultSchedules(): Promise<void> {
  try {
    const existingSchedules = await prisma.backupSchedule.count();

    if (existingSchedules === 0) {
      logger.info('Creating default backup schedules');

      for (const schedule of DEFAULT_SCHEDULES) {
        const created = await prisma.backupSchedule.create({
          data: {
            ...schedule,
            nextRun: calculateNextRunTime(schedule.frequency, schedule.time),
          },
        });

        logger.info(`Created default ${schedule.frequency} backup schedule`, { id: created.id });
      }
    }
  } catch (error) {
    logger.error('Failed to initialize default schedules:', error);
  }
}

/**
 * Helper to calculate next run time
 */
function calculateNextRunTime(frequency: BackupFrequency, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const nextRun = new Date(now);

  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case BackupFrequency.DAILY:
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case BackupFrequency.WEEKLY:
      const daysUntilMonday = (8 - nextRun.getDay()) % 7;
      nextRun.setDate(nextRun.getDate() + (daysUntilMonday || 7));
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;

    case BackupFrequency.MONTHLY:
      nextRun.setMonth(nextRun.getMonth() + 1, 1);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}
