import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface RestoreOptions {
  dryRun?: boolean;
  verifyIntegrity?: boolean;
  restoreDatabase?: boolean;
  restoreFiles?: boolean;
  targetPath?: string;
}

interface RestoreResult {
  success: boolean;
  dryRun: boolean;
  restoredItems: {
    database?: boolean;
    files?: boolean;
  };
  verification: {
    databaseIntegrity?: boolean;
    fileCount?: number;
  };
  errors: string[];
  warnings: string[];
}

export class RestoreService {
  private static readonly RESTORE_DIR = process.env.RESTORE_DIR || '/tmp/restores';
  private static readonly S3_BUCKET = process.env.AWS_S3_BUCKET;
  private static readonly S3_ENABLED = process.env.BACKUP_S3_ENABLED === 'true';

  private static s3Client = RestoreService.S3_ENABLED ? new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  }) : null;

  /**
   * Initialize restore system
   */
  static async initialize(): Promise<void> {
    try {
      // Create restore directory if it doesn't exist
      await fs.mkdir(RestoreService.RESTORE_DIR, { recursive: true });
      console.log('Restore system initialized');
    } catch (error) {
      console.error('Failed to initialize restore system:', error);
      throw error;
    }
  }

  /**
   * List available restore points
   */
  static async listRestorePoints(limit = 50, offset = 0) {
    return prisma.restorePoint.findMany({
      take: limit,
      skip: offset,
      orderBy: { timestamp: 'desc' },
      include: {
        backup: {
          select: {
            id: true,
            type: true,
            status: true,
            startTime: true,
            backupSize: true,
            location: true,
          },
        },
      },
    });
  }

  /**
   * Get restore point by ID
   */
  static async getRestorePointById(id: string) {
    return prisma.restorePoint.findUnique({
      where: { id },
      include: {
        backup: true,
      },
    });
  }

  /**
   * Restore from a specific restore point
   */
  static async restoreFromPoint(
    restorePointId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: false,
      dryRun: options.dryRun || false,
      restoredItems: {},
      verification: {},
      errors: [],
      warnings: [],
    };

    try {
      // Get restore point
      const restorePoint = await this.getRestorePointById(restorePointId);
      if (!restorePoint) {
        throw new Error('Restore point not found');
      }

      console.log(`Starting restore from point: ${restorePointId}`);
      console.log(`Dry run: ${result.dryRun}`);

      // Download backup if from S3
      let localBackupPath = restorePoint.backup.location;
      if (localBackupPath.startsWith('s3://')) {
        console.log('Downloading backup from S3...');
        localBackupPath = await this.downloadFromS3(localBackupPath);
      }

      // Extract backup archive
      const extractedPath = await this.extractBackup(localBackupPath);

      // Restore database if requested
      if (options.restoreDatabase !== false) {
        console.log('Restoring database...');
        const dbRestoreSuccess = await this.restoreDatabase(extractedPath, result.dryRun);
        result.restoredItems.database = dbRestoreSuccess;

        if (!dbRestoreSuccess) {
          result.errors.push('Database restore failed');
        }
      }

      // Restore files if requested
      if (options.restoreFiles) {
        console.log('Restoring files...');
        const filesRestoreSuccess = await this.restoreFiles(
          extractedPath,
          options.targetPath,
          result.dryRun
        );
        result.restoredItems.files = filesRestoreSuccess;

        if (!filesRestoreSuccess) {
          result.errors.push('Files restore failed');
        }
      }

      // Verify integrity if requested
      if (options.verifyIntegrity && !result.dryRun) {
        console.log('Verifying restore integrity...');
        await this.verifyRestore(result);
      }

      // Clean up extracted files
      await fs.rm(extractedPath, { recursive: true, force: true }).catch(() => {});

      // Clean up downloaded S3 file if applicable
      if (localBackupPath !== restorePoint.backup.location) {
        await fs.unlink(localBackupPath).catch(() => {});
      }

      result.success = result.errors.length === 0;
      console.log(`Restore ${result.success ? 'completed successfully' : 'failed'}`);

      return result;
    } catch (error) {
      console.error('Restore failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Download backup from S3
   */
  private static async downloadFromS3(s3Path: string): Promise<string> {
    if (!RestoreService.s3Client || !RestoreService.S3_BUCKET) {
      throw new Error('S3 is not configured');
    }

    const key = s3Path.replace(`s3://${RestoreService.S3_BUCKET}/`, '');
    const localPath = path.join(RestoreService.RESTORE_DIR, path.basename(key));

    try {
      const response = await RestoreService.s3Client.send(new GetObjectCommand({
        Bucket: RestoreService.S3_BUCKET,
        Key: key,
      }));

      if (!response.Body) {
        throw new Error('No data received from S3');
      }

      const writeStream = createWriteStream(localPath);
      await pipeline(response.Body as Readable, writeStream);

      console.log(`Backup downloaded from S3: ${localPath}`);
      return localPath;
    } catch (error) {
      console.error('S3 download failed:', error);
      throw error;
    }
  }

  /**
   * Extract backup archive
   */
  private static async extractBackup(backupPath: string): Promise<string> {
    const extractPath = path.join(
      RestoreService.RESTORE_DIR,
      `extract-${Date.now()}`
    );

    try {
      await fs.mkdir(extractPath, { recursive: true });

      // Extract tar.gz archive
      await execAsync(`tar -xzf ${backupPath} -C ${extractPath}`);

      console.log(`Backup extracted to: ${extractPath}`);
      return extractPath;
    } catch (error) {
      console.error('Extraction failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  private static async restoreDatabase(extractPath: string, dryRun: boolean): Promise<boolean> {
    try {
      // Find database backup file
      const files = await fs.readdir(extractPath);
      const dbFile = files.find(f => f.startsWith('db-') && (f.endsWith('.sql') || f.endsWith('.sql.gz')));

      if (!dbFile) {
        throw new Error('Database backup file not found');
      }

      const dbBackupPath = path.join(extractPath, dbFile);

      // Decompress if needed
      let sqlPath = dbBackupPath;
      if (dbFile.endsWith('.gz')) {
        sqlPath = dbBackupPath.replace('.gz', '');
        await execAsync(`gunzip -c ${dbBackupPath} > ${sqlPath}`);
      }

      if (dryRun) {
        console.log('[DRY RUN] Would restore database from:', sqlPath);
        return true;
      }

      // Parse DATABASE_URL to extract connection details
      const dbUrl = process.env.DATABASE_URL || '';
      const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

      if (!urlMatch) {
        throw new Error('Invalid DATABASE_URL format');
      }

      const [, user, password, host, port, database] = urlMatch;

      // WARNING: This will drop and recreate the database
      console.warn('WARNING: Restoring database will overwrite existing data!');

      // Restore using pg_restore
      const pgRestoreCommand = `PGPASSWORD="${password}" pg_restore -h ${host} -p ${port} -U ${user} -d ${database} -c ${sqlPath}`;
      await execAsync(pgRestoreCommand);

      console.log('Database restored successfully');
      return true;
    } catch (error) {
      console.error('Database restore failed:', error);
      return false;
    }
  }

  /**
   * Restore files from backup
   */
  private static async restoreFiles(
    extractPath: string,
    targetPath?: string,
    dryRun = false
  ): Promise<boolean> {
    try {
      // Find files backup
      const files = await fs.readdir(extractPath);
      const filesArchive = files.find(f => f.startsWith('files-'));

      if (!filesArchive) {
        console.log('No files backup found');
        return true; // Not an error if no files backup exists
      }

      const filesBackupPath = path.join(extractPath, filesArchive);
      const restorePath = targetPath || path.join(process.cwd(), 'uploads');

      if (dryRun) {
        console.log('[DRY RUN] Would restore files to:', restorePath);
        return true;
      }

      // Create target directory
      await fs.mkdir(restorePath, { recursive: true });

      // Extract files
      await execAsync(`tar -xzf ${filesBackupPath} -C ${restorePath}`);

      console.log('Files restored successfully');
      return true;
    } catch (error) {
      console.error('Files restore failed:', error);
      return false;
    }
  }

  /**
   * Verify restore integrity
   */
  private static async verifyRestore(result: RestoreResult): Promise<void> {
    try {
      // Verify database connection
      if (result.restoredItems.database) {
        try {
          await prisma.$queryRaw`SELECT 1`;
          result.verification.databaseIntegrity = true;
          console.log('Database verification: PASSED');
        } catch (error) {
          result.verification.databaseIntegrity = false;
          result.warnings.push('Database verification failed');
          console.error('Database verification: FAILED');
        }
      }

      // Verify files
      if (result.restoredItems.files) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        try {
          const files = await fs.readdir(uploadsDir);
          result.verification.fileCount = files.length;
          console.log(`Files verification: ${files.length} files found`);
        } catch (error) {
          result.verification.fileCount = 0;
          result.warnings.push('Files verification failed');
        }
      }
    } catch (error) {
      console.error('Verification failed:', error);
      result.warnings.push('Verification process failed');
    }
  }

  /**
   * Point-in-time recovery
   */
  static async pointInTimeRestore(timestamp: Date, options: RestoreOptions = {}): Promise<RestoreResult> {
    try {
      // Find the closest restore point before the specified timestamp
      const restorePoint = await prisma.restorePoint.findFirst({
        where: {
          timestamp: {
            lte: timestamp,
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        include: {
          backup: true,
        },
      });

      if (!restorePoint) {
        throw new Error('No restore point found before the specified timestamp');
      }

      console.log(`Point-in-time restore: Using restore point from ${restorePoint.timestamp}`);
      return this.restoreFromPoint(restorePoint.id, options);
    } catch (error) {
      console.error('Point-in-time restore failed:', error);
      throw error;
    }
  }

  /**
   * Dry run restore - verify without making changes
   */
  static async dryRunRestore(restorePointId: string): Promise<RestoreResult> {
    return this.restoreFromPoint(restorePointId, {
      dryRun: true,
      verifyIntegrity: false,
      restoreDatabase: true,
      restoreFiles: true,
    });
  }

  /**
   * Get restore statistics
   */
  static async getRestoreStats() {
    const totalRestorePoints = await prisma.restorePoint.count();

    const oldestPoint = await prisma.restorePoint.findFirst({
      orderBy: { timestamp: 'asc' },
    });

    const newestPoint = await prisma.restorePoint.findFirst({
      orderBy: { timestamp: 'desc' },
    });

    return {
      totalRestorePoints,
      oldestPoint,
      newestPoint,
    };
  }

  /**
   * Delete restore point
   */
  static async deleteRestorePoint(id: string): Promise<void> {
    try {
      await prisma.restorePoint.delete({
        where: { id },
      });
      console.log(`Restore point deleted: ${id}`);
    } catch (error) {
      console.error('Failed to delete restore point:', error);
      throw error;
    }
  }

  /**
   * Test restore capability
   */
  static async testRestore(restorePointId: string): Promise<{
    canRestore: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if restore point exists
      const restorePoint = await this.getRestorePointById(restorePointId);
      if (!restorePoint) {
        issues.push('Restore point not found');
        return { canRestore: false, issues };
      }

      // Check if backup file exists
      const backupLocation = restorePoint.backup.location;
      if (backupLocation.startsWith('s3://')) {
        // Check S3 connectivity
        if (!RestoreService.s3Client) {
          issues.push('S3 is not configured');
        }
      } else {
        // Check local file
        try {
          await fs.access(backupLocation);
        } catch {
          issues.push('Backup file not found at specified location');
        }
      }

      // Check database connectivity
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        issues.push('Cannot connect to database');
      }

      // Check disk space
      const restoreDir = RestoreService.RESTORE_DIR;
      try {
        const { stdout } = await execAsync(`df -k ${restoreDir} | tail -1 | awk '{print $4}'`);
        const availableKB = parseInt(stdout.trim(), 10);
        const backupSizeKB = Number(restorePoint.backup.backupSize) / 1024;

        if (availableKB < backupSizeKB * 2) {
          issues.push('Insufficient disk space for restore operation');
        }
      } catch (error) {
        issues.push('Cannot check disk space');
      }

      return {
        canRestore: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(error instanceof Error ? error.message : 'Unknown error');
      return { canRestore: false, issues };
    }
  }
}
