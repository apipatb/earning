import { Router } from 'express';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getCredentials,
  deleteCredential,
} from '../controllers/webauthn.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Registration endpoints (require authentication to add credentials)
router.post('/register/options', authenticate, getRegistrationOptions);
router.post('/register/verify', authenticate, verifyRegistration);

// Authentication endpoints (public - no auth required for login)
router.post('/authenticate/options', getAuthenticationOptions);
router.post('/authenticate/verify', verifyAuthentication);

// Credential management endpoints (require authentication)
router.get('/credentials', authenticate, getCredentials);
router.delete('/credentials/:id', authenticate, deleteCredential);

export default router;
