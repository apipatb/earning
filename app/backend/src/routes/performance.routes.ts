import { Router } from 'express';
import {
  getSystemHealth,
  recordPerformanceMetric,
  getPerformanceMetrics,
  getPerformanceAnalytics,
  recordError,
  getErrorLogs,
  getErrorAnalytics,
  recordUptimeCheck,
  getUptimeStatus,
  getDatabaseHealth,
  createHealthAlert,
  getHealthAlerts,
  resolveHealthAlert,
  getServiceStatus,
  getMonitoringDashboard,
} from '../controllers/performance.controller';
import { auth } from '../middleware/auth.middleware';

const router = Router();

// System Health
router.get('/health', getSystemHealth);
router.get('/health/database', getDatabaseHealth);
router.get('/health/alerts', auth, getHealthAlerts);
router.post('/health/alerts', auth, createHealthAlert);
router.put('/health/alerts/:alertId/resolve', auth, resolveHealthAlert);

// Performance Metrics
router.post('/metrics', auth, recordPerformanceMetric);
router.get('/metrics', auth, getPerformanceMetrics);
router.get('/metrics/analytics', auth, getPerformanceAnalytics);

// Error Tracking
router.post('/errors', auth, recordError);
router.get('/errors', auth, getErrorLogs);
router.get('/errors/analytics', auth, getErrorAnalytics);

// Uptime Monitoring
router.post('/uptime', auth, recordUptimeCheck);
router.get('/uptime/:serviceName', getUptimeStatus);

// Service Status
router.get('/status', getServiceStatus);

// Dashboard
router.get('/dashboard', auth, getMonitoringDashboard);

export default router;
