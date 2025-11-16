import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Cleanup Job
 * Runs: Weekly on Sunday at 2 AM
 * Task: Delete old logs, archive old data, and vacuum database
 */
export async function cleanupJob(): Promise<void> {
  logger.info('Starting cleanup job');

  try {
    // 1. Delete old logs (> 30 days)
    await cleanupOldLogs();

    // 2. Archive old job logs (> 90 days)
    await archiveOldJobLogs();

    // 3. Vacuum database (PostgreSQL)
    await vacuumDatabase();

    logger.info('Cleanup job completed successfully');
  } catch (error) {
    logger.error('Cleanup job failed:', error);
    throw error;
  }
}

/**
 * Delete old application logs (> 30 days)
 */
async function cleanupOldLogs(): Promise<void> {
  try {
    logger.info('Cleaning up old application logs');

    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      logger.info('Logs directory does not exist, skipping cleanup');
      return;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const files = fs.readdirSync(logsDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stat = fs.statSync(filePath);

      if (stat.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    logger.info(`Deleted ${deletedCount} old log files`);
  } catch (error) {
    logger.error('Failed to cleanup old logs:', error);
  }
}

/**
 * Archive old job logs (> 90 days) - Keep them but mark as archived
 */
async function archiveOldJobLogs(): Promise<void> {
  try {
    logger.info('Archiving old job logs');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Note: Archiving can be implemented by moving old logs to a separate table
    // or by setting an archive flag. For now, we'll just log the operation.
    const oldLogs = await prisma.jobLog.findMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
      select: { id: true },
    });

    logger.info(`Found ${oldLogs.length} job logs older than 90 days for archiving`);
    // TODO: Implement archiving logic (e.g., move to archive table or cloud storage)
  } catch (error) {
    logger.error('Failed to archive old job logs:', error);
  }
}

/**
 * Vacuum database (PostgreSQL maintenance)
 */
async function vacuumDatabase(): Promise<void> {
  try {
    logger.info('Running database vacuum');

    if (process.env.DATABASE_URL?.includes('postgresql')) {
      // Run VACUUM ANALYZE to optimize the database
      try {
        const result = execSync(
          `psql "${process.env.DATABASE_URL}" -c "VACUUM ANALYZE;"`,
          {
            encoding: 'utf-8',
            stdio: 'pipe',
          }
        );
        logger.info('Database vacuum completed successfully');
      } catch (execError) {
        // VACUUM might fail if we don't have proper permissions
        // It's usually done by a DBA or scheduled maintenance, so we log and continue
        logger.warn('Database vacuum encountered an issue (this is often expected):', execError);
      }
    } else {
      logger.info('Database is not PostgreSQL, skipping vacuum');
    }
  } catch (error) {
    logger.error('Failed to vacuum database:', error);
  }
}
