import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
  register,
} from 'prom-client';

// Create a custom registry
export const metricsRegistry = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: metricsRegistry });

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status', 'endpoint'],
  registers: [metricsRegistry],
});

export const httpRequestDurationMs = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'status', 'endpoint'],
  buckets: [0.1, 5, 15, 50, 100, 500, 1000, 2000, 5000],
  registers: [metricsRegistry],
});

// Database Metrics
export const databaseQueryDurationMs = new Histogram({
  name: 'database_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.1, 5, 15, 50, 100, 500, 1000, 2000],
  registers: [metricsRegistry],
});

export const slowQueries = new Counter({
  name: 'slow_queries_total',
  help: 'Total number of slow queries (>100ms)',
  labelNames: ['query_type', 'table'],
  registers: [metricsRegistry],
});

// Cache Metrics
export const cacheHitsTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [metricsRegistry],
});

export const cacheMissesTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [metricsRegistry],
});

export const cacheSize = new Histogram({
  name: 'cache_size_bytes',
  help: 'Cache size in bytes',
  labelNames: ['cache_type'],
  buckets: [1024, 10240, 102400, 1024000, 10240000], // 1KB, 10KB, 100KB, 1MB, 10MB
  registers: [metricsRegistry],
});

// Job Queue Metrics
export const jobsExecutedTotal = new Counter({
  name: 'jobs_executed_total',
  help: 'Total number of jobs executed',
  labelNames: ['job_type', 'status'],
  registers: [metricsRegistry],
});

export const jobDurationMs = new Histogram({
  name: 'job_duration_ms',
  help: 'Job execution duration in milliseconds',
  labelNames: ['job_type'],
  buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
  registers: [metricsRegistry],
});

// WebSocket Metrics
export const websocketConnections = new Counter({
  name: 'websocket_connections_total',
  help: 'Total WebSocket connections',
  labelNames: ['event_type'],
  registers: [metricsRegistry],
});

// Error Metrics
export const errorCount = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'endpoint'],
  registers: [metricsRegistry],
});

// Business Metrics
export const earningsProcessed = new Counter({
  name: 'earnings_processed_total',
  help: 'Total earnings processed',
  labelNames: ['platform'],
  registers: [metricsRegistry],
});

export const activeUsers = new Histogram({
  name: 'active_users',
  help: 'Number of active users',
  labelNames: [],
  buckets: [1, 5, 10, 50, 100, 500, 1000],
  registers: [metricsRegistry],
});

/**
 * Register all metrics
 * This function initializes all metrics and should be called once at application startup
 */
export function registerMetrics(): void {
  // Metrics are automatically registered when created with the metricsRegistry
  console.log('Metrics registered successfully');
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  status: number,
  endpoint: string,
  duration: number
): void {
  httpRequestsTotal.inc({ method, status: String(status), endpoint });
  httpRequestDurationMs.observe({ method, status: String(status), endpoint }, duration);
}

/**
 * Record database query metrics
 */
export function recordDatabaseQuery(
  queryType: string,
  table: string,
  duration: number
): void {
  databaseQueryDurationMs.observe({ query_type: queryType, table }, duration);

  // Track slow queries
  if (duration > 100) {
    slowQueries.inc({ query_type: queryType, table });
  }
}

/**
 * Record cache operation metrics
 */
export function recordCacheHit(cacheType: string): void {
  cacheHitsTotal.inc({ cache_type: cacheType });
}

export function recordCacheMiss(cacheType: string): void {
  cacheMissesTotal.inc({ cache_type: cacheType });
}

/**
 * Record job execution metrics
 */
export function recordJobExecution(jobType: string, status: string, duration: number): void {
  jobsExecutedTotal.inc({ job_type: jobType, status });
  jobDurationMs.observe({ job_type: jobType }, duration);
}

/**
 * Record WebSocket event
 */
export function recordWebSocketEvent(eventType: string): void {
  websocketConnections.inc({ event_type: eventType });
}

/**
 * Record error
 */
export function recordError(errorType: string, endpoint: string): void {
  errorCount.inc({ error_type: errorType, endpoint });
}

/**
 * Record earnings processed
 */
export function recordEarningsProcessed(platform: string, amount: number): void {
  earningsProcessed.inc({ platform });
}

/**
 * Record active users
 */
export function recordActiveUsers(count: number): void {
  activeUsers.observe(count);
}
