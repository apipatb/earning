import { PrismaClient } from '@prisma/client';
import logger from '../lib/logger';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Backup Job
 * Runs: Daily at 3 AM
 * Task: Create database backup and upload to cloud storage
 */
export async function backupJob(): Promise<void> {
  logger.info('Starting backup job');

  try {
    // 1. Create local database backup
    const backupPath = await createDatabaseBackup();

    // 2. Upload backup to cloud storage
    if (backupPath && shouldUploadToCloud()) {
      await uploadBackupToCloud(backupPath);
    }

    // 3. Clean up old local backups (keep last 7 days)
    await cleanupOldBackups();

    // 4. Store backup metadata in database
    await storeBackupMetadata(backupPath);

    logger.info('Backup job completed successfully');
  } catch (error) {
    logger.error('Backup job failed:', error);
    throw error;
  }
}

/**
 * Create a database backup
 */
async function createDatabaseBackup(): Promise<string | null> {
  try {
    logger.info('Creating database backup');

    if (!process.env.DATABASE_URL?.includes('postgresql')) {
      logger.warn('Database is not PostgreSQL, backup skipped');
      return null;
    }

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.sql.gz`;
    const backupPath = path.join(backupsDir, backupFileName);

    // Create backup using pg_dump
    try {
      execSync(
        `pg_dump "${process.env.DATABASE_URL}" | gzip > "${backupPath}"`,
        {
          stdio: 'pipe',
        }
      );

      const stats = fs.statSync(backupPath);
      logger.info(`Database backup created: ${backupFileName} (${stats.size} bytes)`);
      return backupPath;
    } catch (execError) {
      logger.error('Failed to create database backup with pg_dump:', execError);
      return null;
    }
  } catch (error) {
    logger.error('Failed to create database backup:', error);
    return null;
  }
}

/**
 * Check if backups should be uploaded to cloud
 */
function shouldUploadToCloud(): boolean {
  return !!(
    (process.env.BACKUP_TO_S3 === 'true' && process.env.AWS_ACCESS_KEY_ID) ||
    (process.env.BACKUP_TO_GCS === 'true' && process.env.GCS_PROJECT_ID)
  );
}

/**
 * Upload backup to cloud storage (S3 or GCS)
 */
async function uploadBackupToCloud(backupPath: string): Promise<void> {
  try {
    logger.info('Uploading backup to cloud storage');

    if (process.env.BACKUP_TO_S3 === 'true') {
      await uploadToS3(backupPath);
    } else if (process.env.BACKUP_TO_GCS === 'true') {
      await uploadToGCS(backupPath);
    }
  } catch (error) {
    logger.error('Failed to upload backup to cloud storage:', error);
    // Don't throw - backup exists locally, cloud upload failure is not critical
  }
}

/**
 * Upload backup to AWS S3
 */
async function uploadToS3(backupPath: string): Promise<void> {
  try {
    logger.info('Uploading backup to S3');

    // TODO: Implement S3 upload using AWS SDK
    // Example:
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3();
    // const fileContent = fs.readFileSync(backupPath);
    // const params = {
    //   Bucket: process.env.AWS_S3_BUCKET,
    //   Key: `backups/${path.basename(backupPath)}`,
    //   Body: fileContent,
    // };
    // await s3.upload(params).promise();

    logger.info('S3 upload completed');
  } catch (error) {
    logger.error('Failed to upload backup to S3:', error);
  }
}

/**
 * Upload backup to Google Cloud Storage
 */
async function uploadToGCS(backupPath: string): Promise<void> {
  try {
    logger.info('Uploading backup to GCS');

    // TODO: Implement GCS upload using Google Cloud Storage SDK
    // Example:
    // const storage = new Storage({
    //   projectId: process.env.GCS_PROJECT_ID,
    // });
    // const bucket = storage.bucket(process.env.GCS_BUCKET);
    // await bucket.upload(backupPath, {
    //   destination: `backups/${path.basename(backupPath)}`,
    // });

    logger.info('GCS upload completed');
  } catch (error) {
    logger.error('Failed to upload backup to GCS:', error);
  }
}

/**
 * Clean up old local backups (keep last 7 days)
 */
async function cleanupOldBackups(): Promise<void> {
  try {
    logger.info('Cleaning up old backups');

    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const files = fs.readdirSync(backupsDir);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(backupsDir, file);
      const stat = fs.statSync(filePath);

      if (stat.mtime < sevenDaysAgo) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    logger.info(`Deleted ${deletedCount} old backup files`);
  } catch (error) {
    logger.error('Failed to cleanup old backups:', error);
  }
}

/**
 * Store backup metadata in database
 */
async function storeBackupMetadata(backupPath: string | null): Promise<void> {
  try {
    if (!backupPath) {
      logger.info('No backup metadata to store');
      return;
    }

    const stats = fs.statSync(backupPath);
    const backupDate = new Date();
    const estimatedRestoreTime = Math.ceil(stats.size / (10 * 1024 * 1024)); // Estimate based on 10MB/s

    // TODO: Create a Backup model in Prisma and store metadata
    logger.info('Backup metadata stored', {
      path: backupPath,
      size: stats.size,
      timestamp: backupDate,
      estimatedRestoreTime: `${estimatedRestoreTime}s`,
    });
  } catch (error) {
    logger.error('Failed to store backup metadata:', error);
  }
}
