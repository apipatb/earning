/**
 * Performance monitoring and Core Web Vitals tracking for frontend
 * Sends metrics to backend /api/v1/metrics endpoint
 */

interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  dcl?: number; // DOMContentLoaded
  load?: number; // Window Load
  timestamp: number;
  url: string;
  userAgent: string;
}

interface ApiMetrics {
  endpoint: string;
  method: string;
  duration: number;
  status?: number;
  timestamp: number;
}

interface ComponentMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

const metricsQueue: PerformanceMetrics[] = [];
const apiMetricsQueue: ApiMetrics[] = [];
const componentMetricsQueue: ComponentMetrics[] = [];

// Configuration
const METRICS_API_ENDPOINT = '/api/v1/metrics';
const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds
const SEND_TIMEOUT = 5000; // 5 seconds

/**
 * Initialize performance monitoring
 * Should be called once in the app initialization
 */
export function initializePerformanceMonitoring(): void {
  // Track navigation timing
  if ('PerformanceObserver' in window) {
    // Observe Largest Contentful Paint
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            recordFCP(entry.startTime);
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('PerformanceObserver for paint not supported');
    }

    // Observe Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        recordLCP(lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('PerformanceObserver for LCP not supported');
    }

    // Observe Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue;
          cls += (entry as any).value;
        }
        recordCLS(cls);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('PerformanceObserver for CLS not supported');
    }

    // Observe First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          recordFID(entry.processingStart - entry.startTime);
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('PerformanceObserver for FID not supported');
    }
  }

  // Track navigation timing on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', recordNavigationTiming);
  } else {
    recordNavigationTiming();
  }

  // Set up periodic flushing
  setInterval(flushMetrics, FLUSH_INTERVAL);

  // Flush metrics before page unload
  window.addEventListener('beforeunload', () => {
    flushMetrics();
  });
}

/**
 * Record First Contentful Paint
 */
function recordFCP(time: number): void {
  updateMetrics({ fcp: time });
}

/**
 * Record Largest Contentful Paint
 */
export function recordLCP(time: number): void {
  updateMetrics({ lcp: time });
}

/**
 * Record Cumulative Layout Shift
 */
export function recordCLS(score: number): void {
  updateMetrics({ cls: score });
}

/**
 * Record First Input Delay
 */
export function recordFID(time: number): void {
  updateMetrics({ fid: time });
}

/**
 * Record navigation timing metrics
 */
function recordNavigationTiming(): void {
  const navigation = performance.getEntriesByType('navigation')[0] as any;
  const timing = performance.timing;

  if (navigation) {
    const metrics: any = {};
    if (navigation.domContentLoadedEventEnd) {
      metrics.dcl = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
    }
    if (navigation.loadEventEnd) {
      metrics.load = navigation.loadEventEnd - navigation.loadEventStart;
    }
    if (navigation.responseEnd && navigation.fetchStart) {
      metrics.ttfb = navigation.responseStart - navigation.fetchStart;
    }
    updateMetrics(metrics);
  }
}

/**
 * Update current metrics
 */
function updateMetrics(partial: Partial<PerformanceMetrics>): void {
  const now = Date.now();
  const existing = metricsQueue[metricsQueue.length - 1];

  const metrics: PerformanceMetrics = {
    lcp: existing?.lcp,
    fid: existing?.fid,
    cls: existing?.cls,
    ttfb: existing?.ttfb,
    fcp: existing?.fcp,
    dcl: existing?.dcl,
    load: existing?.load,
    timestamp: now,
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...partial,
  };

  // Only add if we have at least one metric
  if (
    metrics.lcp ||
    metrics.fid ||
    metrics.cls ||
    metrics.ttfb ||
    metrics.fcp ||
    metrics.dcl ||
    metrics.load
  ) {
    metricsQueue.push(metrics);
  }

  // Flush if queue is full
  if (metricsQueue.length >= BATCH_SIZE) {
    flushMetrics();
  }
}

/**
 * Track API request performance
 * Call this from API interceptors or fetch wrappers
 */
export function recordApiMetrics(
  endpoint: string,
  method: string,
  duration: number,
  status?: number
): void {
  const metric: ApiMetrics = {
    endpoint,
    method,
    duration,
    status,
    timestamp: Date.now(),
  };

  apiMetricsQueue.push(metric);

  if (apiMetricsQueue.length >= BATCH_SIZE) {
    flushMetrics();
  }
}

/**
 * Track component render time
 * Use with usePerformanceMonitoring hook
 */
export function recordComponentMetrics(componentName: string, renderTime: number): void {
  const metric: ComponentMetrics = {
    componentName,
    renderTime,
    timestamp: Date.now(),
  };

  componentMetricsQueue.push(metric);

  if (componentMetricsQueue.length >= BATCH_SIZE) {
    flushMetrics();
  }
}

/**
 * Flush all queued metrics to backend
 */
export async function flushMetrics(): Promise<void> {
  if (
    metricsQueue.length === 0 &&
    apiMetricsQueue.length === 0 &&
    componentMetricsQueue.length === 0
  ) {
    return;
  }

  const payload = {
    webVitals: metricsQueue.splice(0),
    apiMetrics: apiMetricsQueue.splice(0),
    componentMetrics: componentMetricsQueue.splice(0),
    sessionId: getOrCreateSessionId(),
    timestamp: Date.now(),
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT);

    await fetch(METRICS_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeoutId);
  } catch (error) {
    // Silently fail - don't impact user experience
    console.debug('Failed to send metrics:', error);

    // Return items to queue if not a network error
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Timeout - don't retry
      console.debug('Metrics request timeout');
    }
  }
}

/**
 * Get or create session ID for tracking user sessions
 */
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('perf_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('perf_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Create a performance mark for custom measurements
 */
export function markStart(name: string): void {
  if ('performance' in window) {
    performance.mark(`${name}-start`);
  }
}

/**
 * Measure time between two marks
 */
export function markEnd(name: string): number {
  if ('performance' in window) {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      const measure = performance.getEntriesByName(name)[0];
      return measure.duration;
    } catch (e) {
      console.warn(`Failed to measure ${name}:`, e);
      return 0;
    }
  }
  return 0;
}

/**
 * Log message with performance context
 */
export function logWithMetrics(message: string, data?: any): void {
  const metrics = {
    message,
    data,
    memory: (performance as any).memory?.usedJSHeapSize,
    timestamp: Date.now(),
  };
  console.log(JSON.stringify(metrics));
}

// Export all metrics for testing
export function getMetricsQueue() {
  return metricsQueue;
}

export function getApiMetricsQueue() {
  return apiMetricsQueue;
}

export function getComponentMetricsQueue() {
  return componentMetricsQueue;
}

/**
 * Clear metrics (for testing)
 */
export function clearMetrics(): void {
  metricsQueue.length = 0;
  apiMetricsQueue.length = 0;
  componentMetricsQueue.length = 0;
}
