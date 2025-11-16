import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as quotaController from '../controllers/quota.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Quota
 *   description: API quota and rate limit management
 */

/**
 * @swagger
 * /api/v1/quota/usage:
 *   get:
 *     summary: Get current API usage
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current usage statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/usage', authenticate, quotaController.getCurrentUsage);

/**
 * @swagger
 * /api/v1/quota/limits:
 *   get:
 *     summary: Get quota limits and remaining quota
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quota limits and remaining quota
 *       401:
 *         description: Unauthorized
 */
router.get('/limits', authenticate, quotaController.getQuotaLimits);

/**
 * @swagger
 * /api/v1/quota/report:
 *   get:
 *     summary: Get comprehensive usage report
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comprehensive usage report
 *       401:
 *         description: Unauthorized
 */
router.get('/report', authenticate, quotaController.getUsageReport);

/**
 * @swagger
 * /api/v1/quota/history:
 *   get:
 *     summary: Get usage history with time series data
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [HOUR, DAY, MONTH]
 *         description: Time period for usage data
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for history
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for history
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to retrieve
 *     responses:
 *       200:
 *         description: Usage history data
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticate, quotaController.getUsageHistory);

/**
 * @swagger
 * /api/v1/quota/violations:
 *   get:
 *     summary: Get rate limit violation history
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of violations to retrieve
 *     responses:
 *       200:
 *         description: Violation history
 *       401:
 *         description: Unauthorized
 */
router.get('/violations', authenticate, quotaController.getViolations);

/**
 * @swagger
 * /api/v1/quota/top-endpoints:
 *   get:
 *     summary: Get top API endpoints by usage
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [HOUR, DAY, MONTH]
 *           default: DAY
 *         description: Time period for analysis
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of endpoints to return
 *     responses:
 *       200:
 *         description: Top endpoints by usage
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.get('/top-endpoints', authenticate, quotaController.getTopEndpoints);

/**
 * @swagger
 * /api/v1/quota/check/{endpoint}:
 *   get:
 *     summary: Check if specific endpoint is within quota limits
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: endpoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Endpoint path to check
 *     responses:
 *       200:
 *         description: Quota check result
 *       401:
 *         description: Unauthorized
 */
router.get('/check/:endpoint', authenticate, quotaController.checkEndpointQuota);

/**
 * @swagger
 * /api/v1/quota/tiers:
 *   get:
 *     summary: Get available quota tiers with limits
 *     tags: [Quota]
 *     responses:
 *       200:
 *         description: Available quota tiers
 */
router.get('/tiers', quotaController.getAvailableTiers);

/**
 * @swagger
 * /api/v1/quota/upgrade:
 *   post:
 *     summary: Upgrade quota tier
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tier
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [FREE, PRO, ENTERPRISE]
 *     responses:
 *       200:
 *         description: Quota tier upgraded successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/upgrade', authenticate, quotaController.upgradeQuotaTier);

/**
 * @swagger
 * /api/v1/quota/reset:
 *   post:
 *     summary: Reset quota (admin only)
 *     tags: [Quota]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quota reset successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/reset', authenticate, quotaController.resetQuota);

export default router;
