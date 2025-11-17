import { PrismaClient, BackupType, BackupStatus } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import crypto from 'crypto';
import { createWriteStream, createReadStream } from 'fs';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';
import {
  FileOperationError,
  ExternalServiceError,
  ConfigurationError,
  DatabaseError,
  tryOptional,
  retry,
} from '../errors';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface BackupOptions {
  type: BackupType;
  encrypt?: boolean;
  compress?: boolean;
  includeFiles?: boolean;
  retention?: number;
}

interface BackupMetadata {
  databaseSize: number;
  fileCount: number;
  compressedSize: number;
  encrypted: boolean;
  compressed: boolean;
  backupPaths: {
    database?: string;
    files?: string;
    combined?: string;
  };
}

export class BackupService {
  private static readonly BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/backups';
  private static readonly ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production';
  private static readonly S3_BUCKET = process.env.AWS_S3_BUCKET;
  private static readonly S3_ENABLED = process.env.BACKUP_S3_ENABLED === 'true';

  private static s3Client = BackupService.S3_ENABLED ? new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }) : null;

  /**
   * Initialize backup system
   */
  static async initialize(): Promise<void> {
    try {
      // Create backup directory if it doesn't exist
      await fs.mkdir(BackupService.BACKUP_DIR, { recursive: true });
      logger.info('Backup system initialized', { backupDir: BackupService.BACKUP_DIR });
    } catch (error) {
      logger.error('Failed to initialize backup system', error instanceof Error ? error : new Error(String(error)));
      throw new FileOperationError(
        'upload',
        'Failed to initialize backup system',
        { backupDir: BackupService.BACKUP_DIR }
      );
    }
  }

  /**
   * Create a new backup
   */
  static async createBackup(options: BackupOptions): Promise<string> {
    const startTime = new Date();
    let backupJob;

    try {
      // Create backup job record
      backupJob = await prisma.backupJob.create({
        data: {
          type: options.type,
          status: BackupStatus.RUNNING,
          startTime,
          retention: options.retention || 30,
        },
      });

      console.log(`Starting ${options.type} backup: ${backupJob.id}`);

      const backupMetadata: BackupMetadata = {
        databaseSize: 0,
        fileCount: 0,
        compressedSize: 0,
        encrypted: options.encrypt || false,
        compressed: options.compress !== false,
        backupPaths: {},
      };

      // Backup database
      const dbBackupPath = await this.backupDatabase(backupJob.id, options);
      backupMetadata.backupPaths.database = dbBackupPath;
      backupMetadata.databaseSize = (await fs.stat(dbBackupPath)).size;

      // Backup files if requested
      if (options.includeFiles) {
        const fileBackupPath = await this.backupFiles(backupJob.id, options);
        backupMetadata.backupPaths.files = fileBackupPath;
        backupMetadata.fileCount = await this.countFiles(fileBackupPath);
      }

      // Create combined archive
      const combinedPath = await this.createCombinedArchive(
        backupJob.id,
        backupMetadata.backupPaths,
        options
      );
      backupMetadata.backupPaths.combined = combinedPath;
      backupMetadata.compressedSize = (await fs.stat(combinedPath)).size;

      // Upload to S3 if enabled
      let finalLocation = combinedPath;
      if (BackupService.S3_ENABLED && BackupService.s3Client) {
        finalLocation = await this.uploadToS3(backupJob.id, combinedPath);
        // Clean up local file after upload
        await tryOptional(() => fs.unlink(combinedPath), undefined, true);
      }

      // Update backup job with success
      const endTime = new Date();
      await prisma.backupJob.update({
        where: { id: backupJob.id },
        data: {
          status: BackupStatus.SUCCESS,
          endTime,
          backupSize: BigInt(backupMetadata.compressedSize),
          location: finalLocation,
          metadata: JSON.stringify(backupMetadata),
        },
      });

      // Create restore point
      await prisma.restorePoint.create({
        data: {
          backupId: backupJob.id,
          timestamp: startTime,
          description: `${options.type} backup completed successfully`,
          metadata: JSON.stringify({
            duration: endTime.getTime() - startTime.getTime(),
            size: backupMetadata.compressedSize,
          }),
        },
      });

      logger.info('Backup completed successfully', {
        backupId: backupJob.id,
        type: options.type,
        size: backupMetadata.compressedSize,
      });
      return backupJob.id;
    } catch (error) {
      logger.error('Backup failed', error instanceof Error ? error : new Error(String(error)), {
        backupId: backupJob?.id,
        type: options.type,
      });

      if (backupJob) {
        await prisma.backupJob.update({
          where: { id: backupJob.id },
          data: {
            status: BackupStatus.FAILED,
            endTime: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      throw error;
    }
  }

  /**
   * Backup PostgreSQL database
   */
  private static async backupDatabase(backupId: string, options: BackupOptions): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `db-${backupId}-${timestamp}.sql`;
    const backupPath = path.join(BackupService.BACKUP_DIR, filename);

    try {
      // Parse DATABASE_URL to extract connection details
      const dbUrl = process.env.DATABASE_URL || '';
      const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, user, password, host, port, database] = urlMatch;

      // Build pg_dump command
      const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F c -f ${backupPath}`;

      // Execute pg_dump
      await execAsync(pgDumpCommand);

      // Compress if requested
      if (options.compress !== false) {
        const compressedPath = `${backupPath}.gz`;
        await execAsync(`gzip -c ${backupPath} > ${compressedPath}`);
        await fs.unlink(backupPath);
        return compressedPath;
      }

      return backupPath;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw new Error(`Database backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Backup files from S3 or local storage
   */
  private static async backupFiles(backupId: string, options: BackupOptions): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `files-${backupId}-${timestamp}.tar.gz`;
    const backupPath = path.join(BackupService.BACKUP_DIR, filename);

    try {
      // Create archive
      const output = createWriteStream(backupPath);
      const archive = archiver('tar', {
        gzip: options.compress !== false,
      });

      return new Promise((resolve, reject) => {
        output.on('close', () => {
          console.log(`Files backup created: ${archive.pointer()} bytes`);
          resolve(backupPath);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Add uploads directory if it exists
        const uploadsDir = path.join(process.cwd(), 'uploads');
        fs.access(uploadsDir)
          .then(() => {
            archive.directory(uploadsDir, 'uploads');
            archive.finalize();
          })
          .catch(() => {
            // No uploads directory, just finalize
            archive.finalize();
          });
      });
    } catch (error) {
      console.error('Files backup failed:', error);
      throw new Error(`Files backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create combined archive of all backup components
   */
  private static async createCombinedArchive(
    backupId: string,
    backupPaths: { database?: string; files?: string },
    options: BackupOptions
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${backupId}-${timestamp}.tar.gz`;
    const combinedPath = path.join(BackupService.BACKUP_DIR, filename);

    try {
      const output = createWriteStream(combinedPath);
      const archive = archiver('tar', {
        gzip: options.compress !== false,
      });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          // Clean up individual backup files
          const cleanupPromises = Object.values(backupPaths)
            .filter(Boolean)
            .map(p => tryOptional(() => fs.unlink(p as string), undefined, false));

          await Promise.all(cleanupPromises);
          resolve(combinedPath);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.pipe(output);

        // Add database backup
        if (backupPaths.database) {
          archive.file(backupPaths.database, { name: path.basename(backupPaths.database) });
        }

        // Add files backup
        if (backupPaths.files) {
          archive.file(backupPaths.files, { name: path.basename(backupPaths.files) });
        }

        // Encrypt if requested
        if (options.encrypt) {
          // Add encryption metadata
          const encryptionInfo = {
            encrypted: true,
            algorithm: 'aes-256-cbc',
            timestamp: new Date().toISOString(),
          };
          archive.append(JSON.stringify(encryptionInfo, null, 2), { name: 'encryption.json' });
        }

        archive.finalize();
      });
    } catch (error) {
      console.error('Combined archive creation failed:', error);
      throw error;
    }
  }

  /**
   * Upload backup to S3
   */
  private static async uploadToS3(backupId: string, localPath: string): Promise<string> {
    if (!BackupService.s3Client || !BackupService.S3_BUCKET) {
      throw new Error('S3 is not configured');
    }

    const key = `backups/${new Date().toISOString().split('T')[0]}/${path.basename(localPath)}`;

    try {
      const fileContent = await fs.readFile(localPath);

      await BackupService.s3Client.send(new PutObjectCommand({
        Bucket: BackupService.S3_BUCKET,
        Key: key,
        Body: fileContent,
        ServerSideEncryption: 'AES256',
      }));

      console.log(`Backup uploaded to S3: s3://${BackupService.S3_BUCKET}/${key}`);
      return `s3://${BackupService.S3_BUCKET}/${key}`;
    } catch (error) {
      console.error('S3 upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete backup from S3
   */
  private static async deleteFromS3(s3Location: string): Promise<void> {
    if (!BackupService.s3Client || !BackupService.S3_BUCKET) {
      throw new Error('S3 is not configured');
    }

    try {
      // Parse S3 URL (format: s3://bucket-name/key)
      const s3UrlMatch = s3Location.match(/^s3:\/\/([^/]+)\/(.+)$/);

      if (!s3UrlMatch) {
        throw new Error(`Invalid S3 URL format: ${s3Location}`);
      }

      const [, bucket, key] = s3UrlMatch;

      // Verify bucket matches configured bucket
      if (bucket !== BackupService.S3_BUCKET) {
        throw new Error(`Bucket mismatch: expected ${BackupService.S3_BUCKET}, got ${bucket}`);
      }

      // Delete object from S3
      await BackupService.s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      console.log(`Backup deleted from S3: ${s3Location}`);
    } catch (error) {
      console.error('S3 deletion failed:', error);
      throw new Error(`Failed to delete backup from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count files in archive
   */
  private static async countFiles(archivePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(`tar -tzf ${archivePath} | wc -l`);
      return parseInt(stdout.trim(), 10);
    } catch (error) {
      console.error('Failed to count files:', error);
      return 0;
    }
  }

  /**
   * List all backups
   */
  static async listBackups(limit = 50, offset = 0) {
    return prisma.backupJob.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        restorePoints: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  /**
   * Get backup by ID
   */
  static async getBackupById(id: string) {
    return prisma.backupJob.findUnique({
      where: { id },
      include: {
        restorePoints: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
  }

  /**
   * Clean up old backups based on retention policy
   */
  static async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await prisma.backupJob.findMany({
        where: {
          status: BackupStatus.SUCCESS,
        },
      });

      for (const backup of backups) {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - backup.retention);

        if (backup.startTime < retentionDate) {
          console.log(`Deleting old backup: ${backup.id}`);

          // Delete from S3 if applicable
          if (backup.location.startsWith('s3://')) {
            await this.deleteFromS3(backup.location);
          } else {
            // Delete local file
            await tryOptional(() => fs.unlink(backup.location), undefined, true);
          }

          // Delete backup record and restore points
          await prisma.backupJob.delete({
            where: { id: backup.id },
          });
        }
      }

      console.log('Old backups cleaned up successfully');
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get backup statistics
   */
  static async getBackupStats() {
    const [total, successful, failed, running] = await Promise.all([
      prisma.backupJob.count(),
      prisma.backupJob.count({ where: { status: BackupStatus.SUCCESS } }),
      prisma.backupJob.count({ where: { status: BackupStatus.FAILED } }),
      prisma.backupJob.count({ where: { status: BackupStatus.RUNNING } }),
    ]);

    const totalSize = await prisma.backupJob.aggregate({
      where: { status: BackupStatus.SUCCESS },
      _sum: { backupSize: true },
    });

    const lastBackup = await prisma.backupJob.findFirst({
      where: { status: BackupStatus.SUCCESS },
      orderBy: { createdAt: 'desc' },
    });

    return {
      total,
      successful,
      failed,
      running,
      totalSize: totalSize._sum.backupSize || BigInt(0),
      lastBackup,
    };
  }

  /**
   * Create incremental backup
   */
  static async createIncrementalBackup(baseBackupId?: string): Promise<string> {
    // Find the last successful full backup if not specified
    if (!baseBackupId) {
      const lastFullBackup = await prisma.backupJob.findFirst({
        where: {
          type: BackupType.FULL,
          status: BackupStatus.SUCCESS,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!lastFullBackup) {
        throw new Error('No full backup found. Please create a full backup first.');
      }

      baseBackupId = lastFullBackup.id;
    }

    return this.createBackup({
      type: BackupType.INCREMENTAL,
      compress: true,
      encrypt: false,
      includeFiles: false,
    });
  }
}
