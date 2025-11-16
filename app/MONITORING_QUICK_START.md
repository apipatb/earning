# Performance Monitoring - Quick Start Guide

Get started with performance monitoring in under 5 minutes.

## 1. Start Monitoring Stack (One-Time Setup)

```bash
cd /home/user/earning/app/backend

# Start Prometheus & Grafana
docker-compose up -d

# Verify they're running
docker ps | grep earntrack
```

**Access Points:**
- Grafana Dashboard: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Backend Metrics: http://localhost:3001/metrics

## 2. Verify It's Working

```bash
# Check backend metrics endpoint
curl http://localhost:3001/metrics | head -20

# Check Prometheus scraping
# Visit: http://localhost:9090/targets
# Should see "earntrack-backend" as UP
```

## 3. Track Database Queries (Backend)

Add to your controllers/services:

```typescript
import { trackSelectQuery, trackInsertQuery, trackUpdateQuery } from '../lib/db-metrics';

// SELECT
const user = await trackSelectQuery('users', () =>
  prisma.user.findUnique({ where: { id: userId } })
);

// INSERT
const earning = await trackInsertQuery('earnings', () =>
  prisma.earning.create({ data: { amount, date } })
);

// UPDATE
const updated = await trackUpdateQuery('earnings', () =>
  prisma.earning.update({ where: { id }, data })
);
```

## 4. Track Frontend Performance

Already initialized! But you can add hooks to components:

```tsx
import { usePerformanceMonitoring } from '../hooks/usePerformanceMonitoring';
import { useApiPerformance } from '../hooks/usePerformanceMonitoring';

function MyComponent() {
  // Track render time
  usePerformanceMonitoring('MyComponent');

  // Track API calls
  const { trackApiCall } = useApiPerformance();

  useEffect(() => {
    trackApiCall('/api/data', async () => {
      const response = await fetch('/api/data');
      return response.json();
    });
  }, []);

  return <div>Content</div>;
}
```

## 5. Create First Dashboard in Grafana

1. Visit http://localhost:3000
2. Click "+" → "Dashboard" → "New Panel"
3. Select Prometheus as data source
4. Add query: `rate(http_requests_total[5m])`
5. Click "Apply" and save

## Common Queries

### Request Rate
```
rate(http_requests_total[5m])
```

### Response Time (95th percentile)
```
histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
```

### Slow Queries (>100ms)
```
rate(slow_queries_total[5m])
```

### Cache Hit Rate
```
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

## Troubleshooting

### Backend metrics not showing up
```bash
# Check service is running
curl http://localhost:3001/health

# Check metrics endpoint
curl http://localhost:3001/metrics

# Check Prometheus targets
# Visit: http://localhost:9090/targets
```

### Docker compose not working
```bash
# Rebuild containers
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs prometheus
docker-compose logs grafana
```

### Prometheus can't find backend
- For Docker: Make sure backend is on port 3001
- Check prometheus.yml configuration
- Use `host.docker.internal:3001` for Docker on Mac/Windows

## Key Files

**Backend:**
- `/app/backend/src/lib/metrics.ts` - Metrics library
- `/app/backend/src/lib/db-metrics.ts` - Database tracking
- `/app/backend/src/middleware/metrics.middleware.ts` - HTTP tracking
- `/app/backend/src/routes/metrics.routes.ts` - Frontend metrics endpoint

**Frontend:**
- `/app/frontend/src/lib/performance.ts` - Performance library
- `/app/frontend/src/hooks/usePerformanceMonitoring.ts` - React hooks

**Configuration:**
- `/app/backend/docker-compose.yml` - Prometheus & Grafana
- `/app/backend/prometheus.yml` - Prometheus config

**Documentation:**
- `/app/PERFORMANCE_MONITORING_SUMMARY.md` - Complete overview
- `/app/backend/PERFORMANCE_MONITORING_SETUP.md` - Detailed setup
- `/app/backend/DATABASE_METRICS_GUIDE.md` - Database integration
- `/app/frontend/FRONTEND_PERFORMANCE_MONITORING.md` - Frontend usage

## Next Steps

1. ✅ Start monitoring stack: `docker-compose up -d`
2. ✅ Verify Prometheus: http://localhost:9090/targets
3. ✅ Add data source to Grafana
4. ✅ Start using hooks in components
5. ✅ Track database queries
6. ✅ Create custom dashboards
7. ✅ Set up alerts (see PERFORMANCE_MONITORING_SETUP.md)

## Available Hooks

| Hook | Use Case |
|------|----------|
| `usePerformanceMonitoring()` | Track component render time |
| `useApiPerformance()` | Track API call performance |
| `useAsyncPerformance()` | Measure async operations |
| `useMemoryMonitoring()` | Detect memory leaks |
| `useInteractionTiming()` | Measure user interactions |
| `useLazyLoadMonitoring()` | Track lazy loading |
| `usePageVisibilityTracking()` | Track page visibility |
| `useVirtualizationPerformance()` | Monitor virtualized lists |

## Database Functions

| Function | Use Case |
|----------|----------|
| `trackSelectQuery()` | SELECT queries |
| `trackInsertQuery()` | INSERT queries |
| `trackUpdateQuery()` | UPDATE queries |
| `trackDeleteQuery()` | DELETE queries |
| `trackQueryMetrics()` | Custom query types |

## Metrics Captured

### Web Vitals (Frontend)
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- Component Render Times
- API Call Duration

### Backend
- HTTP Request Duration & Count
- Database Query Duration
- Slow Query Rate
- Cache Hit/Miss Rate
- Job Execution Rate
- Error Count

## Production Setup

For production, consider:

1. **External Prometheus**: Use Grafana Cloud or similar managed service
2. **Authentication**: Add auth to `/metrics` endpoint
3. **Retention**: Configure data retention (default: 30 days)
4. **Alerting**: Set up alert rules for critical metrics
5. **Backups**: Regular backups of Prometheus data

See `/app/backend/PERFORMANCE_MONITORING_SETUP.md` for details.

## Help & Reference

- Web Vitals: https://web.dev/vitals/
- Prometheus Queries: https://prometheus.io/docs/prometheus/latest/querying/
- Grafana Dashboards: https://grafana.com/grafana/dashboards/
- prom-client: https://github.com/siimon/prom-client
