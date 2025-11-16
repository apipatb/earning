# Docker Deployment Guide

This guide covers how to build and deploy the EarnTrack application using Docker.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Building Images](#building-images)
- [Running Containers](#running-containers)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ free disk space
- Port 80, 3001, and 5432 available

## Quick Start

### Using Docker Compose (Recommended)

1. **Copy environment file:**
   ```bash
   cp .env.docker.example .env.docker
   ```

2. **Update environment variables:**
   Edit `.env.docker` and set secure values for:
   - `DB_PASSWORD` - PostgreSQL password
   - `JWT_SECRET` - JWT signing secret
   - `CORS_ORIGIN` - Frontend URL (e.g., http://localhost or https://yourdomain.com)

3. **Start all services:**
   ```bash
   docker-compose --env-file .env.docker up -d
   ```

4. **Check status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

6. **Stop services:**
   ```bash
   docker-compose down
   ```

7. **Stop and remove volumes:**
   ```bash
   docker-compose down -v
   ```

## Building Images

### Frontend

```bash
cd app/frontend

# Build with default settings
docker build -t earntrack-frontend .

# Build with custom API URL
docker build \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  -t earntrack-frontend .
```

### Backend

```bash
cd app/backend

# Build image
docker build -t earntrack-backend .
```

## Running Containers

### Frontend Container

```bash
docker run -d \
  --name earntrack-frontend \
  -p 80:80 \
  earntrack-frontend
```

Access the application at: http://localhost

### Backend Container

```bash
# Create a network
docker network create earntrack-network

# Run PostgreSQL
docker run -d \
  --name earntrack-db \
  --network earntrack-network \
  -e POSTGRES_DB=earntrack \
  -e POSTGRES_USER=earntrack \
  -e POSTGRES_PASSWORD=changeme123 \
  -v earntrack-data:/var/lib/postgresql/data \
  postgres:16-alpine

# Run backend
docker run -d \
  --name earntrack-backend \
  --network earntrack-network \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://earntrack:changeme123@earntrack-db:5432/earntrack \
  -e JWT_SECRET=your-secret-key \
  -e CORS_ORIGIN=http://localhost \
  earntrack-backend
```

## Environment Variables

### Frontend (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | http://localhost:3001 | Yes |

### Backend (.env)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | * | Yes |
| `PORT` | Server port | 3001 | No |
| `NODE_ENV` | Environment mode | production | No |

### Docker Compose (.env.docker)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_PASSWORD` | PostgreSQL password | changeme123 | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `CORS_ORIGIN` | Frontend URL | http://localhost:80 | Yes |
| `VITE_API_URL` | Backend URL | http://localhost:3001 | Yes |

## Health Checks

All services include health checks:

### Frontend
- Endpoint: `http://localhost/health`
- Interval: 30s
- Response: `200 OK` with "healthy" message

### Backend
- Endpoint: `http://localhost:3001/api/health`
- Interval: 30s
- Response: `200 OK` with status

### Database
- Command: `pg_isready -U earntrack`
- Interval: 10s

Check health status:
```bash
docker ps
docker inspect --format='{{.State.Health.Status}}' <container-name>
```

## Production Deployment

### Security Best Practices

1. **Use secrets management:**
   ```bash
   # Don't use .env files in production
   # Use Docker secrets or your cloud provider's secret management
   docker secret create jwt_secret /path/to/secret
   ```

2. **Run as non-root:**
   - Both Dockerfiles create and use non-root users
   - Frontend: `nginx` user
   - Backend: `nodejs` user (UID 1001)

3. **Enable HTTPS:**
   - Use a reverse proxy (nginx, Traefik, Caddy)
   - Terminate SSL at the proxy layer
   - Update CORS_ORIGIN to use https://

4. **Resource limits:**
   ```yaml
   # docker-compose.yml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
           reservations:
             cpus: '0.5'
             memory: 256M
   ```

### Multi-Stage Builds

Both Dockerfiles use multi-stage builds to:
- Reduce final image size
- Separate build and runtime dependencies
- Improve security by excluding build tools from production

### Image Optimization

- Based on Alpine Linux (minimal size)
- Only production dependencies in final stage
- Proper layer caching for faster builds
- .dockerignore files to exclude unnecessary files

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs <container-name>

# Check detailed information
docker inspect <container-name>

# Check if port is already in use
netstat -tulpn | grep <port>
```

### Database connection issues

```bash
# Verify database is running
docker exec earntrack-db pg_isready -U earntrack

# Check network connectivity
docker exec earntrack-backend ping earntrack-db

# Verify environment variables
docker exec earntrack-backend env | grep DATABASE_URL
```

### Frontend can't connect to backend

1. Check CORS configuration in backend
2. Verify VITE_API_URL is correct
3. Check if backend is reachable:
   ```bash
   docker exec earntrack-frontend curl http://earntrack-backend:3001/api/health
   ```

### Build failures

```bash
# Clear Docker cache
docker builder prune -a

# Rebuild without cache
docker build --no-cache -t earntrack-frontend .

# Check disk space
docker system df
```

### Database migrations

```bash
# Run migrations manually
docker exec earntrack-backend npx prisma migrate deploy

# Reset database (development only!)
docker exec earntrack-backend npx prisma migrate reset
```

### Performance issues

```bash
# Check resource usage
docker stats

# Check container health
docker ps

# Analyze logs
docker-compose logs --tail=100 -f
```

## Advanced Usage

### Custom nginx configuration

Edit `app/frontend/nginx.conf` and rebuild:
```bash
docker build -t earntrack-frontend app/frontend
```

### Database backups

```bash
# Backup
docker exec earntrack-db pg_dump -U earntrack earntrack > backup.sql

# Restore
cat backup.sql | docker exec -i earntrack-db psql -U earntrack earntrack
```

### Scaling services

```bash
# Scale backend (with load balancer)
docker-compose up -d --scale backend=3
```

### Development mode with hot reload

For development, use the dev scripts instead:
```bash
# Frontend
cd app/frontend && npm run dev

# Backend
cd app/backend && npm run dev
```

## Monitoring

### View real-time logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100
```

### Container stats

```bash
# All containers
docker stats

# Specific container
docker stats earntrack-backend
```

## Cleanup

### Remove stopped containers

```bash
docker-compose down
```

### Remove volumes

```bash
docker-compose down -v
```

### Clean up everything

```bash
# Stop all containers
docker-compose down -v

# Remove images
docker rmi earntrack-frontend earntrack-backend

# Clean up unused resources
docker system prune -a
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
