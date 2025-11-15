import { Router } from 'express';
import {
  registerDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  queueSyncOperation,
  getSyncQueue,
  processSyncQueue,
  clearSyncQueue,
  reportSyncConflict,
  getSyncConflicts,
  resolveConflict,
  createDataVersion,
  getDataVersions,
  restoreDataVersion,
  getSyncStatus,
  getSyncLog,
  setSelectiveSync,
  getSelectiveSync,
  getSyncStatistics,
} from '../controllers/sync.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// Device Management
router.post('/devices', auth, registerDevice);
router.get('/devices', auth, getDevices);
router.get('/devices/:deviceId', auth, getDeviceById);
router.put('/devices/:deviceId', auth, updateDevice);
router.delete('/devices/:deviceId', auth, deleteDevice);

// Sync Queue Management
router.post('/queue', auth, queueSyncOperation);
router.get('/queue', auth, getSyncQueue);
router.post('/queue/process', auth, processSyncQueue);
router.post('/queue/clear', auth, clearSyncQueue);

// Conflict Resolution
router.post('/conflicts', auth, reportSyncConflict);
router.get('/conflicts', auth, getSyncConflicts);
router.put('/conflicts/:conflictId/resolve', auth, resolveConflict);

// Data Versioning
router.post('/versions', auth, createDataVersion);
router.get('/versions', auth, getDataVersions);
router.get('/versions/:versionId/restore', auth, restoreDataVersion);

// Sync Status & Monitoring
router.get('/status', auth, getSyncStatus);
router.get('/log', auth, getSyncLog);

// Selective Sync Configuration
router.post('/selective-sync', auth, setSelectiveSync);
router.get('/selective-sync', auth, getSelectiveSync);

// Sync Statistics
router.get('/statistics', auth, getSyncStatistics);

export default router;
