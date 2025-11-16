# EarnTrack Docker Setup

Complete Docker configuration for the EarnTrack application stack.

## Quick Start

### 1. Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 10GB+ disk space

### 2. Start Application

```bash
# Copy environment file
cp .env.example .env

# Edit with your configuration
nano .env

# Start all services
./docker-start.sh

# Or manually
docker-compose up -d
```

### 3. Access Application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/health

## Project Structure

```
earning/
├── docker-compose.yml              # Development configuration
├── docker-compose.prod.yml         # Production configuration
├── .env.example                    # Environment variables template
├── .dockerignore                   # Docker ignore file
├── DOCKER_DEPLOYMENT.md            # Comprehensive deployment guide
├── DOCKER_README.md                # This file
├── docker-start.sh                 # Quick start script
├── docker-stop.sh                  # Stop services script
├── docker-backup.sh                # Database backup script
├── docker-logs.sh                  # View logs script
└── app/
    ├── backend/
    │   ├── Dockerfile              # Backend container config
    │   ├── .dockerignore          # Backend ignore file
    │   └── ...
    └── frontend/
        ├── Dockerfile              # Frontend container config
        ├── .dockerignore          # Frontend ignore file
        ├── nginx.conf             # Nginx configuration
        └── ...
```

## Services

### PostgreSQL Database
- **Image**: postgres:15-alpine
- **Port**: 5432 (default)
- **Volume**: postgres_data
- **Health Check**: Automatic readiness check

### Backend API
- **Build**: ./app/backend
- **Port**: 3001
- **Framework**: Node.js + Express + Prisma
- **Health Check**: http://localhost:3001/health

### Frontend Web App
- **Build**: ./app/frontend
- **Port**: 80
- **Framework**: React + Vite
- **Server**: Nginx
- **Health Check**: http://localhost/health

## Helper Scripts

### Start Services
```bash
./docker-start.sh
# Interactive script to start development or production stack
```

### Stop Services
```bash
./docker-stop.sh
# Interactive script to stop services (with option to remove data)
```

### View Logs
```bash
./docker-logs.sh
# Interactive script to view logs from any service
```

### Backup Database
```bash
./docker-backup.sh
# Creates compressed database backup in ./backups/
```

## Common Commands

### Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build backend
```

### Production

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop production
docker-compose -f docker-compose.prod.yml down
```

### Database

```bash
# Run migrations
docker-compose exec backend npx prisma migrate deploy

# Access database shell
docker-compose exec postgres psql -U earntrack -d earntrack

# Backup database
./docker-backup.sh

# Restore database
gunzip -c backups/backup_20231215_120000.sql.gz | \
  docker exec -i earntrack-postgres psql -U earntrack earntrack
```

### Debugging

```bash
# Check service status
docker-compose ps

# View service health
docker-compose ps

# Access backend shell
docker-compose exec backend sh

# Check environment variables
docker-compose exec backend env

# Test backend health
curl http://localhost:3001/health

# View container resources
docker stats
```

## Environment Variables

### Required

```bash
# Database
POSTGRES_USER=earntrack
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=earntrack

# Backend
JWT_SECRET=your_secret_key_min_32_chars
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:3001/api/v1
```

### Optional

```bash
# Ports
POSTGRES_PORT=5432
BACKEND_PORT=3001
FRONTEND_PORT=80

# Security
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# Logging
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true
```

See `.env.example` for complete list.

## Deployment Scenarios

### Local Development

```bash
# Start with hot reload disabled
docker-compose up -d

# Or run backend/frontend locally with Docker database
docker-compose up -d postgres
cd app/backend && npm run dev
cd app/frontend && npm run dev
```

### Production Server

```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d --build

# Setup SSL (recommended)
# 1. Add certificates to ./ssl/
# 2. Uncomment SSL volume in docker-compose.prod.yml
# 3. Update nginx.conf with SSL configuration
```

### CI/CD Pipeline

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec -T backend \
  npx prisma migrate deploy
```

## Networking

All services communicate via the `earntrack-network` bridge network:

- **postgres**: Accessible at `postgres:5432` internally
- **backend**: Accessible at `backend:3001` internally
- **frontend**: Accessible at `frontend:80` internally

## Volumes

### postgres_data
- **Purpose**: Persists PostgreSQL database
- **Location**: Docker managed volume
- **Backup**: Use `./docker-backup.sh`

## Security

### Development
- Default credentials (change for production)
- CORS enabled for localhost
- Debug logging enabled
- All ports exposed

### Production
- Strong passwords required
- Restricted CORS origins
- Info-level logging
- Database port not exposed
- Resource limits enforced
- Non-root users
- Security headers enabled

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3001

# Change port in .env
BACKEND_PORT=3002
```

### Database Connection Failed
```bash
# Check database health
docker-compose exec postgres pg_isready -U earntrack

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Build Failures
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Remove volumes
docker-compose down -v
```

### Out of Memory
```bash
# Check resource usage
docker stats

# Increase Docker memory
# Docker Desktop: Settings -> Resources -> Memory

# Adjust limits in docker-compose.prod.yml
```

## Performance Optimization

### Build Performance
```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker-compose build

# Parallel builds
docker-compose build --parallel
```

### Runtime Performance
```bash
# Use production config (includes resource limits)
docker-compose -f docker-compose.prod.yml up -d

# Monitor resources
docker stats

# Optimize images
# - Multi-stage builds (already implemented)
# - Minimal base images (alpine)
# - Layer caching
```

## Monitoring

### Logs
```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
```

### Health Checks
```bash
# Service status
docker-compose ps

# Backend health
curl http://localhost:3001/health

# Frontend health
curl http://localhost/health

# Database health
docker-compose exec postgres pg_isready
```

### Metrics
```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Network inspection
docker network inspect earning_earntrack-network
```

## Backup & Recovery

### Automated Backups
```bash
# Create backup script
./docker-backup.sh

# Schedule with cron (daily at 2 AM)
0 2 * * * /path/to/earning/docker-backup.sh
```

### Manual Backup
```bash
# Export database
docker exec earntrack-postgres pg_dump -U earntrack earntrack > backup.sql

# Compress
gzip backup.sql
```

### Restore
```bash
# Decompress
gunzip backup.sql.gz

# Restore
docker exec -i earntrack-postgres psql -U earntrack earntrack < backup.sql
```

## Updating

### Update Application Code
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations if needed
docker-compose exec backend npx prisma migrate deploy
```

### Update Docker Images
```bash
# Pull latest base images
docker-compose pull

# Rebuild
docker-compose up -d --build
```

## Additional Resources

- **Full Deployment Guide**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **Docker Documentation**: https://docs.docker.com
- **Docker Compose Reference**: https://docs.docker.com/compose/
- **PostgreSQL Docker**: https://hub.docker.com/_/postgres
- **Nginx Docker**: https://hub.docker.com/_/nginx

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify health: `docker-compose ps`
3. Review environment: `docker-compose config`
4. See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-16
