import { Router } from 'express';
import {
  mobileLogin,
  handleDeepLink,
  getMobileConfig,
  registerDevice,
} from '../controllers/mobile.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/mobile-login:
 *   post:
 *     summary: Mobile-specific login
 *     description: Authenticate user for mobile app with device registration
 *     tags: [Mobile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *               pushToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/mobile-login', mobileLogin);

/**
 * @swagger
 * /api/v1/auth/deep-link/{token}:
 *   get:
 *     summary: Deep link authentication
 *     description: Authenticate user via magic link token
 *     tags: [Mobile]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid or expired token
 */
router.get('/deep-link/:token', handleDeepLink);

/**
 * @swagger
 * /api/v1/mobile/config:
 *   get:
 *     summary: Get mobile app configuration
 *     description: Retrieve app settings and feature flags
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 */
router.get('/config', getMobileConfig);

/**
 * @swagger
 * /api/v1/mobile/device:
 *   post:
 *     summary: Register device for push notifications
 *     description: Register mobile device for push notifications
 *     tags: [Mobile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - deviceName
 *               - pushToken
 *               - platform
 *             properties:
 *               deviceId:
 *                 type: string
 *               deviceName:
 *                 type: string
 *               pushToken:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *     responses:
 *       200:
 *         description: Device registered successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/device', authenticate, registerDevice);

export default router;
