import { Router, Request, Response } from 'express';
import { logDebug, logError } from '../lib/logger';

const router = Router();

interface WebVitalMetric {
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  fcp?: number;
  dcl?: number;
  load?: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  status?: number;
  timestamp: number;
}

interface ComponentMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

interface MetricsPayload {
  webVitals: WebVitalMetric[];
  apiMetrics: ApiMetric[];
  componentMetrics: ComponentMetric[];
  sessionId: string;
  timestamp: number;
}

/**
 * POST /api/v1/metrics
 * Receive and store frontend performance metrics
 * No authentication required - metrics should always be collected
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const payload: MetricsPayload = req.body;

    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid metrics payload' });
    }

    const { webVitals = [], apiMetrics = [], componentMetrics = [], sessionId } = payload;

    // Log metrics summary
    if (webVitals.length > 0) {
      logDebug('Received Web Vitals metrics', {
        count: webVitals.length,
        sessionId,
        metrics: webVitals.map((m) => ({
          lcp: m.lcp,
          fid: m.fid,
          cls: m.cls,
          url: m.url,
        })),
      });
    }

    if (apiMetrics.length > 0) {
      logDebug('Received API performance metrics', {
        count: apiMetrics.length,
        sessionId,
        slowCalls: apiMetrics.filter((m) => m.duration > 1000).length,
      });
    }

    if (componentMetrics.length > 0) {
      logDebug('Received component performance metrics', {
        count: componentMetrics.length,
        sessionId,
        slowComponents: componentMetrics.filter((m) => m.renderTime > 100).length,
      });
    }

    // TODO: Store metrics in database or external metrics service
    // For now, just log them
    // In production, you might want to:
    // 1. Store in time-series DB (InfluxDB, Prometheus remote storage, etc.)
    // 2. Send to APM service (DataDog, New Relic, etc.)
    // 3. Analyze for trends and alerts

    // Analyze metrics for issues
    const issues: string[] = [];

    // Check for poor Core Web Vitals
    if (webVitals.length > 0) {
      const latestVital = webVitals[webVitals.length - 1];

      if (latestVital.lcp && latestVital.lcp > 2500) {
        issues.push(`Poor LCP: ${latestVital.lcp.toFixed(0)}ms`);
      }
      if (latestVital.fid && latestVital.fid > 100) {
        issues.push(`Poor FID: ${latestVital.fid.toFixed(0)}ms`);
      }
      if (latestVital.cls && latestVital.cls > 0.1) {
        issues.push(`Poor CLS: ${latestVital.cls.toFixed(2)}`);
      }
    }

    // Check for slow API calls
    const slowApiCalls = apiMetrics.filter((m) => m.duration > 1000);
    if (slowApiCalls.length > 0) {
      issues.push(`${slowApiCalls.length} slow API calls (>1s)`);
    }

    // Check for slow components
    const slowComponents = componentMetrics.filter((m) => m.renderTime > 100);
    if (slowComponents.length > 0) {
      issues.push(`${slowComponents.length} slow component renders (>100ms)`);
    }

    if (issues.length > 0) {
      logError('Performance issues detected', new Error(issues.join('; ')), {
        sessionId,
        url: webVitals[0]?.url,
      });
    }

    res.json({
      success: true,
      message: 'Metrics received successfully',
      issuesDetected: issues.length,
      issues: issues.length > 0 ? issues : undefined,
    });
  } catch (error) {
    logError('Error processing metrics', error as Error);
    res.status(500).json({ error: 'Failed to process metrics' });
  }
});

/**
 * GET /api/v1/metrics/health
 * Health check for metrics collection
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Metrics collection service is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/metrics/status
 * Get metrics collection status and statistics
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'active',
    collectionEnabled: true,
    supportedMetrics: [
      'webVitals',
      'apiPerformance',
      'componentRenderTimes',
      'memoryUsage',
      'interactionTiming',
    ],
    endpoints: {
      postMetrics: 'POST /api/v1/metrics',
      health: 'GET /api/v1/metrics/health',
      status: 'GET /api/v1/metrics/status',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
