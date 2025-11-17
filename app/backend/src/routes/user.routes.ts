import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/user.controller';
import { updateUserLanguage } from '../controllers/i18n.controller';
import { passwordResetLimiter, strictLimiter } from '../middleware/rateLimit';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
// Apply strict rate limiting to password changes (3 per hour)
router.post('/change-password', passwordResetLimiter, changePassword);
router.post('/language', updateUserLanguage);
// Apply strict rate limiting to account deletion (10 per hour)
router.delete('/account', strictLimiter, deleteAccount);

export default router;
