# Performance Monitoring Setup Guide

This guide explains how to set up performance monitoring for the EarnTrack backend using Prometheus and Grafana, open-source tools for metrics collection and visualization.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Dashboard Creation](#dashboard-creation)
6. [Alerting](#alerting)
7. [Troubleshooting](#troubleshooting)

## Overview

The EarnTrack backend implements comprehensive performance monitoring using:

- **Prometheus**: Time-series database for metrics collection
- **Grafana**: Visualization and dashboarding platform
- **prom-client**: Node.js Prometheus client library

### Available Metrics

#### HTTP Request Metrics
- `http_requests_total` - Total number of HTTP requests by method, status, and endpoint
- `http_request_duration_ms` - HTTP request duration in milliseconds

#### Database Metrics
- `database_query_duration_ms` - Database query duration by query type and table
- `slow_queries_total` - Slow queries (>100ms)

#### Cache Metrics
- `cache_hits_total` - Cache hits by cache type
- `cache_misses_total` - Cache misses by cache type
- `cache_size_bytes` - Cache size in bytes

#### Job Queue Metrics
- `jobs_executed_total` - Jobs executed by job type and status
- `job_duration_ms` - Job execution duration

#### WebSocket Metrics
- `websocket_connections_total` - WebSocket connections

#### Error Metrics
- `errors_total` - Total errors by error type and endpoint

#### Business Metrics
- `earnings_processed_total` - Earnings processed by platform
- `active_users` - Number of active users

## Architecture

```
┌─────────────────────────┐
│   EarnTrack Backend     │
│   (Port 3001)           │
│  ┌──────────────────┐   │
│  │ Metrics Library  │   │
│  │ (prom-client)    │   │
│  └──────────────────┘   │
└─────────────────────────┘
         │
         │ GET /metrics
         ▼
┌─────────────────────────┐
│     Prometheus          │
│     (Port 9090)         │
│  Scrapes every 15s      │
└─────────────────────────┘
         │
         │ Queries
         ▼
┌─────────────────────────┐
│      Grafana            │
│     (Port 3000)         │
│   Visualizes Data       │
└─────────────────────────┘
```

## Local Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for backend)

### Step 1: Create docker-compose.yml

Create a `docker-compose.yml` file in the project root:

```yaml
version: '3.8'

services:
  # EarnTrack Backend (runs on host)
  # Start with: npm run dev

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - monitoring
    depends_on:
      - grafana

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
```

### Step 2: Create prometheus.yml

Create a `prometheus.yml` file in the project root:

```yaml
# Prometheus configuration

global:
  scrape_interval: 15s      # How often to scrape targets by default
  evaluation_interval: 15s  # How often to evaluate rules
  external_labels:
    monitor: 'earntrack-monitor'

# Alerting configuration (optional)
alerting:
  alertmanagers:
    - static_configs:
        - targets: []

# Rule files
rule_files: []

# Scrape configurations
scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # EarnTrack Backend
  - job_name: 'earntrack-backend'
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'
    # Optional: Add authentication if /metrics endpoint requires it
    # authorization:
    #   credentials: 'your-bearer-token'
```

### Step 3: Start Services

```bash
# Start Prometheus and Grafana (from project root)
docker-compose up -d

# In another terminal, start the backend
cd app/backend
npm install
npm run dev
```

### Step 4: Verify Setup

1. **Check Prometheus** - Visit http://localhost:9090
   - Go to "Status" → "Targets"
   - Verify "earntrack-backend" shows as "UP"

2. **Check Metrics** - Visit http://localhost:3001/metrics
   - Should see Prometheus format metrics

3. **Check Grafana** - Visit http://localhost:3000
   - Login: admin / admin
   - Add Prometheus data source

## Dashboard Creation

### Add Prometheus Data Source in Grafana

1. Login to Grafana (http://localhost:3000)
2. Click "Configuration" (gear icon) → "Data Sources"
3. Click "Add data source"
4. Select "Prometheus"
5. Set URL to: `http://prometheus:9090`
6. Click "Save & Test"

### Create HTTP Request Dashboard

1. Click "+" → "Dashboard" → "Add new panel"
2. Configure panel:

```
Panel Title: Request Rate
Query: rate(http_requests_total[5m])
Legend: {{method}} {{status}} {{endpoint}}
```

3. Add another panel:

```
Panel Title: Response Time (95th percentile)
Query: histogram_quantile(0.95, rate(http_request_duration_ms_bucket[5m]))
Legend: {{method}} {{endpoint}}
```

### Create Database Query Dashboard

1. Click "+" → "Dashboard" → "Add new panel"
2. Configure panel:

```
Panel Title: Query Duration
Query: rate(database_query_duration_ms_bucket[5m])
Legend: {{query_type}} {{table}}
```

3. Add slow queries panel:

```
Panel Title: Slow Queries (>100ms)
Query: rate(slow_queries_total[5m])
Legend: {{query_type}} {{table}}
```

### Create Cache Metrics Dashboard

1. Panel: Cache Hit Rate

```
Query: rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

2. Panel: Cache Size

```
Query: cache_size_bytes
Legend: {{cache_type}}
```

### Create Job Queue Dashboard

1. Panel: Job Execution Rate

```
Query: rate(jobs_executed_total[5m])
Legend: {{job_type}} {{status}}
```

2. Panel: Job Duration

```
Query: histogram_quantile(0.95, rate(job_duration_ms_bucket[5m]))
Legend: {{job_type}}
```

## Production Deployment

### On Railway/Vercel

1. **Update Environment Variables**:

```bash
PROMETHEUS_ENABLED=true
METRICS_PORT=3001  # Same as API port
```

2. **Configure External Prometheus**:

If using managed Prometheus (e.g., Grafana Cloud):

```bash
# .env
PROMETHEUS_REMOTE_WRITE_URL=https://prometheus-blocks-prod-us-central1.grafana.net/api/prom/push
PROMETHEUS_REMOTE_WRITE_USERNAME=your-username
PROMETHEUS_REMOTE_WRITE_PASSWORD=your-api-key
```

3. **Update Prometheus Config**:

For cloud-hosted Prometheus, add remote_write configuration:

```yaml
remote_write:
  - url: https://prometheus-blocks-prod-us-central1.grafana.net/api/prom/push
    basic_auth:
      username: 'your-username'
      password: 'your-api-key'
```

### Running Prometheus in Container

If deploying Prometheus in the same environment:

1. Use container orchestration (Docker Swarm, Kubernetes)
2. Mount persistent volumes for data storage
3. Configure resource limits

Example Docker Swarm deployment:

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

volumes:
  prometheus_data:
    driver: local
```

## Alerting

### Basic Alert Rules

Create `prometheus_alerts.yml`:

```yaml
groups:
  - name: earntrack_alerts
    interval: 30s
    rules:
      # HTTP error rate > 5%
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow query rate
      - alert: HighSlowQueryRate
        expr: rate(slow_queries_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High slow query rate"
          description: "{{ $value }} slow queries per second"

      # Cache hit rate < 50%
      - alert: LowCacheHitRate
        expr: |
          sum(rate(cache_hits_total[5m])) /
          (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"

      # Job failure rate
      - alert: HighJobFailureRate
        expr: |
          sum(rate(jobs_executed_total{status="failed"}[5m])) /
          sum(rate(jobs_executed_total[5m])) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High job failure rate"
          description: "{{ $value | humanizePercentage }} of jobs failing"
```

## Troubleshooting

### Prometheus not scraping metrics

**Issue**: Targets show as DOWN in Prometheus

**Solutions**:
1. Verify backend is running: `curl http://localhost:3001/health`
2. Check metrics endpoint: `curl http://localhost:3001/metrics`
3. Verify prometheus.yml configuration
4. Check Docker network: `docker network ls`
5. For Docker, use `host.docker.internal` instead of `localhost`

### Grafana can't connect to Prometheus

**Issue**: "Unable to connect to Prometheus"

**Solutions**:
1. In Docker, use service name: `http://prometheus:9090`
2. Ensure services are on same network
3. Check Prometheus is running: `docker ps | grep prometheus`
4. Test connection: `docker exec prometheus curl localhost:9090/-/healthy`

### Metrics not appearing in Grafana

**Issue**: Data source connects but no metrics shown

**Solutions**:
1. Wait 30+ seconds for first scrape
2. Check metrics_path in prometheus.yml
3. Verify backend is actually recording metrics
4. Check Prometheus targets for errors

### High memory usage

**Issue**: Prometheus or Grafana consuming excessive memory

**Solutions**:
1. Reduce scrape interval in prometheus.yml
2. Add retention policy: `--storage.tsdb.retention.time=30d`
3. Disable unnecessary metrics in prom-client
4. Set resource limits in docker-compose

## Best Practices

1. **Use appropriate scrape intervals**: 15-30 seconds for production
2. **Set retention periods**: Keep 30 days of data
3. **Monitor disk space**: Prometheus data grows over time
4. **Use recording rules**: Pre-compute complex queries
5. **Set up alerts**: Don't just collect metrics
6. **Dashboard organization**: Group related metrics
7. **Regular backups**: Backup Prometheus data regularly
8. **Use consistent labels**: Standardize label naming

## Security Considerations

1. **Metrics Exposure**:
   - `/metrics` endpoint currently has no authentication
   - Consider adding authentication in production:
     ```typescript
     app.get('/metrics', authMiddleware, async (req, res) => { ... });
     ```

2. **Network Security**:
   - Use firewall rules to restrict Prometheus access
   - Use VPN/private networks for cloud deployments

3. **Data Privacy**:
   - Ensure Grafana dashboards are access-controlled
   - Don't expose sensitive business metrics publicly

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client Documentation](https://github.com/siimon/prom-client)
- [Prometheus Queries](https://prometheus.io/docs/prometheus/latest/querying/basics/)
