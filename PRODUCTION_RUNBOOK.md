# EarnTrack - Production Runbook

Operational procedures for running EarnTrack in production including monitoring, alerting, troubleshooting, and disaster recovery.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Monitoring Dashboard Setup](#monitoring-dashboard-setup)
3. [Log Aggregation & Analysis](#log-aggregation--analysis)
4. [Alert Configuration](#alert-configuration)
5. [Health Checks](#health-checks)
6. [Performance Metrics](#performance-metrics)
7. [Scaling Recommendations](#scaling-recommendations)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)
9. [Disaster Recovery Procedures](#disaster-recovery-procedures)
10. [Operational Procedures](#operational-procedures)

---

## Getting Started

### Access Dashboards

**Railway Dashboard**
- URL: https://railway.app/dashboard
- Select your project
- View: Services, Logs, Metrics, Deployments

**Vercel Dashboard**
- URL: https://vercel.com/dashboard
- Select your project
- View: Deployments, Logs, Analytics, Function Invocations

**Monitoring Stack** (Optional, if enabled)
- Prometheus: http://[backend-url]:9090
- Grafana: http://[backend-url]:3000

### Team Access

Ensure team members have proper access levels:

```
Role Assignments:

Production Admin:
  - Railway admin access
  - Vercel admin access
  - Can modify production variables
  - Can trigger deployments

Developer:
  - Railway view-only or limited edit
  - Vercel deployment view
  - Cannot modify secrets

On-Call Engineer:
  - All dashboards access
  - Ability to view logs
  - Ability to restart services
  - Cannot modify code/secrets
```

---

## Monitoring Dashboard Setup

### Option 1: Railway Native Monitoring

Railway provides built-in metrics and monitoring:

**Step 1: Enable Metrics**

```
Railway Dashboard → Project → Settings → Metrics
Enable: CPU, Memory, Network I/O, Disk I/O
```

**Step 2: Create Custom Dashboards**

```
Railway → Project → Metrics Tab
Create custom views for:
  - Backend service CPU/Memory
  - Database connections
  - Network I/O
  - Disk usage
```

**Step 3: View Service Metrics**

```
Backend Service Metrics:
  - CPU Usage: Should stay < 70%
  - Memory: Should stay < 80%
  - Network In: Monitor for anomalies
  - Network Out: Monitor for anomalies
  - Response time: 95th percentile < 500ms
  - Error rate: Should be < 0.1%

Database Metrics:
  - Connection count: Healthy < 50
  - Query time: p95 < 100ms
  - Active queries: Typically < 10
  - Cache hit ratio: Aim for > 90%
```

### Option 2: Prometheus & Grafana Stack

For advanced monitoring, deploy Prometheus + Grafana:

**Prometheus Configuration**

Create `prometheus.yml` in backend:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'earntrack-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

**Access Prometheus**

```
URL: http://[backend-domain]:9090
Queries:
  - rate(http_requests_total[5m])      # Request rate
  - http_request_duration_seconds      # Response time
  - process_resident_memory_bytes      # Memory usage
  - process_cpu_seconds_total          # CPU usage
```

**Grafana Setup**

```
1. Access: http://[backend-domain]:3000
2. Default login: admin/admin
3. Add Prometheus data source
4. Import dashboards:
   - Node Exporter Full
   - Redis Exporter
   - PostgreSQL Dashboard
```

**Sample Grafana Dashboard Panels**

```
Row 1: Service Health
  - Panel: API Response Time (p50, p95, p99)
  - Panel: Request Rate (per second)
  - Panel: Error Rate (%)
  - Panel: Active Connections

Row 2: System Resources
  - Panel: CPU Usage (%)
  - Panel: Memory Usage (MB)
  - Panel: Disk I/O (MB/s)
  - Panel: Network I/O (MB/s)

Row 3: Database Performance
  - Panel: Database Connection Pool
  - Panel: Query Execution Time
  - Panel: Cache Hit Ratio
  - Panel: Database Size

Row 4: Business Metrics
  - Panel: Active Users
  - Panel: Total Requests/Day
  - Panel: Error Rate Trend
  - Panel: Deployment Frequency
```

---

## Log Aggregation & Analysis

### Railway Logs

**Access Backend Logs**

```bash
# Real-time logs
railway logs --service backend

# Follow new logs
railway logs --service backend --tail

# Search logs
railway logs --service backend | grep "ERROR"

# Filter by time
railway logs --service backend --since "2 hours ago"
```

**Access Database Logs**

```bash
# PostgreSQL logs
railway logs --service postgres

# Connection logs
railway logs --service postgres | grep "connection"

# Slow query log
railway logs --service postgres | grep "duration"
```

**Log Format**

Logs should follow JSON format for parsing:

```json
{
  "timestamp": "2025-01-10T10:30:00Z",
  "level": "info",
  "service": "backend",
  "endpoint": "/api/v1/earnings",
  "method": "GET",
  "status": 200,
  "duration_ms": 45,
  "user_id": "user-123",
  "request_id": "req-abc-xyz",
  "message": "Earnings retrieved successfully"
}
```

### Vercel Logs

**Access Frontend Logs**

```
Vercel Dashboard → Project → Deployments
Select deployment → Logs
Search for:
  - Build errors
  - Runtime errors
  - Function invocations
```

**Export Logs**

```bash
# Using Vercel CLI
vercel logs [project-name] --limit 100

# Save to file
vercel logs [project-name] > logs.txt
```

### Log Retention & Storage

**Configure Log Retention**

```
Railway:
  - Default: 7 days
  - Can upgrade for longer retention

Vercel:
  - Default: 7 days
  - Logs can be exported
```

**Archive Old Logs**

```bash
# Export logs before deletion
railway logs --service backend > backup-logs-$(date +%Y%m%d).txt

# Compress
gzip backup-logs-*.txt

# Upload to storage
# (implementation depends on your setup)
```

### Log Analysis Examples

**Find errors in past 24 hours**

```bash
railway logs --service backend --since "24 hours ago" | grep -i "error"
```

**Find slow requests**

```bash
railway logs --service backend | grep '"duration_ms":[0-9]{4,}'
```

**Find failed database queries**

```bash
railway logs --service postgres | grep -i "error\|failed"
```

**Count errors by type**

```bash
railway logs --service backend | grep "ERROR" | \
  grep -o '"error_type":"[^"]*' | sort | uniq -c | sort -rn
```

---

## Alert Configuration

### Railway Alerts

**Set Up Service Alerts**

```
Railway Dashboard → Project → Settings → Alerts

1. High CPU Usage
   - Trigger: CPU > 80%
   - Duration: 5 minutes
   - Action: Email notification

2. High Memory Usage
   - Trigger: Memory > 85%
   - Duration: 5 minutes
   - Action: Email notification

3. Service Restart
   - Trigger: Service restarts
   - Duration: Immediate
   - Action: Email notification

4. Deployment Failure
   - Trigger: Failed deployment
   - Duration: Immediate
   - Action: Email notification
```

**Set Up Database Alerts**

```
PostgreSQL Service → Settings → Alerts

1. Database Disk Full
   - Trigger: Disk usage > 90%
   - Duration: Immediate
   - Action: Email notification

2. High Connection Count
   - Trigger: Connections > 200
   - Duration: 2 minutes
   - Action: Email notification

3. High Query Latency
   - Trigger: Avg query time > 100ms
   - Duration: 5 minutes
   - Action: Email notification
```

### Vercel Alerts

**Configure Deployment Notifications**

```
Vercel Dashboard → Project → Settings → Notifications

1. Failed Builds
   - Slack/Email notification on build failure

2. Performance Alerts
   - Core Web Vitals > threshold
   - Serverless Function Duration > 10s

3. Custom Domains
   - SSL certificate renewal reminders
```

### Prometheus Alert Rules

Create `alert-rules.yml`:

```yaml
groups:
  - name: earntrack_alerts
    interval: 30s
    rules:
      # Application Alerts
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
        for: 5m
        annotations:
          summary: "High response time detected"

      - alert: HighCPUUsage
        expr: process_resident_memory_bytes / 1e9 > 0.8
        for: 5m
        annotations:
          summary: "High CPU usage on backend"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count > 200
        for: 2m
        annotations:
          summary: "Database connections approaching limit"

      - alert: CacheMissRate
        expr: rate(redis_commands_processed_total{command="get"}[5m]) / rate(redis_commands_processed_total[5m]) < 0.8
        for: 10m
        annotations:
          summary: "Low cache hit ratio"
```

Load rules in Prometheus:

```yaml
# prometheus.yml
rule_files:
  - "alert-rules.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'localhost:9093'  # Alertmanager
```

### Alert Routing & Notifications

**Configure Alert Destinations**

```
Email Alerts:
  - ops-team@company.com
  - backend-oncall@company.com

Slack Integration:
  - #production-alerts channel
  - #incidents channel (for critical)

PagerDuty (optional):
  - For critical alerts
  - Automatic escalation after 15 minutes

SMS (optional):
  - Critical only (P1)
  - On-call engineer only
```

---

## Health Checks

### API Health Endpoint

**Endpoint:** `GET /health`

```bash
curl https://[backend-domain]/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2025-01-10T10:30:00Z",
  "uptime": 245.3,
  "services": {
    "database": "connected",
    "redis": "connected",
    "cache": "healthy"
  },
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service or dependency is down

### Health Check Configuration

**Railway Configuration**

```
Service Settings → Health Check

Path: /health
Port: 3000
Protocol: HTTP
Interval: 30 seconds
Timeout: 10 seconds
Success threshold: 2
Failure threshold: 3
```

**Monitoring Health**

```bash
# Check health every 30 seconds
while true; do
  echo "$(date): $(curl -s https://[backend-domain]/health | jq .status)"
  sleep 30
done

# Or use monitoring tools
watch -n 30 'curl -s https://[backend-domain]/health | jq'
```

### Dependencies Health Check

**Database Connectivity**

```bash
# Test database connection
railway run psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
railway run psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

**Redis Connectivity** (if enabled)

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check memory usage
redis-cli -u $REDIS_URL info memory
```

### Readiness Check

**Before deploying new version:**

```bash
# 1. Check health endpoint
curl -f https://[backend-domain]/health || exit 1

# 2. Verify database connectivity
railway run psql $DATABASE_URL -c "SELECT 1" || exit 1

# 3. Check API responds
curl -f https://[backend-domain]/api/v1/health || exit 1

# 4. Test authentication
curl -f -X POST https://[backend-domain]/api/v1/auth/test \
  -H "Authorization: Bearer test-token" || exit 1
```

---

## Performance Metrics

### Key Performance Indicators (KPIs)

Track these metrics continuously:

```
Availability:
  Target: 99.9% uptime
  Measurement: (Successful requests / Total requests) × 100
  Alert threshold: < 99.5%

Response Time:
  Target: p95 < 500ms, p99 < 1000ms
  Measurement: HTTP request duration
  Alert threshold: p95 > 1000ms

Error Rate:
  Target: < 0.1%
  Measurement: (Error responses / Total responses) × 100
  Alert threshold: > 0.5%

Throughput:
  Target: 1000+ requests/second capacity
  Measurement: Requests per second
  Alert threshold: > 800 requests/second

Database Performance:
  Target: p95 query < 100ms
  Measurement: Database query duration
  Alert threshold: p95 > 500ms
```

### Collection Methods

**Prometheus Queries**

```promql
# Request rate (per second)
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time percentiles
histogram_quantile(0.95, http_request_duration_seconds)
histogram_quantile(0.99, http_request_duration_seconds)

# Active connections
pg_stat_activity_count

# Cache hit ratio
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)

# Database connections in pool
pg_stat_activity{state="active"}
```

**Grafana Dashboards**

Access at `http://[backend-domain]:3000`

Custom panels to create:

```
1. SLO Dashboard
   - Uptime percentage
   - Error budget remaining
   - Traffic vs capacity

2. Business Metrics
   - Active users
   - Revenue/earnings tracked
   - API calls per user
   - Features used

3. Infrastructure
   - CPU/Memory utilization
   - Disk I/O patterns
   - Network bandwidth
   - Database replication lag
```

---

## Scaling Recommendations

### When to Scale

Monitor these metrics and scale when they exceed thresholds:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Backend CPU | > 75% avg | Upgrade Railway plan |
| Backend Memory | > 80% avg | Upgrade RAM allocation |
| Database connections | > 150 | Increase connection pool |
| Query latency (p95) | > 200ms | Optimize queries or add cache |
| Error rate | > 0.5% | Investigate and fix |
| Request queue time | > 100ms | Add more instances or optimize |
| Disk usage | > 80% | Clean up logs or upgrade storage |
| Network bandwidth | > 500 Mbps | Add CDN or optimize payloads |

### Scaling Up Backend

**Current Plan Assessment**

```bash
# Check current resource usage
railway metrics --service backend

# Expected metrics:
# - CPU: typically 20-30% average
# - Memory: typically 40-50% of allocation
# - Network: < 100 Mbps sustained
```

**Upgrade Railway Plan**

```
If CPU/Memory consistently > 70%:

1. Go to Railway Project → Backend Service → Settings
2. Increase Compute:
   - CPU: +500m (incremental)
   - Memory: +512 MB (incremental)
3. Redeploy with new resources
4. Monitor metrics for 24 hours
5. Adjust further if needed

Pricing Scale (approximate):
  - 512 MB RAM, 250m CPU: Free tier
  - 1 GB RAM, 500m CPU: $5/month
  - 2 GB RAM, 1 CPU: $10/month
  - 4 GB RAM, 2 CPU: $20/month
```

### Scaling Database

**PostgreSQL Scaling**

```
Current: Railway PostgreSQL Free Tier

Upgrade Decision Tree:

1. Check current usage:
   - Storage: railway logs --service postgres | grep "database size"
   - Connections: SELECT count(*) FROM pg_stat_activity;
   - Performance: Check slow query log

2. If Storage > 5 GB:
   - Upgrade to Developer Tier
   - Increase max_connections
   - Enable automated backups

3. If Performance issues:
   - Add read replicas
   - Optimize indexes
   - Upgrade to higher tier

4. If Connections exhausted:
   - Implement connection pooling
   - Review connection leaks
   - Upgrade plan
```

**Query Optimization**

```bash
# Analyze slow queries
railway run psql $DATABASE_URL -c "
  SELECT query, calls, total_time, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Add missing indexes
railway run psql $DATABASE_URL -c "
  CREATE INDEX idx_earnings_user_date
  ON earnings(user_id, date DESC);
"
```

### Caching Strategy

**Redis Implementation**

If performance degrades and database optimization isn't enough:

```bash
# 1. Enable Redis in Railway
#    Project → New Service → Provision Redis

# 2. Set REDIS_ENABLED=true in backend env vars

# 3. Configure cache TTLs
CACHE_TTL_PROFILE=300          # 5 minutes
CACHE_TTL_PLATFORMS=1800       # 30 minutes
CACHE_TTL_EARNINGS=1800        # 30 minutes
CACHE_TTL_ANALYTICS=3600       # 1 hour

# 4. Monitor cache effectiveness
redis-cli -u $REDIS_URL info stats
```

### Horizontal Scaling

For truly high traffic (> 10k requests/second):

```
Option 1: Multiple Backend Instances
  - Deploy multiple backend services
  - Use load balancer (Railway provides this)
  - Shared PostgreSQL database
  - Shared Redis cache
  - Cost: $X per additional instance

Option 2: Upgrade to Higher Tier Platform
  - Auto-scaling services
  - Managed databases
  - Better infrastructure
  - Cost: $XXX+ per month

Option 3: Microservices Architecture
  - Split by domain (auth, earnings, products, etc.)
  - Independent scaling
  - More complex operation
  - Cost: Significantly higher
```

---

## Troubleshooting Common Issues

### Issue: High Response Times

**Symptoms:** API responses > 1 second

**Diagnosis:**

```bash
# 1. Check backend service
railway logs --service backend | grep "duration_ms" | tail -20

# 2. Check database performance
railway logs --service postgres | grep "slow query"

# 3. Check Redis cache hit rate
redis-cli -u $REDIS_URL info stats

# 4. Check system resources
railway metrics --service backend  # CPU/Memory usage
```

**Solutions:**

```bash
# 1. Add database index
railway run psql $DATABASE_URL -c "CREATE INDEX idx_earnings_date ON earnings(user_id, date DESC);"

# 2. Increase cache TTL
# Update environment variables

# 3. Upgrade infrastructure
# Railway → Service Settings → Compute

# 4. Enable Redis if not already
# Add Redis service and configure caching
```

### Issue: Database Connection Pool Exhausted

**Symptoms:**
```
Error: too many connections
Connection pool is full
Error: Client timeout: 5000ms
```

**Diagnosis:**

```bash
# Check active connections
railway run psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# See what's holding connections
railway run psql $DATABASE_URL -c "
  SELECT pid, usename, application_name, state
  FROM pg_stat_activity
  WHERE datname = 'railway';
"

# Check for connection leaks in code
railway logs --service backend | grep -i "connection"
```

**Solutions:**

```bash
# 1. Kill idle connections
railway run psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
  AND query_start < now() - interval '10 minutes';
"

# 2. Increase connection pool size
# Update Prisma configuration in backend/prisma/schema.prisma

# 3. Optimize connection usage
# Review code for connection leaks
# Implement connection pooling

# 4. Monitor ongoing
# Watch connection count regularly
```

### Issue: Out of Memory

**Symptoms:**
```
Service crashes
Service restarts frequently
Memory usage constantly increasing
```

**Diagnosis:**

```bash
# Check memory usage trend
railway metrics --service backend --since 1h

# Look for memory leaks in logs
railway logs --service backend | grep -i "memory\|oom"

# Check application heap
# (If monitoring enabled)
```

**Solutions:**

```bash
# 1. Restart service (temporary)
railway restart --service backend

# 2. Increase RAM allocation
# Railway → Service Settings → Memory allocation

# 3. Find memory leak
# Review recent code changes
# Look for unclosed connections/streams
# Check for global variables accumulating

# 4. Enable memory monitoring
# Use Node.js memory profilers
# Monitor with Prometheus: process_resident_memory_bytes
```

### Issue: Disk Space Full

**Symptoms:**
```
Disk full error
Cannot write to database
Deployment fails
```

**Diagnosis:**

```bash
# Check disk usage
railway run df -h

# Check database size
railway run psql $DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size('railway'));
"

# Check largest tables
railway run psql $DATABASE_URL -c "
  SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**Solutions:**

```bash
# 1. Clean up logs
# Delete old log files manually or configure log rotation

# 2. Archive old data
# Move old records to archive table
railway run psql $DATABASE_URL -c "
  CREATE TABLE earnings_archive AS
  SELECT * FROM earnings WHERE date < '2024-01-01';
  DELETE FROM earnings WHERE date < '2024-01-01';
"

# 3. Vacuum database
railway run psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 4. Upgrade storage
# Railway → Service Settings → Storage
```

### Issue: CORS Errors

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
Response to preflight request doesn't pass CORS validation
```

**Diagnosis:**

```bash
# 1. Check ALLOWED_ORIGINS setting
railway variables | grep ALLOWED_ORIGINS

# 2. Check request headers
# Open browser DevTools → Network tab
# Look at OPTIONS request response headers

# 3. Check logs
railway logs --service backend | grep -i "cors\|origin"
```

**Solutions:**

```bash
# 1. Update ALLOWED_ORIGINS
# Railway → Settings → Variables
# Add Vercel domain:
ALLOWED_ORIGINS=https://yourapp.vercel.app,https://www.yourapp.vercel.app

# 2. Verify exact domain
# Must match browser address bar exactly
# No trailing slashes
# Correct protocol (https://)

# 3. Check Helmet CORS config
# Review backend middleware in server.ts
```

### Issue: Authentication Failures

**Symptoms:**
```
401 Unauthorized
Invalid token
Token expired
```

**Diagnosis:**

```bash
# 1. Check JWT_SECRET is set
railway variables | grep JWT_SECRET

# 2. Check token expiry
railway logs --service backend | grep -i "token\|jwt\|auth"

# 3. Verify token format
# Browser DevTools → Application → Cookies/LocalStorage
# Token should be valid JWT format
```

**Solutions:**

```bash
# 1. Verify JWT_SECRET matches between services
# Get from Railway variables

# 2. Check token expiry time
railway variables | grep JWT_EXPIRES_IN

# 3. Clear browser cache/cookies
# User: Clear application data

# 4. Refresh token implementation
# Ensure refresh token endpoint working
```

---

## Disaster Recovery Procedures

### Database Backup & Recovery

**Daily Backups**

```
Automatic backups are enabled in Railway PostgreSQL:
- Retention: 7 days
- Schedule: Daily at 00:00 UTC
- Storage: Automated by Railway
```

**Manual Backup**

```bash
# Create backup
railway run pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Compressed backup
railway run pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup size
ls -lh backup-*.sql.gz
```

**Restore from Backup**

```bash
# 1. Stop backend service
railway stop --service backend

# 2. Restore database
railway run psql $DATABASE_URL < backup-2025-01-10.sql

# 3. Verify restore
railway run psql $DATABASE_URL -c "SELECT count(*) FROM users;"

# 4. Restart backend
railway start --service backend

# 5. Verify application
curl https://[backend-domain]/health
```

**Partial Data Recovery**

```bash
# Recover specific table
railway run pg_restore --table=earnings \
  backup-2025-01-10.sql | \
  railway run psql $DATABASE_URL

# Recover data before timestamp
railway run psql $DATABASE_URL -c "
  UPDATE earnings SET amount = 0
  WHERE created_at > '2025-01-10 10:00:00';
  -- Use transaction rollback instead
  ROLLBACK;
"
```

### Application Rollback

**Rollback to Previous Deployment**

```
Vercel:
1. Go to Deployments
2. Find previous stable deployment
3. Click "..." → "Promote to Production"
4. Verify frontend is restored

Railway:
1. Go to Deployments
2. Find previous stable deployment
3. Click to select and deploy
4. Verify backend is restored
```

**Zero-Downtime Rollback**

```bash
# 1. Deploy previous version to new service
# (Don't remove current)

# 2. Switch traffic
railway promote --deployment [previous-deployment-id]

# 3. Monitor
railway logs --service backend

# 4. Remove old service once confirmed
```

**Database Rollback with Migration Revert**

```bash
# 1. Find the migration that caused issues
railway run prisma migrate resolve --rolled-back [migration_name]

# 2. Manually revert schema
# OR
# 3. Restore from backup and reapply safe migrations
```

### Complete Disaster Recovery

**Scenario: Complete Infrastructure Loss**

```
Recovery Steps:

1. CREATE NEW RAILWAY PROJECT
   - Provision new PostgreSQL
   - Create new Node service
   - Set all environment variables

2. RESTORE DATABASE
   railway run psql $NEW_DATABASE_URL < backup-latest.sql

3. DEPLOY CODE
   - Push to GitHub main branch
   - Railway will auto-detect and build
   - Or manually trigger deployment

4. RESTORE FRONTEND
   - Redeploy via Vercel
   - Update VITE_API_URL to new backend

5. VERIFY
   - Test health endpoint
   - Test authentication
   - Test key features
   - Monitor logs for errors

6. UPDATE DNS (if custom domain)
   - Point to new Vercel/Railway domains
   - Wait for DNS propagation (15-30 min)

7. COMMUNICATION
   - Notify users of incident
   - Post status update
   - Schedule incident review

Recovery Time Objective (RTO): 2-4 hours
Recovery Point Objective (RPO): < 24 hours
```

### Data Recovery from Deletion

**Accidental Data Deletion**

```bash
# 1. Check backups available
railway logs --service postgres | grep "backup"

# 2. List available backups
railway run psql $DATABASE_URL -c "
  SELECT * FROM pg_stat_file('[backup_dir]/*'::text);
"

# 3. Restore full backup
railway run pg_restore [backup_file] | railway run psql $DATABASE_URL

# 4. Or restore from point-in-time
# (requires WAL archiving enabled)
```

**Specific Table Recovery**

```bash
# 1. Export table from backup
pg_dump --table=earnings backup.sql > earnings_backup.sql

# 2. Restore to current database
railway run psql $DATABASE_URL < earnings_backup.sql

# 3. Verify data
railway run psql $DATABASE_URL -c "SELECT count(*) FROM earnings;"
```

### Incident Response Procedure

**When Incident Occurs**

```
TIME: Immediately

1. DECLARE INCIDENT
   - Severity: P1 (Critical), P2 (High), P3 (Medium), P4 (Low)
   - Create incident channel in team communication

2. TRIAGE (5 minutes)
   - Check health endpoints
   - Review recent logs
   - Identify affected services
   - Assess customer impact

3. COMMUNICATE
   - Post initial status
   - Notify stakeholders
   - Provide regular updates (every 15 minutes)

4. INVESTIGATE (10-30 minutes)
   - Check metrics and logs
   - Review recent deployments
   - Identify root cause
   - Determine fix approach

5. MITIGATE (10-60 minutes)
   - Implement temporary fix or rollback
   - Scale resources if needed
   - Clear caches
   - Restart services if needed

6. RESOLVE (5-30 minutes)
   - Deploy permanent fix
   - Verify resolution
   - Monitor closely
   - Declare incident resolved

7. POST-INCIDENT (within 24 hours)
   - Write incident report
   - Timeline of events
   - Root cause analysis
   - Action items to prevent recurrence
```

---

## Operational Procedures

### Deployment Procedures

**Standard Deployment**

```bash
# 1. Prepare code
git checkout -b feature/something
# Make changes
git add .
git commit -m "feature: description"
git push origin feature/something

# 2. Create pull request
# Review and merge to main

# 3. Automatic deployment
# Vercel: automatically deploys from main
# Railway: configure auto-deploy or manual

# 4. Verify deployment
# Check Vercel and Railway dashboards
# Run smoke tests

# 5. Monitor
# Watch logs for 30 minutes
# Monitor metrics
# Check error rates
```

**Zero-Downtime Deployment**

```
For database schema changes:

1. Deploy BACKWARD-COMPATIBLE change
   - Add new column (don't remove old)
   - Add new table (don't remove old)
   - Update code to use new schema

2. Run migrations
   railway run npm run db:push

3. Deploy code changes
   # Vercel/Railway automatic deploy

4. Verify dual operation works
   - Old code reads old fields
   - New code reads new fields
   - Both work simultaneously

5. Later: Remove old schema
   # After all users updated

6. Deploy cleanup migration
   # Remove deprecated fields
```

### Maintenance Windows

**Scheduled Maintenance**

```
Frequency: Monthly or as needed
Duration: 30 minutes typical
Notification: 7 days advance notice

Maintenance Tasks:
1. PostgreSQL maintenance
   - VACUUM ANALYZE
   - Index reorganization
   - Statistics update

2. System updates
   - Update dependencies
   - Apply security patches
   - OS updates

3. Monitoring updates
   - Update Prometheus rules
   - Update Grafana dashboards
   - Rotate logs

Procedure:
1. Notify users 7 days in advance
2. Set maintenance mode on frontend (optional)
3. Perform updates
4. Run smoke tests
5. Monitor for 1 hour
6. Communicate completion
```

### Performance Tuning

**Regular Performance Reviews**

```
Frequency: Weekly
Duration: 30 minutes

Review Items:
1. Response time trends
   - p50, p95, p99 latencies
   - Identify slow endpoints

2. Error rate analysis
   - Error types
   - Error patterns
   - Affected users

3. Database performance
   - Slow queries
   - Connection pool usage
   - Cache hit ratios

4. Resource utilization
   - CPU trends
   - Memory trends
   - Disk space trends

Actions:
- Document findings
- Create optimization tasks
- Plan improvements
- Schedule optimization work
```

### Security Reviews

**Monthly Security Audit**

```
Checklist:

1. Access Review
   - Who has production access?
   - Are permissions least-privilege?
   - Remove inactive access

2. Secret Rotation
   - Rotate JWT_SECRET if not done recently
   - Rotate database password
   - Rotate API keys

3. Dependency Updates
   - Check for security updates
   - Review vulnerable packages
   - Update and test

4. Log Review
   - Check for suspicious activity
   - Review error patterns
   - Check authentication failures

5. Configuration Review
   - CORS settings appropriate?
   - Rate limiting effective?
   - Security headers present?

6. Backup Verification
   - Test backup restoration
   - Verify backup availability
   - Check retention policy
```

---

## Reference & Tools

### Useful Commands

```bash
# Railway
railway login
railway list
railway logs --service backend
railway metrics --service backend
railway restart --service backend
railway variables --pull

# Vercel
vercel login
vercel ls
vercel logs [project]
vercel env pull .env.local
vercel deploy --prod

# PostgreSQL via Railway
railway run psql $DATABASE_URL -c "SELECT version();"
railway run psql $DATABASE_URL -c "SELECT now();"

# Common Queries
railway run psql $DATABASE_URL -c "
  SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name::regclass))
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY pg_total_relation_size(table_name::regclass) DESC;
"
```

### Emergency Contacts

```
Primary On-Call:    _______________
Secondary On-Call:  _______________
Team Lead:          _______________
DevOps:             _______________

Escalation:
  Issue unresolved > 15 min: Escalate to Team Lead
  Issue unresolved > 30 min: Escalate to DevOps
  Issue unresolved > 1 hour: Executive notification
```

### Resources

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- PostgreSQL: https://www.postgresql.org/docs
- Prisma: https://www.prisma.io/docs
- Express: https://expressjs.com/
- React: https://react.dev

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Production Ready
