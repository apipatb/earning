import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  setupTOTP,
  setupSMS,
  setupEmail,
  verifyAndEnable,
  verify,
  sendCode,
  disable,
  getStatus,
  regenerateBackupCodes,
  getLogs,
} from '../controllers/2fa.controller';

const router = Router();

// All 2FA routes require authentication
router.use(authenticate);

// Setup routes
router.post('/setup/totp', setupTOTP);
router.post('/setup/sms', setupSMS);
router.post('/setup/email', setupEmail);

// Enable/Verify routes
router.post('/enable', verifyAndEnable);
router.post('/verify', verify);
router.post('/send-code', sendCode);

// Management routes
router.post('/disable', disable);
router.get('/status', getStatus);
router.post('/backup-codes', regenerateBackupCodes);
router.get('/logs', getLogs);

export default router;
