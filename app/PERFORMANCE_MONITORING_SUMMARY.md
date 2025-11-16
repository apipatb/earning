# Performance Monitoring and Analytics Implementation Summary

## Overview

A comprehensive performance monitoring and analytics system has been implemented using open-source tools (Prometheus and Grafana) with built-in support for tracking:

- HTTP request metrics
- Database query performance
- Cache operations
- Job queue execution
- WebSocket connections
- Frontend Core Web Vitals
- Component render times
- API call performance

## What's Been Implemented

### Backend Components

#### 1. Prometheus Metrics Library (`/app/backend/src/lib/metrics.ts`)
- Prometheus client initialization with custom registry
- Pre-configured metrics for:
  - HTTP requests (count and duration)
  - Database queries (duration and slow query tracking)
  - Cache operations (hits, misses, size)
  - Job execution (count and duration)
  - WebSocket connections
  - Errors (count by type)
  - Business metrics (earnings, active users)
- Helper functions for recording metrics

#### 2. Metrics Middleware (`/app/backend/src/middleware/metrics.middleware.ts`)
- Automatic tracking of HTTP request metrics
- Request duration measurement
- Endpoint normalization (handles variable IDs)
- Filtered to only track `/api/*` routes
- Slow request detection (>1000ms)

#### 3. Prometheus Endpoint (`/app/backend/src/server.ts`)
- GET `/metrics` - Exposes Prometheus metrics in standard format
- No authentication required (best practice for monitoring)
- Automatically included in server startup

#### 4. Database Metrics Utilities (`/app/backend/src/lib/db-metrics.ts`)
- Helper functions for wrapping database queries
- Automatic query type detection (SELECT, INSERT, UPDATE, DELETE)
- Slow query tracking (>100ms)
- Supports both async and sync queries
- Easy integration with existing code

#### 5. Metrics Routes (`/app/backend/src/routes/metrics.routes.ts`)
- POST `/api/v1/metrics` - Receive frontend performance metrics
- GET `/api/v1/metrics/health` - Health check
- GET `/api/v1/metrics/status` - Metrics collection status
- Automatic issue detection (poor Core Web Vitals, slow API calls)

#### 6. Docker Compose Setup (`/app/backend/docker-compose.yml`)
- Prometheus service (port 9090)
- Grafana service (port 3000)
- Persistent volumes for data
- Network configuration for service communication
- Health checks included

#### 7. Prometheus Configuration (`/app/backend/prometheus.yml`)
- Backend metrics scraping (15s interval)
- Grafana self-monitoring
- Proper label configuration

#### 8. Documentation
- **PERFORMANCE_MONITORING_SETUP.md** - Complete setup guide for Prometheus/Grafana
- **DATABASE_METRICS_GUIDE.md** - Database query tracking integration guide

### Frontend Components

#### 1. Performance Library (`/app/frontend/src/lib/performance.ts`)
- Core Web Vitals tracking:
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)
  - TTFB, FCP, DCL, Load
- Automatic metrics collection with PerformanceObserver
- API metrics recording
- Component render time tracking
- Session management
- Automatic batching and flushing (30s interval, 10-item batch)
- Timeout-protected HTTP requests to backend

#### 2. Performance Monitoring Hooks (`/app/frontend/src/hooks/usePerformanceMonitoring.ts`)
- **usePerformanceMonitoring** - Track component render times
- **useAsyncPerformance** - Measure async operations
- **useApiPerformance** - Track API request performance
- **useMemoryMonitoring** - Memory leak detection
- **useInteractionTiming** - User interaction measurement
- **useLazyLoadMonitoring** - Lazy load performance
- **usePageVisibilityTracking** - User engagement tracking
- **useVirtualizationPerformance** - List virtualization performance

#### 3. App Integration (`/app/frontend/src/App.tsx`)
- Automatic initialization of performance monitoring on app startup
- Single point of activation

#### 4. Documentation
- **FRONTEND_PERFORMANCE_MONITORING.md** - Comprehensive usage guide

## Installation & Setup

### Prerequisites
- Docker and Docker Compose (for Prometheus/Grafana)
- Node.js 18+ (for backend)

### Backend

```bash
# 1. Navigate to backend directory
cd /home/user/earning/app/backend

# 2. Install prom-client (already done)
npm install prom-client

# 3. Verify installation
npm run dev
# Server starts on port 3001
```

### Local Prometheus & Grafana

```bash
# From backend directory, start monitoring stack
docker-compose up -d

# Access:
# - Grafana: http://localhost:3000 (admin/admin)
# - Prometheus: http://localhost:9090
# - Backend Metrics: http://localhost:3001/metrics
```

### Verification

1. Check Prometheus targets: http://localhost:9090/targets
2. Check backend metrics: http://localhost:3001/metrics
3. Add Prometheus data source to Grafana:
   - URL: `http://prometheus:9090`
4. Create dashboards to visualize metrics

## File Structure

```
/home/user/earning/app/backend/
├── src/
│   ├── lib/
│   │   ├── metrics.ts                 (NEW) Prometheus metrics setup
│   │   └── db-metrics.ts              (NEW) Database query tracking
│   ├── middleware/
│   │   └── metrics.middleware.ts       (NEW) HTTP metrics tracking
│   ├── routes/
│   │   └── metrics.routes.ts          (NEW) Frontend metrics endpoint
│   └── server.ts                       (MODIFIED) Added metrics integration
├── docker-compose.yml                 (NEW) Prometheus & Grafana setup
├── prometheus.yml                     (NEW) Prometheus configuration
├── PERFORMANCE_MONITORING_SETUP.md    (NEW) Setup guide
└── DATABASE_METRICS_GUIDE.md          (NEW) Database tracking guide

/home/user/earning/app/frontend/
├── src/
│   ├── lib/
│   │   └── performance.ts             (NEW) Core Web Vitals tracking
│   ├── hooks/
│   │   └── usePerformanceMonitoring.ts (NEW) Performance hooks
│   └── App.tsx                         (MODIFIED) Initialize monitoring
└── FRONTEND_PERFORMANCE_MONITORING.md (NEW) Usage guide
```

## Usage Examples

### Backend - Track Database Queries

```typescript
import { trackSelectQuery, trackInsertQuery } from '../lib/db-metrics';

// Track SELECT queries
const user = await trackSelectQuery('users', () =>
  prisma.user.findUnique({ where: { id: '123' } })
);

// Track INSERT queries
const earning = await trackInsertQuery('earnings', () =>
  prisma.earning.create({ data: { amount: 100 } })
);
```

### Frontend - Track Component Performance

```tsx
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';

function Dashboard() {
  usePerformanceMonitoring('Dashboard');
  return <div>Dashboard content</div>;
}
```

### Frontend - Track API Performance

```tsx
import { useApiPerformance } from '../hooks/usePerformanceMonitoring';

function Earnings() {
  const { trackApiCall } = useApiPerformance();

  useEffect(() => {
    trackApiCall('/api/earnings', async () => {
      const response = await fetch('/api/earnings');
      return response.json();
    });
  }, []);

  return <div>Earnings list</div>;
}
```

## Key Metrics Captured

### HTTP Requests
- Total requests by method, status, endpoint
- Request duration (milliseconds)
- Slow request detection (>1000ms)

### Database Queries
- Query duration by type and table
- Slow query tracking (>100ms)
- Success/failure tracking

### Cache Operations
- Cache hits/misses by cache type
- Cache size monitoring

### Job Queue
- Job execution count
- Job execution duration
- Success/failure status

### Frontend Web Vitals
- LCP, FID, CLS, TTFB, FCP
- Page navigation timing
- Component render times
- API call performance

## Monitoring and Alerting

### View Metrics in Prometheus
1. Visit http://localhost:9090
2. Go to Graph tab
3. Query examples:
   ```promql
   # Request rate
   rate(http_requests_total[5m])

   # Request duration (95th percentile)
   histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))

   # Slow queries
   rate(slow_queries_total[5m])
   ```

### Create Dashboards in Grafana
1. Visit http://localhost:3000
2. Login: admin / admin
3. Add Prometheus data source
4. Create dashboards using the queries above

### Sample Alert Rules
See `PERFORMANCE_MONITORING_SETUP.md` for alert configuration examples.

## Best Practices

### Backend

1. **Wrap Database Queries**
   - Use `trackSelectQuery()`, `trackInsertQuery()`, etc.
   - Start with critical paths
   - Gradually migrate existing code

2. **Monitor Query Performance**
   - Check slow_queries_total for issues
   - Add indexes for frequently slow queries
   - Use SELECT clause to limit columns

3. **Handle Errors Gracefully**
   - Metrics are recorded even on errors
   - Log errors for investigation

### Frontend

1. **Use Appropriate Hooks**
   - `usePerformanceMonitoring` for components
   - `useApiPerformance` for API calls
   - `useMemoryMonitoring` for heavy components

2. **Minimize Overhead**
   - Don't measure every single operation
   - Batch metrics collection happens automatically
   - Let automatic flushing handle transport

3. **Track Critical User Paths**
   - Focus on important user interactions
   - Measure page load performance
   - Track conversion-critical operations

## Troubleshooting

### Prometheus not scraping metrics
- Verify backend is running: `curl http://localhost:3001/health`
- Check prometheus.yml configuration
- For Docker, use `host.docker.internal` instead of `localhost`

### No metrics in Prometheus
- Wait 30+ seconds for first scrape
- Check `/metrics` endpoint: `curl http://localhost:3001/metrics`
- Verify Prometheus targets show as UP

### Grafana can't connect to Prometheus
- Use service name in Docker: `http://prometheus:9090`
- Ensure services are on same network
- Check Prometheus is running: `docker ps | grep prometheus`

### High memory usage
- Reduce BATCH_SIZE in performance.ts
- Reduce FLUSH_INTERVAL
- Clean up event listeners in components

## Security Considerations

1. **Metrics Endpoint** - Currently no authentication
   - Add authentication for production if needed:
     ```typescript
     app.get('/metrics', authMiddleware, async (req, res) => { ... });
     ```

2. **Network Security**
   - Use firewall rules to restrict Prometheus access
   - Use VPN/private networks for cloud deployments

3. **Data Privacy**
   - Don't expose sensitive business metrics publicly
   - Control Grafana dashboard access

## Production Deployment

### On Railway/Vercel

1. Use managed Prometheus service (Grafana Cloud, DataDog)
2. Configure remote write endpoint in prometheus.yml
3. Add environment variables for authentication

### Container Deployment

Use the provided `docker-compose.yml` as reference for Kubernetes or Docker Swarm deployment.

## Next Steps

### Recommended Actions

1. **Start Monitoring Stack**
   ```bash
   cd /app/backend
   docker-compose up -d
   ```

2. **Create Initial Dashboard**
   - Add HTTP request metrics
   - Add database query metrics
   - Add frontend Web Vitals

3. **Integrate Database Tracking**
   - Start with high-traffic endpoints
   - Gradually migrate queries
   - Monitor slow_queries_total

4. **Set Up Alerting**
   - Configure alert rules in prometheus_alerts.yml
   - Add alertmanager for notifications

5. **Monitor Frontend**
   - Use hooks in critical components
   - Track API call performance
   - Monitor Core Web Vitals

## References

- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **prom-client**: https://github.com/siimon/prom-client
- **Web Vitals**: https://web.dev/vitals/
- **Performance API**: https://developer.mozilla.org/en-US/docs/Web/API/Performance

## Support Files

- `/home/user/earning/app/backend/PERFORMANCE_MONITORING_SETUP.md` - Detailed setup guide
- `/home/user/earning/app/backend/DATABASE_METRICS_GUIDE.md` - Database integration guide
- `/home/user/earning/app/frontend/FRONTEND_PERFORMANCE_MONITORING.md` - Frontend usage guide
