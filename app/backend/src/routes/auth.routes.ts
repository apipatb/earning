import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply rate limiting to authentication endpoints
// 5 requests per 15 minutes to prevent brute force attacks
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;
