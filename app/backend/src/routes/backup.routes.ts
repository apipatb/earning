import { Router } from 'express';
import {
  createBackup,
  getBackups,
  getBackupById,
  deleteBackup,
  createRestorePoint,
  getRestorePoints,
  restoreFromPoint,
  archiveData,
  getArchives,
  getRecoveryHistory,
  getRecoveryStatus,
  setBackupStrategy,
  getBackupStrategy,
  getBackupCompliance,
  listPointInTimeSnapshots,
  verifyBackup,
  getBackupVerifications,
} from '../controllers/backup.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Backup Management
router.post('/', auth, createBackup);
router.get('/', auth, getBackups);
router.get('/:backupId', auth, getBackupById);
router.delete('/:backupId', auth, deleteBackup);

// Restore Points
router.post('/:backupId/restore-points', auth, createRestorePoint);
router.get('/:backupId/restore-points', auth, getRestorePoints);
router.post('/restore-points/:pointId/restore', auth, restoreFromPoint);

// Data Archival
router.post('/archive', auth, archiveData);
router.get('/archives', auth, getArchives);

// Recovery Operations
router.get('/recovery/history', auth, getRecoveryHistory);
router.get('/recovery/:recoveryId/status', auth, getRecoveryStatus);

// Backup Strategy
router.post('/strategy', auth, setBackupStrategy);
router.get('/strategy', auth, getBackupStrategy);

// Compliance
router.get('/compliance', auth, getBackupCompliance);

// Point-in-Time Recovery
router.get('/pit/snapshots', auth, listPointInTimeSnapshots);

// Verification
router.post('/:backupId/verify', auth, verifyBackup);
router.get('/:backupId/verifications', auth, getBackupVerifications);

export default router;
