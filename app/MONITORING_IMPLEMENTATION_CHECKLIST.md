# Performance Monitoring Implementation Checklist

## Installation Verification

Use this checklist to verify that all performance monitoring components have been properly installed.

### Backend Components

- [x] **prom-client installed**
  ```bash
  cd /home/user/earning/app/backend
  npm list prom-client
  # Should show: prom-client@^15.0.0 (or latest version)
  ```

- [x] **Metrics library created**
  ```bash
  ls -la /home/user/earning/app/backend/src/lib/metrics.ts
  # File should exist with ~180 lines
  ```

- [x] **Database metrics utilities created**
  ```bash
  ls -la /home/user/earning/app/backend/src/lib/db-metrics.ts
  # File should exist with ~170 lines
  ```

- [x] **Metrics middleware created**
  ```bash
  ls -la /home/user/earning/app/backend/src/middleware/metrics.middleware.ts
  # File should exist with ~70 lines
  ```

- [x] **Metrics routes created**
  ```bash
  ls -la /home/user/earning/app/backend/src/routes/metrics.routes.ts
  # File should exist with ~150 lines
  ```

- [x] **Server.ts updated**
  ```bash
  grep -c "metricsFilterMiddleware\|metricsRoutes\|'/metrics'" \
    /home/user/earning/app/backend/src/server.ts
  # Should show 3 matches
  ```

- [x] **Docker Compose configured**
  ```bash
  ls -la /home/user/earning/app/backend/docker-compose.yml
  # File should exist with Prometheus and Grafana services
  ```

- [x] **Prometheus configuration**
  ```bash
  ls -la /home/user/earning/app/backend/prometheus.yml
  # File should exist with earntrack-backend job configured
  ```

### Frontend Components

- [x] **Performance library created**
  ```bash
  ls -la /home/user/earning/app/frontend/src/lib/performance.ts
  # File should exist with ~350 lines
  ```

- [x] **Performance hooks created**
  ```bash
  ls -la /home/user/earning/app/frontend/src/hooks/usePerformanceMonitoring.ts
  # File should exist with ~250 lines
  ```

- [x] **App.tsx updated**
  ```bash
  grep -c "initializePerformanceMonitoring" \
    /home/user/earning/app/frontend/src/App.tsx
  # Should show 2 matches (import + useEffect)
  ```

### Documentation

- [x] **Main summary document**
  ```bash
  ls -la /home/user/earning/app/PERFORMANCE_MONITORING_SUMMARY.md
  # File should exist
  ```

- [x] **Quick start guide**
  ```bash
  ls -la /home/user/earning/app/MONITORING_QUICK_START.md
  # File should exist
  ```

- [x] **Backend setup guide**
  ```bash
  ls -la /home/user/earning/app/backend/PERFORMANCE_MONITORING_SETUP.md
  # File should exist with detailed instructions
  ```

- [x] **Database metrics guide**
  ```bash
  ls -la /home/user/earning/app/backend/DATABASE_METRICS_GUIDE.md
  # File should exist with examples
  ```

- [x] **Frontend monitoring guide**
  ```bash
  ls -la /home/user/earning/app/frontend/FRONTEND_PERFORMANCE_MONITORING.md
  # File should exist with hook usage
  ```

## Functional Verification

### 1. Backend Server Startup

```bash
# Navigate to backend
cd /home/user/earning/app/backend

# Start development server
npm run dev

# Expected output should include:
# ✓ Server started successfully
# ✓ metrics registered successfully (check logs)
```

### 2. Metrics Endpoint

```bash
# In another terminal, test metrics endpoint
curl http://localhost:3001/metrics | head -20

# Expected output:
# # HELP http_requests_total Total number of HTTP requests
# # TYPE http_requests_total counter
# # HELP http_request_duration_ms HTTP request duration in milliseconds
# ...
```

### 3. Docker Services

```bash
# From backend directory
docker-compose up -d

# Verify services
docker-compose ps

# Expected:
# NAME                          STATUS
# earntrack-prometheus         Up (healthy)
# earntrack-grafana            Up (healthy)
```

### 4. Prometheus Verification

```bash
# Check Prometheus is accessible
curl http://localhost:9090/-/healthy

# Expected: Empty response with 200 status

# Check targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, state}'

# Expected to see earntrack-backend with state "up"
```

### 5. Grafana Access

```bash
# Check Grafana is accessible
curl http://localhost:3000/api/health | jq '.database'

# Expected: "ok"

# Browser access
# Visit: http://localhost:3000
# Login: admin / admin
# Should see Grafana dashboard
```

## Code Quality Checks

### TypeScript Compilation

```bash
# Check specific files
cd /home/user/earning/app/backend
npx tsc --noEmit src/lib/metrics.ts src/lib/db-metrics.ts src/middleware/metrics.middleware.ts 2>&1 | grep -v "node_modules"

# Should have no errors related to our new files
```

### Frontend Compilation

```bash
cd /home/user/earning/app/frontend
npx tsc --noEmit src/lib/performance.ts src/hooks/usePerformanceMonitoring.ts

# Should have no errors
```

### Import Verification

```bash
# Backend imports
grep -r "from.*metrics\|from.*db-metrics" \
  /home/user/earning/app/backend/src/server.ts | wc -l
# Should show imports are present

# Frontend imports
grep -r "from.*performance\|initializePerformanceMonitoring" \
  /home/user/earning/app/frontend/src/App.tsx | wc -l
# Should show imports are present
```

## Performance Baseline

### Establish Baseline Metrics

1. **HTTP Requests**
   - Note current request duration
   - Document typical response times

2. **Database Queries**
   - Log slow query threshold (100ms)
   - Document query performance by table

3. **Frontend Vitals**
   - Measure LCP, FID, CLS on home page
   - Document initial values

4. **Cache Performance**
   - Note hit/miss ratio for each cache type
   - Document initial effectiveness

### Track Improvements

Keep records of:
- Baseline metrics (current state)
- Changes made to code/infrastructure
- Performance improvement metrics
- Impact analysis

## Integration Verification

### Backend Integration

```bash
# 1. Check metrics middleware is applied
grep -n "metricsFilterMiddleware" /home/user/earning/app/backend/src/server.ts

# 2. Check /metrics endpoint exists
grep -n "app.get('/metrics'" /home/user/earning/app/backend/src/server.ts

# 3. Check metrics routes mounted
grep -n "metricsRoutes" /home/user/earning/app/backend/src/server.ts

# All should return valid line numbers
```

### Frontend Integration

```bash
# 1. Check performance monitoring initialized
grep -n "initializePerformanceMonitoring" /home/user/earning/app/frontend/src/App.tsx

# Should show:
# - Import statement
# - useEffect call

# 2. Check hook file exists and is correct
wc -l /home/user/earning/app/frontend/src/hooks/usePerformanceMonitoring.ts
# Should be ~250+ lines
```

## First-Time Setup Verification

Complete this workflow to verify everything works:

```bash
# 1. Terminal 1: Start backend
cd /home/user/earning/app/backend
npm run dev
# Wait for "Server started successfully"

# 2. Terminal 2: Start monitoring stack
cd /home/user/earning/app/backend
docker-compose up -d
# Wait for all services to start

# 3. Terminal 3: Make a test request
curl http://localhost:3001/health

# 4. Check Prometheus has metrics
curl http://localhost:3001/metrics | grep http_requests_total

# 5. Access Prometheus
# Visit http://localhost:9090
# Navigate to Status → Targets
# Verify "earntrack-backend" shows as "UP"

# 6. Access Grafana
# Visit http://localhost:3000
# Login: admin / admin
# Click + → Data Sources → Prometheus
# Enter URL: http://prometheus:9090
# Click "Save & Test"
```

## Common Issues and Solutions

### Issue: Prometheus can't connect to backend

**Check:**
```bash
# Verify backend is running
curl http://localhost:3001/health

# Verify metrics endpoint
curl http://localhost:3001/metrics | head -5

# Check prometheus.yml for correct target
cat /home/user/earning/app/backend/prometheus.yml | grep "targets"
```

**Solution:** Update prometheus.yml to use `host.docker.internal:3001` if on Mac/Windows

### Issue: Grafana data source won't connect

**Check:**
```bash
# Test from inside Docker
docker exec earntrack-prometheus curl http://prometheus:9090/-/healthy

# Verify network
docker network ls | grep monitoring
```

**Solution:** Ensure services are on the same network and use service names for URLs

### Issue: No metrics appearing in Prometheus

**Check:**
```bash
# Wait at least 30 seconds for first scrape
# Check Prometheus scrape interval
cat /home/user/earning/app/backend/prometheus.yml | grep scrape_interval

# Check targets
curl http://localhost:9090/api/v1/targets
```

**Solution:** Wait for scrape cycle and verify backend is responding to requests

### Issue: Memory usage high

**Check:**
```bash
# Monitor memory usage
docker stats earntrack-prometheus

# Check Prometheus retention
cat /home/user/earning/app/backend/docker-compose.yml | grep retention
```

**Solution:** Reduce retention period or increase resource limits

## Performance Expectations

After implementation, you should see:

- **Prometheus metrics endpoint**: Responds in <50ms
- **Metrics collection**: Minimal overhead (<1% CPU)
- **Frontend metrics**: Auto-batched, sent every 30 seconds
- **Dashboard rendering**: Fast metric queries (typically <100ms)
- **Storage usage**: ~1-2GB per month for 1000 requests/second

## Maintenance Checklist

### Weekly
- [ ] Check Prometheus disk usage
- [ ] Review error metrics
- [ ] Monitor slow query rate
- [ ] Check cache hit ratios

### Monthly
- [ ] Review performance trends
- [ ] Optimize slow queries
- [ ] Clean up unused dashboards
- [ ] Update retention policies
- [ ] Backup Prometheus data

### Quarterly
- [ ] Full system capacity review
- [ ] Archive historical data
- [ ] Review alerting rules
- [ ] Update documentation
- [ ] Plan infrastructure upgrades

## Success Criteria

You've successfully implemented performance monitoring when:

- ✅ Backend `/metrics` endpoint returns Prometheus format data
- ✅ Prometheus successfully scrapes metrics every 15 seconds
- ✅ Grafana can query Prometheus data source
- ✅ Frontend automatically sends Core Web Vitals metrics
- ✅ Database queries can be tracked with helper functions
- ✅ Custom dashboards display key metrics
- ✅ Alerts are triggered for performance issues
- ✅ Team can identify performance bottlenecks using dashboards

## Next Steps

1. ✅ Verify all components using this checklist
2. ✅ Start monitoring stack: `docker-compose up -d`
3. ✅ Access Grafana and create first dashboard
4. ✅ Integrate database query tracking in critical endpoints
5. ✅ Deploy frontend changes to production
6. ✅ Set up alerting rules for production
7. ✅ Document baseline metrics
8. ✅ Schedule regular reviews of performance data

## Additional Resources

- Complete Setup: `/app/backend/PERFORMANCE_MONITORING_SETUP.md`
- Database Integration: `/app/backend/DATABASE_METRICS_GUIDE.md`
- Frontend Usage: `/app/frontend/FRONTEND_PERFORMANCE_MONITORING.md`
- Quick Start: `/app/MONITORING_QUICK_START.md`
- Summary: `/app/PERFORMANCE_MONITORING_SUMMARY.md`

## Support

For issues or questions:
1. Check the documentation files
2. Review error logs: `docker-compose logs`
3. Test endpoints manually with curl
4. Verify configuration files are correct
5. Check component health endpoints
