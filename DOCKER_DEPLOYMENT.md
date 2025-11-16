# EarnTrack Docker Deployment Guide

Complete guide for deploying EarnTrack using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)
- [Useful Commands](#useful-commands)

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
  ```bash
  docker --version
  ```

- **Docker Compose**: Version 2.0 or higher
  ```bash
  docker-compose --version
  ```

### Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**macOS:**
```bash
brew install --cask docker
```

**Windows:**
Download and install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

## Quick Start

### 1. Clone and Configure

```bash
# Navigate to project directory
cd /home/user/earning

# Copy environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

### 2. Start All Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Initialize Database

```bash
# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# (Optional) Seed database
docker-compose exec backend npx prisma db seed
```

### 4. Access Application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

## Development Setup

### Using Development Compose File

```bash
# Start development environment
docker-compose up -d

# Watch logs
docker-compose logs -f backend frontend

# Rebuild after code changes
docker-compose up -d --build backend
```

### Hot Reload Development

For active development with hot reload:

```bash
# Backend development mode
cd app/backend
npm install
npm run dev

# Frontend development mode (separate terminal)
cd app/frontend
npm install
npm run dev
```

Then comment out the respective service in `docker-compose.yml` or use:

```bash
# Run only database
docker-compose up -d postgres

# Set DATABASE_URL in app/backend/.env
# DATABASE_URL="postgresql://earntrack:earntrack_password@localhost:5432/earntrack?schema=public"
```

## Production Deployment

### 1. Prepare Environment

```bash
# Copy and configure production environment
cp .env.example .env
```

**Edit `.env` with production values:**

```bash
# Database
POSTGRES_USER=earntrack_prod
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
POSTGRES_DB=earntrack_prod

# Backend
NODE_ENV=production
JWT_SECRET=<GENERATE_RANDOM_64_CHAR_STRING>
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Frontend
VITE_API_URL=https://api.yourdomain.com/api/v1
```

### 2. Deploy Production Stack

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Run Database Migrations

```bash
# Apply migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Verify database
docker-compose -f docker-compose.prod.yml exec backend npx prisma db execute --stdin < "SELECT 1"
```

### 4. Setup SSL/TLS (Optional)

For HTTPS support, uncomment SSL sections in `docker-compose.prod.yml` and add certificates:

```bash
# Create SSL directory
mkdir -p ssl

# Copy certificates
cp /path/to/your/cert.pem ssl/
cp /path/to/your/key.pem ssl/
```

Update `app/frontend/nginx.conf` to include SSL configuration.

### 5. Setup Reverse Proxy (Recommended)

For production, use Nginx or Traefik as a reverse proxy:

**Example Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Database Management

### Backup Database

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker-compose exec postgres pg_dump -U earntrack earntrack > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Or use docker exec directly
docker exec earntrack-postgres pg_dump -U earntrack earntrack > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
# Restore from backup
docker-compose exec -T postgres psql -U earntrack earntrack < backups/backup_20231215_120000.sql
```

### Database Migrations

```bash
# Create new migration (development)
docker-compose exec backend npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
docker-compose exec backend npx prisma migrate deploy

# Reset database (development only!)
docker-compose exec backend npx prisma migrate reset
```

### Access Database Shell

```bash
# PostgreSQL shell
docker-compose exec postgres psql -U earntrack -d earntrack

# Or
docker exec -it earntrack-postgres psql -U earntrack -d earntrack
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check specific service
docker-compose logs backend

# Restart services
docker-compose restart

# Force recreate
docker-compose up -d --force-recreate
```

### Database Connection Issues

```bash
# Check database health
docker-compose exec postgres pg_isready -U earntrack

# Check DATABASE_URL
docker-compose exec backend env | grep DATABASE_URL

# Restart database
docker-compose restart postgres
```

### Port Conflicts

```bash
# Check what's using the port
sudo lsof -i :3001
sudo lsof -i :5432

# Change ports in .env
BACKEND_PORT=3002
POSTGRES_PORT=5433
```

### Build Failures

```bash
# Clear Docker cache
docker-compose down
docker system prune -a --volumes

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Container Memory Issues

```bash
# Check container resources
docker stats

# Increase Docker memory limit (Docker Desktop)
# Settings -> Resources -> Advanced -> Memory

# For production, adjust limits in docker-compose.prod.yml
```

## Useful Commands

### Service Management

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart specific service
docker-compose restart backend

# View running containers
docker-compose ps

# Stop and remove everything (including volumes)
docker-compose down -v
```

### Logs and Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Check health status
docker-compose ps
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend sh

# Run npm commands
docker-compose exec backend npm run db:migrate

# Database shell
docker-compose exec postgres psql -U earntrack -d earntrack
```

### Image Management

```bash
# List images
docker images

# Remove unused images
docker image prune -a

# Build specific service
docker-compose build backend

# Pull latest base images
docker-compose pull
```

### Network Debugging

```bash
# List networks
docker network ls

# Inspect network
docker network inspect earning_earntrack-network

# Test connectivity between containers
docker-compose exec backend ping postgres
docker-compose exec frontend curl http://backend:3001/health
```

### Performance Optimization

```bash
# Build with BuildKit (faster builds)
DOCKER_BUILDKIT=1 docker-compose build

# Use build cache
docker-compose build --pull

# Multi-stage build cleanup
docker builder prune
```

### Production Monitoring

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Container logs size
docker-compose logs --tail=1000 | wc -l

# Cleanup old logs
docker-compose -f docker-compose.prod.yml logs --tail=0
```

## Environment Variables Reference

### Required Variables

- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password (use strong password in production)
- `POSTGRES_DB`: Database name
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters)

### Optional Variables

- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)
- `VITE_API_URL`: Frontend API URL

## Security Best Practices

1. **Never commit `.env` files** - Always use `.env.example` as template
2. **Use strong passwords** - Generate random passwords for production
3. **Limit exposed ports** - Don't expose database port in production
4. **Enable HTTPS** - Use SSL/TLS certificates in production
5. **Regular updates** - Keep Docker images and dependencies updated
6. **Monitor logs** - Set up log monitoring and alerts
7. **Backup regularly** - Automate database backups
8. **Resource limits** - Set CPU and memory limits in production

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push images
        run: |
          docker-compose -f docker-compose.prod.yml build
          
      - name: Deploy to server
        run: |
          docker-compose -f docker-compose.prod.yml up -d
          docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
```

## Support

For issues and questions:
- Check logs: `docker-compose logs -f`
- Review environment variables: `docker-compose config`
- Verify health checks: `docker-compose ps`

---

**Last Updated**: 2025-11-16
**Version**: 1.0.0
