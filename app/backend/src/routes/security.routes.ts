import { Router } from 'express';
import {
  setup2FA,
  enable2FA,
  verify2FA,
  disable2FA,
  addWhitelistedIP,
  getWhitelistedIPs,
  removeWhitelistedIP,
  getActiveSessions,
  revokeSession,
  getAuditLog,
  requestDataExport,
  requestDataDeletion,
  cancelDataDeletion,
  getSecuritySettings,
} from '../controllers/security.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// 2FA routes
router.post('/2fa/setup', auth, setup2FA);
router.post('/2fa/enable', auth, enable2FA);
router.post('/2fa/verify', auth, verify2FA);
router.post('/2fa/disable', auth, disable2FA);

// IP Whitelist routes
router.post('/ip-whitelist', auth, addWhitelistedIP);
router.get('/ip-whitelist', auth, getWhitelistedIPs);
router.delete('/ip-whitelist/:ipId', auth, removeWhitelistedIP);

// Session management routes
router.get('/sessions', auth, getActiveSessions);
router.delete('/sessions/:sessionId', auth, revokeSession);

// Audit log routes
router.get('/audit-log', auth, getAuditLog);

// Data privacy routes (GDPR compliant)
router.post('/data/export', auth, requestDataExport);
router.post('/data/delete', auth, requestDataDeletion);
router.delete('/data/delete/:requestId', auth, cancelDataDeletion);

// Security settings
router.get('/settings', auth, getSecuritySettings);

export default router;
