import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
} from '../controllers/user.controller';
import { updateUserLanguage } from '../controllers/i18n.controller';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);
router.post('/language', updateUserLanguage);
router.delete('/account', deleteAccount);

export default router;
