import { Router, Response, Request } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { logDebug, logError, logInfo } from '../lib/logger';
import ExportService from '../services/export.service';
import BackupService from '../services/backup.service';
import { promises as fsPromises } from 'fs';
import { AuthRequest } from '../types';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/v1/export/json
 * Full data backup as JSON
 */
router.get('/json', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dateFrom, dateTo } = req.query;

    const options: any = {};
    if (dateFrom) options.dateFrom = new Date(dateFrom as string);
    if (dateTo) options.dateTo = new Date(dateTo as string);

    logInfo('Exporting data as JSON', { userId });

    const result = await ExportService.exportToJSON(userId, options);

    // Send file for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    const fileStream = (await import('fs')).createReadStream(result.filepath);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      // Clean up temp file
      await fsPromises.unlink(result.filepath).catch(() => {});
    });
  } catch (error) {
    logError('JSON export failed', error as Error);
    res.status(500).json({
      error: 'Failed to export data',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/csv/:dataType
 * Export specific data type as CSV
 * dataType: earnings, invoices, customers, expenses, sales, products
 */
router.get('/csv/:dataType', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { dataType } = req.params;
    const { dateFrom, dateTo } = req.query;

    const validTypes = ['earnings', 'invoices', 'customers', 'expenses', 'sales', 'products'];
    if (!validTypes.includes(dataType)) {
      return res.status(400).json({
        error: 'Invalid data type',
        validTypes,
      });
    }

    const options: any = {};
    if (dateFrom) options.dateFrom = new Date(dateFrom as string);
    if (dateTo) options.dateTo = new Date(dateTo as string);

    logInfo('Exporting CSV', { userId, dataType });

    const result = await ExportService.exportToCSV(
      userId,
      dataType as any,
      options
    );

    // Send file for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    const fileStream = (await import('fs')).createReadStream(result.filepath);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      // Clean up temp file
      await fsPromises.unlink(result.filepath).catch(() => {});
    });
  } catch (error) {
    logError('CSV export failed', error as Error);
    res.status(500).json({
      error: 'Failed to export CSV',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/pdf/:reportType
 * Generate PDF reports
 * reportType: summary, earnings, invoices, financial
 */
router.get('/pdf/:reportType', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { reportType } = req.params;

    const validReports = ['summary', 'earnings', 'invoices', 'financial'];
    if (!validReports.includes(reportType)) {
      return res.status(400).json({
        error: 'Invalid report type',
        validReports,
      });
    }

    logInfo('Generating PDF report', { userId, reportType });

    const result = await ExportService.exportToPDF(userId, reportType as any);

    // Send file for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    const fileStream = (await import('fs')).createReadStream(result.filepath);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      // Clean up temp file
      await fsPromises.unlink(result.filepath).catch(() => {});
    });
  } catch (error) {
    logError('PDF export failed', error as Error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/excel/:dataType
 * Export to Excel format
 */
router.get('/excel/:dataType', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { dataType } = req.params;
    const { dateFrom, dateTo } = req.query;

    const validTypes = ['earnings', 'invoices', 'customers', 'expenses', 'sales', 'products'];
    if (!validTypes.includes(dataType)) {
      return res.status(400).json({
        error: 'Invalid data type',
        validTypes,
      });
    }

    const options: any = {};
    if (dateFrom) options.dateFrom = new Date(dateFrom as string);
    if (dateTo) options.dateTo = new Date(dateTo as string);

    logInfo('Exporting to Excel', { userId, dataType });

    const result = await ExportService.exportToExcel(
      userId,
      dataType as any,
      options
    );

    // Send file for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    const fileStream = (await import('fs')).createReadStream(result.filepath);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      // Clean up temp file
      await fsPromises.unlink(result.filepath).catch(() => {});
    });
  } catch (error) {
    logError('Excel export failed', error as Error);
    res.status(500).json({
      error: 'Failed to export Excel',
      message: (error as Error).message,
    });
  }
});

// ===== BACKUP ROUTES =====

/**
 * POST /api/v1/export/backup
 * Create a manual backup
 */
router.post('/backup', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { expiresInDays } = req.body;

    logInfo('Creating manual backup', { userId });

    const backup = await BackupService.createBackup(userId, {
      backupType: 'manual',
      expiresInDays,
    });

    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      backup,
    });
  } catch (error) {
    logError('Backup creation failed', error as Error);
    res.status(500).json({
      error: 'Failed to create backup',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/backups
 * List all backups for user
 */
router.get('/backups', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    logDebug('Listing backups', { userId, limit, offset });

    const result = await BackupService.listBackups(userId, limit, offset);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logError('Failed to list backups', error as Error);
    res.status(500).json({
      error: 'Failed to list backups',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/backups/:backupId
 * Get backup details
 */
router.get('/backups/:backupId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { backupId } = req.params;

    const backup = await BackupService.getBackupDetails(userId, backupId);

    res.json({
      success: true,
      backup,
    });
  } catch (error) {
    logError('Failed to get backup details', error as Error);
    res.status(500).json({
      error: 'Failed to get backup details',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/export/backups/:backupId/restore
 * Restore from a backup
 */
router.post('/backups/:backupId/restore', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { backupId } = req.params;

    logInfo('Restoring from backup', { userId, backupId });

    const result = await BackupService.restoreBackup(userId, backupId, userId);

    res.json({
      success: true,
      message: 'Backup restored successfully',
      result,
    });
  } catch (error) {
    logError('Backup restore failed', error as Error);
    res.status(500).json({
      error: 'Failed to restore backup',
      message: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/v1/export/backups/:backupId
 * Delete a backup
 */
router.delete('/backups/:backupId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { backupId } = req.params;

    logInfo('Deleting backup', { userId, backupId });

    const result = await BackupService.deleteBackup(userId, backupId);

    res.json({
      success: true,
      message: 'Backup deleted successfully',
      result,
    });
  } catch (error) {
    logError('Failed to delete backup', error as Error);
    res.status(500).json({
      error: 'Failed to delete backup',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/export/backups/:backupId/verify
 * Verify backup integrity
 */
router.post('/backups/:backupId/verify', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { backupId } = req.params;

    logDebug('Verifying backup integrity', { userId, backupId });

    const result = await BackupService.verifyBackup(userId, backupId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logError('Backup verification failed', error as Error);
    res.status(500).json({
      error: 'Failed to verify backup',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/backups/stats
 * Get backup statistics
 */
router.get('/backups/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await BackupService.getBackupStatistics(userId);

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error) {
    logError('Failed to get backup statistics', error as Error);
    res.status(500).json({
      error: 'Failed to get backup statistics',
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/v1/export/import
 * Import data from JSON backup
 */
router.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { backupData } = req.body;

    if (!backupData) {
      return res.status(400).json({
        error: 'Missing backup data',
      });
    }

    logInfo('Importing backup data', { userId });

    // Parse and validate backup data
    let importedData;
    if (typeof backupData === 'string') {
      importedData = JSON.parse(backupData);
    } else {
      importedData = backupData;
    }

    // Validate backup structure
    if (!importedData.backup || !importedData.data) {
      return res.status(400).json({
        error: 'Invalid backup format',
      });
    }

    // Count records to be imported
    const recordCounts = importedData.recordCounts || {};

    res.json({
      success: true,
      message: 'Backup data validated and ready for import',
      recordCounts,
      note: 'Use the restore backup feature to restore data from a previously created backup',
    });
  } catch (error) {
    logError('Backup import failed', error as Error);
    res.status(500).json({
      error: 'Failed to import backup',
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/v1/export/health
 * Health check for export service
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'export',
    timestamp: new Date().toISOString(),
  });
});

export default router;
