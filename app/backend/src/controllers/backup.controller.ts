import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';
import { BackupService } from '../services/backup.service';
import { RestoreService } from '../services/restore.service';
import { BackupType, BackupFrequency } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Validation schemas
const createBackupSchema = z.object({
  type: z.nativeEnum(BackupType),
  encrypt: z.boolean().optional(),
  compress: z.boolean().optional(),
  includeFiles: z.boolean().optional(),
  retention: z.number().int().positive().max(365).optional(),
});

const updateScheduleSchema = z.object({
  frequency: z.nativeEnum(BackupFrequency),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:MM format
  isEnabled: z.boolean().optional(),
  backupType: z.nativeEnum(BackupType).optional(),
  retention: z.number().int().positive().max(365).optional(),
});

const restoreSchema = z.object({
  dryRun: z.boolean().optional(),
  verifyIntegrity: z.boolean().optional(),
  restoreDatabase: z.boolean().optional(),
  restoreFiles: z.boolean().optional(),
  targetPath: z.string().optional(),
});

/**
 * Trigger immediate backup
 * POST /api/v1/backup/now
 */
export const triggerBackup = async (req: AuthRequest, res: Response) => {
  try {
    const validation = createBackupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error });
    }

    const backupId = await BackupService.createBackup(validation.data);

    const backup = await BackupService.getBackupById(backupId);

    res.status(201).json({
      message: 'Backup created successfully',
      backup: {
        ...backup,
        backupSize: backup?.backupSize ? Number(backup.backupSize) : null,
        metadata: backup?.metadata ? JSON.parse(backup.metadata) : null,
      },
    });
  } catch (error) {
    logger.error('Trigger backup error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to create backup',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get list of backups
 * GET /api/v1/backup/jobs
 */
export const listBackups = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const backups = await BackupService.listBackups(limit, offset);
    const total = await prisma.backupJob.count();

    res.json({
      backups: backups.map(backup => ({
        ...backup,
        backupSize: backup.backupSize ? Number(backup.backupSize) : null,
        metadata: backup.metadata ? JSON.parse(backup.metadata) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List backups error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
};

/**
 * Get backup by ID
 * GET /api/v1/backup/jobs/:id
 */
export const getBackupById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const backup = await BackupService.getBackupById(id);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({
      ...backup,
      backupSize: backup.backupSize ? Number(backup.backupSize) : null,
      metadata: backup.metadata ? JSON.parse(backup.metadata) : null,
    });
  } catch (error) {
    logger.error('Get backup error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch backup' });
  }
};

/**
 * Get backup statistics
 * GET /api/v1/backup/stats
 */
export const getBackupStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await BackupService.getBackupStats();

    res.json({
      ...stats,
      totalSize: Number(stats.totalSize),
      lastBackup: stats.lastBackup ? {
        ...stats.lastBackup,
        backupSize: stats.lastBackup.backupSize ? Number(stats.lastBackup.backupSize) : null,
        metadata: stats.lastBackup.metadata ? JSON.parse(stats.lastBackup.metadata) : null,
      } : null,
    });
  } catch (error) {
    logger.error('Get backup stats error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch backup statistics' });
  }
};

/**
 * Get backup schedules
 * GET /api/v1/backup/schedule
 */
export const getBackupSchedules = async (req: AuthRequest, res: Response) => {
  try {
    const schedules = await prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      schedules: schedules.map(schedule => ({
        ...schedule,
        metadata: schedule.metadata ? JSON.parse(schedule.metadata) : null,
      })),
    });
  } catch (error) {
    logger.error('Get backup schedules error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch backup schedules' });
  }
};

/**
 * Create or update backup schedule
 * PUT /api/v1/backup/schedule
 */
export const updateBackupSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const validation = updateScheduleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error });
    }

    const { frequency, time, isEnabled, backupType, retention } = validation.data;

    // Check if schedule for this frequency already exists
    const existing = await prisma.backupSchedule.findFirst({
      where: { frequency },
    });

    // Calculate next run time
    const nextRun = calculateNextRun(time, frequency);

    let schedule;
    if (existing) {
      // Update existing schedule
      schedule = await prisma.backupSchedule.update({
        where: { id: existing.id },
        data: {
          time,
          isEnabled: isEnabled ?? existing.isEnabled,
          backupType: backupType ?? existing.backupType,
          nextRun,
          metadata: JSON.stringify({ retention: retention || 30 }),
        },
      });
    } else {
      // Create new schedule
      schedule = await prisma.backupSchedule.create({
        data: {
          frequency,
          time,
          isEnabled: isEnabled ?? true,
          backupType: backupType || BackupType.INCREMENTAL,
          nextRun,
          metadata: JSON.stringify({ retention: retention || 30 }),
        },
      });
    }

    res.json({
      ...schedule,
      metadata: schedule.metadata ? JSON.parse(schedule.metadata) : null,
    });
  } catch (error) {
    logger.error('Update backup schedule error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to update backup schedule' });
  }
};

/**
 * Delete backup schedule
 * DELETE /api/v1/backup/schedule/:id
 */
export const deleteBackupSchedule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.backupSchedule.delete({
      where: { id },
    });

    res.json({ message: 'Backup schedule deleted successfully' });
  } catch (error) {
    logger.error('Delete backup schedule error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete backup schedule' });
  }
};

/**
 * List restore points
 * GET /api/v1/restore/points
 */
export const listRestorePoints = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const restorePoints = await RestoreService.listRestorePoints(limit, offset);
    const total = await prisma.restorePoint.count();

    res.json({
      restorePoints: restorePoints.map(point => ({
        ...point,
        metadata: point.metadata ? JSON.parse(point.metadata) : null,
        backup: {
          ...point.backup,
          backupSize: point.backup.backupSize ? Number(point.backup.backupSize) : null,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('List restore points error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch restore points' });
  }
};

/**
 * Get restore point by ID
 * GET /api/v1/restore/points/:id
 */
export const getRestorePointById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const restorePoint = await RestoreService.getRestorePointById(id);
    if (!restorePoint) {
      return res.status(404).json({ error: 'Restore point not found' });
    }

    res.json({
      ...restorePoint,
      metadata: restorePoint.metadata ? JSON.parse(restorePoint.metadata) : null,
      backup: {
        ...restorePoint.backup,
        backupSize: restorePoint.backup.backupSize ? Number(restorePoint.backup.backupSize) : null,
        metadata: restorePoint.backup.metadata ? JSON.parse(restorePoint.backup.metadata) : null,
      },
    });
  } catch (error) {
    logger.error('Get restore point error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch restore point' });
  }
};

/**
 * Start restore from restore point
 * POST /api/v1/restore/:pointId
 */
export const startRestore = async (req: AuthRequest, res: Response) => {
  try {
    const { pointId } = req.params;

    const validation = restoreSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Invalid request data', details: validation.error });
    }

    const result = await RestoreService.restoreFromPoint(pointId, validation.data);

    if (result.success) {
      res.json({
        message: result.dryRun ? 'Dry run completed successfully' : 'Restore completed successfully',
        result,
      });
    } else {
      res.status(500).json({
        message: 'Restore failed',
        result,
      });
    }
  } catch (error) {
    logger.error('Start restore error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to start restore',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Point-in-time restore
 * POST /api/v1/restore/point-in-time
 */
export const pointInTimeRestore = async (req: AuthRequest, res: Response) => {
  try {
    const { timestamp, ...options } = req.body;

    if (!timestamp) {
      return res.status(400).json({ error: 'Timestamp is required' });
    }

    const result = await RestoreService.pointInTimeRestore(new Date(timestamp), options);

    if (result.success) {
      res.json({
        message: result.dryRun ? 'Dry run completed successfully' : 'Point-in-time restore completed successfully',
        result,
      });
    } else {
      res.status(500).json({
        message: 'Point-in-time restore failed',
        result,
      });
    }
  } catch (error) {
    logger.error('Point-in-time restore error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Failed to perform point-in-time restore',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Dry run restore
 * POST /api/v1/restore/:pointId/dry-run
 */
export const dryRunRestore = async (req: AuthRequest, res: Response) => {
  try {
    const { pointId } = req.params;

    const result = await RestoreService.dryRunRestore(pointId);

    res.json({
      message: 'Dry run completed',
      result,
    });
  } catch (error) {
    logger.error('Dry run restore error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to perform dry run restore' });
  }
};

/**
 * Test restore capability
 * GET /api/v1/restore/:pointId/test
 */
export const testRestore = async (req: AuthRequest, res: Response) => {
  try {
    const { pointId } = req.params;

    const result = await RestoreService.testRestore(pointId);

    res.json(result);
  } catch (error) {
    logger.error('Test restore error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to test restore' });
  }
};

/**
 * Get restore statistics
 * GET /api/v1/restore/stats
 */
export const getRestoreStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await RestoreService.getRestoreStats();

    res.json(stats);
  } catch (error) {
    logger.error('Get restore stats error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to fetch restore statistics' });
  }
};

/**
 * Clean up old backups
 * POST /api/v1/backup/cleanup
 */
export const cleanupOldBackups = async (req: AuthRequest, res: Response) => {
  try {
    await BackupService.cleanupOldBackups();

    res.json({ message: 'Old backups cleaned up successfully' });
  } catch (error) {
    logger.error('Cleanup old backups error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to clean up old backups' });
  }
};

/**
 * Delete backup
 * DELETE /api/v1/backup/jobs/:id
 */
export const deleteBackup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const backup = await BackupService.getBackupById(id);
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete backup file if local
    if (!backup.location.startsWith('s3://')) {
      const fs = require('fs/promises');
      await fs.unlink(backup.location).catch(() => {});
    }

    // Delete backup record
    await prisma.backupJob.delete({
      where: { id },
    });

    res.json({ message: 'Backup deleted successfully' });
  } catch (error) {
    logger.error('Delete backup error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to delete backup' });
  }
};

/**
 * Helper function to calculate next run time
 */
function calculateNextRun(time: string, frequency: BackupFrequency): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const nextRun = new Date(now);

  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case BackupFrequency.DAILY:
      // If time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case BackupFrequency.WEEKLY:
      // Schedule for next Monday at the specified time
      const daysUntilMonday = (8 - nextRun.getDay()) % 7;
      nextRun.setDate(nextRun.getDate() + (daysUntilMonday || 7));
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;

    case BackupFrequency.MONTHLY:
      // Schedule for first day of next month
      nextRun.setMonth(nextRun.getMonth() + 1, 1);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}
