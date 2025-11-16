import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getLiveMetrics,
  getTeamStatus,
  getSLAStatus,
  getQueueStatus,
  getPerformanceMetrics,
  getDashboardData,
} from '../controllers/monitoring.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/monitoring/metrics:
 *   get:
 *     summary: Get live monitoring metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Live metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/metrics', getLiveMetrics);

/**
 * @swagger
 * /api/v1/monitoring/team-status:
 *   get:
 *     summary: Get team member status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/team-status', getTeamStatus);

/**
 * @swagger
 * /api/v1/monitoring/sla-status:
 *   get:
 *     summary: Get SLA tracking status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/sla-status', getSLAStatus);

/**
 * @swagger
 * /api/v1/monitoring/queue:
 *   get:
 *     summary: Get queue status
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/queue', getQueueStatus);

/**
 * @swagger
 * /api/v1/monitoring/performance:
 *   get:
 *     summary: Get performance analytics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *         description: Time period for metrics
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/performance', getPerformanceMetrics);

/**
 * @swagger
 * /api/v1/monitoring/dashboard:
 *   get:
 *     summary: Get all monitoring dashboard data
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/dashboard', getDashboardData);

export default router;
