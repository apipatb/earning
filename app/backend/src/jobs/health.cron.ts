import cron from 'node-cron';
import { logger } from '../utils/logger';
import healthService from '../services/health.service';

/**
 * Health Monitoring Cron Jobs
 *
 * Schedules:
 * - System metrics check: Every 1 minute
 * - Service status check: Every 5 minutes
 * - Metrics cleanup: Daily at 2 AM
 */

/**
 * Check system metrics every 1 minute
 * Monitors CPU, Memory, Disk usage
 */
export const systemMetricsJob = cron.schedule('* * * * *', async () => {
  try {
    logger.debug('Running system metrics check...');
    const metrics = await healthService.getSystemMetrics();

    // Record metrics
    await Promise.all([
      healthService.recordMetric('CPU', metrics.cpu, 80),
      healthService.recordMetric('MEMORY', metrics.memory, 85),
      healthService.recordMetric('DISK', metrics.disk, 90),
    ]);

    // Check thresholds and create alerts if needed
    if (metrics.cpu > 80) {
      await healthService.createAlert(
        'System',
        'CRITICAL',
        'CRITICAL',
        `High CPU usage: ${metrics.cpu}%`,
        { cpu: metrics.cpu, threshold: 80 }
      );
    }

    if (metrics.memory > 85) {
      await healthService.createAlert(
        'System',
        'CRITICAL',
        'CRITICAL',
        `High memory usage: ${metrics.memory}%`,
        { memory: metrics.memory, threshold: 85 }
      );
    }

    if (metrics.disk > 90) {
      await healthService.createAlert(
        'System',
        'WARNING',
        'WARNING',
        `High disk usage: ${metrics.disk}%`,
        { disk: metrics.disk, threshold: 90 }
      );
    }

    logger.debug('System metrics check completed', metrics);
  } catch (error) {
    logger.error('System metrics job error:', error instanceof Error ? error : new Error(String(error)));
  }
}, {
  scheduled: false, // Don't start automatically
});

/**
 * Check service health every 5 minutes
 * Monitors Database, Redis, Queue, API
 */
export const serviceHealthJob = cron.schedule('*/5 * * * *', async () => {
  try {
    logger.debug('Running service health check...');
    await healthService.performPeriodicHealthCheck();
    logger.debug('Service health check completed');
  } catch (error) {
    logger.error('Service health job error:', error instanceof Error ? error : new Error(String(error)));
  }
}, {
  scheduled: false,
});

/**
 * Cleanup old metrics daily at 2 AM
 * Removes metrics older than 7 days
 */
export const metricsCleanupJob = cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Running metrics cleanup...');
    const deleted = await healthService.cleanupOldMetrics();
    logger.info(`Metrics cleanup completed. Deleted ${deleted} old records.`);
  } catch (error) {
    logger.error('Metrics cleanup job error:', error instanceof Error ? error : new Error(String(error)));
  }
}, {
  scheduled: false,
});

/**
 * Start all health monitoring cron jobs
 */
export const startHealthCronJobs = () => {
  logger.info('Starting health monitoring cron jobs...');

  systemMetricsJob.start();
  logger.info('System metrics job started (every 1 minute)');

  serviceHealthJob.start();
  logger.info('Service health job started (every 5 minutes)');

  metricsCleanupJob.start();
  logger.info('Metrics cleanup job started (daily at 2 AM)');
};

/**
 * Stop all health monitoring cron jobs
 */
export const stopHealthCronJobs = () => {
  logger.info('Stopping health monitoring cron jobs...');

  systemMetricsJob.stop();
  serviceHealthJob.stop();
  metricsCleanupJob.stop();

  logger.info('Health monitoring cron jobs stopped');
};

/**
 * Get cron job statuses
 */
export const getHealthCronJobStatuses = () => {
  return {
    systemMetrics: {
      scheduled: systemMetricsJob.getStatus(),
      pattern: '* * * * *',
      description: 'Check system metrics every 1 minute',
    },
    serviceHealth: {
      scheduled: serviceHealthJob.getStatus(),
      pattern: '*/5 * * * *',
      description: 'Check service health every 5 minutes',
    },
    metricsCleanup: {
      scheduled: metricsCleanupJob.getStatus(),
      pattern: '0 2 * * *',
      description: 'Cleanup old metrics daily at 2 AM',
    },
  };
};
