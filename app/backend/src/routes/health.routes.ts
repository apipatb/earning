import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  basicHealthCheck,
  getDetailedMetrics,
  getServiceStatus,
  getHealthAlerts,
  resolveHealthAlert,
  getMetricsHistory,
  getCurrentSystemMetrics,
  triggerHealthCheck,
  getServiceHealthDetails,
} from '../controllers/health.controller';

const router = Router();

// Public health check endpoint (no authentication)
router.get('/health', basicHealthCheck);

// API routes require authentication
const apiRouter = Router();
apiRouter.use(authenticate);

/**
 * @swagger
 * /api/v1/health/metrics:
 *   get:
 *     summary: Get detailed health metrics
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed health metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.get('/metrics', getDetailedMetrics);

/**
 * @swagger
 * /api/v1/health/system:
 *   get:
 *     summary: Get current system metrics (CPU, Memory, Disk)
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.get('/system', getCurrentSystemMetrics);

/**
 * @swagger
 * /api/v1/health/services:
 *   get:
 *     summary: Get all service statuses
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Service statuses retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.get('/services', getServiceStatus);

/**
 * @swagger
 * /api/v1/health/services/{name}:
 *   get:
 *     summary: Get specific service health details
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *           enum: [database, redis, queue, bullmq, api]
 *         description: Service name
 *     responses:
 *       200:
 *         description: Service health details retrieved successfully
 *       404:
 *         description: Service not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.get('/services/:name', getServiceHealthDetails);

/**
 * @swagger
 * /api/v1/health/alerts:
 *   get:
 *     summary: Get health alerts
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter for active alerts only
 *     responses:
 *       200:
 *         description: Health alerts retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.get('/alerts', getHealthAlerts);

/**
 * @swagger
 * /api/v1/health/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve a health alert
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Alert ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolution:
 *                 type: string
 *                 description: Resolution notes
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.post('/alerts/:id/resolve', resolveHealthAlert);

/**
 * @swagger
 * /api/v1/health/metrics/history:
 *   get:
 *     summary: Get historical metrics data
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [CPU, MEMORY, DISK, API_LATENCY, RESPONSE_TIME, QUEUE_DEPTH, CACHE_HIT_RATE, DATABASE_CONNECTIONS, NETWORK]
 *         description: Filter by specific metric type
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
 *           default: 100
 *         description: Maximum number of records
 *     responses:
 *       200:
 *         description: Metrics history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.get('/metrics/history', getMetricsHistory);

/**
 * @swagger
 * /api/v1/health/check:
 *   post:
 *     summary: Trigger manual health check
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check completed successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
apiRouter.post('/check', triggerHealthCheck);

// Mount API router
router.use('/api/v1/health', apiRouter);

export default router;
