import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  triggerBackup,
  listBackups,
  getBackupById,
  getBackupStats,
  getBackupSchedules,
  updateBackupSchedule,
  deleteBackupSchedule,
  listRestorePoints,
  getRestorePointById,
  startRestore,
  pointInTimeRestore,
  dryRunRestore,
  testRestore,
  getRestoreStats,
  cleanupOldBackups,
  deleteBackup,
} from '../controllers/backup.controller';

const router = Router();

// All backup/restore routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/backup/now:
 *   post:
 *     summary: Trigger immediate backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [FULL, INCREMENTAL]
 *                 description: Backup type
 *               encrypt:
 *                 type: boolean
 *                 description: Enable encryption
 *               compress:
 *                 type: boolean
 *                 description: Enable compression
 *               includeFiles:
 *                 type: boolean
 *                 description: Include file backups
 *               retention:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Retention period in days
 *     responses:
 *       201:
 *         description: Backup created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/backup/now', triggerBackup);

/**
 * @swagger
 * /api/v1/backup/jobs:
 *   get:
 *     summary: List all backup jobs
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Backup jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/backup/jobs', listBackups);

/**
 * @swagger
 * /api/v1/backup/jobs/{id}:
 *   get:
 *     summary: Get backup job by ID
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Backup job ID
 *     responses:
 *       200:
 *         description: Backup job retrieved successfully
 *       404:
 *         description: Backup not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/backup/jobs/:id', getBackupById);

/**
 * @swagger
 * /api/v1/backup/jobs/{id}:
 *   delete:
 *     summary: Delete backup job
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Backup job ID
 *     responses:
 *       200:
 *         description: Backup deleted successfully
 *       404:
 *         description: Backup not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/backup/jobs/:id', deleteBackup);

/**
 * @swagger
 * /api/v1/backup/stats:
 *   get:
 *     summary: Get backup statistics
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/backup/stats', getBackupStats);

/**
 * @swagger
 * /api/v1/backup/schedule:
 *   get:
 *     summary: Get backup schedules
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup schedules retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/backup/schedule', getBackupSchedules);

/**
 * @swagger
 * /api/v1/backup/schedule:
 *   put:
 *     summary: Create or update backup schedule
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - frequency
 *               - time
 *             properties:
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY]
 *                 description: Backup frequency
 *               time:
 *                 type: string
 *                 pattern: '^([01]\d|2[0-3]):([0-5]\d)$'
 *                 description: Time in HH:MM format
 *               isEnabled:
 *                 type: boolean
 *                 description: Enable/disable schedule
 *               backupType:
 *                 type: string
 *                 enum: [FULL, INCREMENTAL]
 *                 description: Type of backup
 *               retention:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 description: Retention period in days
 *     responses:
 *       200:
 *         description: Backup schedule updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/backup/schedule', updateBackupSchedule);

/**
 * @swagger
 * /api/v1/backup/schedule/{id}:
 *   delete:
 *     summary: Delete backup schedule
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Schedule ID
 *     responses:
 *       200:
 *         description: Schedule deleted successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/backup/schedule/:id', deleteBackupSchedule);

/**
 * @swagger
 * /api/v1/backup/cleanup:
 *   post:
 *     summary: Clean up old backups based on retention policy
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Old backups cleaned up successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/backup/cleanup', cleanupOldBackups);

/**
 * @swagger
 * /api/v1/restore/points:
 *   get:
 *     summary: List all restore points
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Restore points retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/restore/points', listRestorePoints);

/**
 * @swagger
 * /api/v1/restore/points/{id}:
 *   get:
 *     summary: Get restore point by ID
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Restore point ID
 *     responses:
 *       200:
 *         description: Restore point retrieved successfully
 *       404:
 *         description: Restore point not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/restore/points/:id', getRestorePointById);

/**
 * @swagger
 * /api/v1/restore/{pointId}:
 *   post:
 *     summary: Start restore from restore point
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restore point ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dryRun:
 *                 type: boolean
 *                 description: Perform dry run without making changes
 *               verifyIntegrity:
 *                 type: boolean
 *                 description: Verify restore integrity
 *               restoreDatabase:
 *                 type: boolean
 *                 description: Restore database
 *               restoreFiles:
 *                 type: boolean
 *                 description: Restore files
 *               targetPath:
 *                 type: string
 *                 description: Target path for file restore
 *     responses:
 *       200:
 *         description: Restore completed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/restore/:pointId', startRestore);

/**
 * @swagger
 * /api/v1/restore/{pointId}/dry-run:
 *   post:
 *     summary: Perform dry run restore
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restore point ID
 *     responses:
 *       200:
 *         description: Dry run completed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/restore/:pointId/dry-run', dryRunRestore);

/**
 * @swagger
 * /api/v1/restore/{pointId}/test:
 *   get:
 *     summary: Test restore capability
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pointId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restore point ID
 *     responses:
 *       200:
 *         description: Test completed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/restore/:pointId/test', testRestore);

/**
 * @swagger
 * /api/v1/restore/point-in-time:
 *   post:
 *     summary: Perform point-in-time restore
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - timestamp
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Target restore timestamp
 *               dryRun:
 *                 type: boolean
 *                 description: Perform dry run
 *               verifyIntegrity:
 *                 type: boolean
 *                 description: Verify restore integrity
 *               restoreDatabase:
 *                 type: boolean
 *                 description: Restore database
 *               restoreFiles:
 *                 type: boolean
 *                 description: Restore files
 *     responses:
 *       200:
 *         description: Point-in-time restore completed
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/restore/point-in-time', pointInTimeRestore);

/**
 * @swagger
 * /api/v1/restore/stats:
 *   get:
 *     summary: Get restore statistics
 *     tags: [Restore]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Restore statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/restore/stats', getRestoreStats);

export default router;
