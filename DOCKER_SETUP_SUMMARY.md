# Docker Setup Summary

All Docker configuration files have been successfully created for the EarnTrack application.

## Files Created

### 1. Frontend Configuration
- **Location**: `/home/user/earning/app/frontend/`
- **Files**:
  - `Dockerfile` - Multi-stage build with Node.js builder and nginx server
  - `.dockerignore` - Excludes unnecessary files from Docker context
  - `nginx.conf` - Production-ready nginx configuration with SPA routing

### 2. Backend Configuration
- **Location**: `/home/user/earning/app/backend/`
- **Files**:
  - `Dockerfile` - Multi-stage build with Prisma support
  - `.dockerignore` - Excludes unnecessary files from Docker context

### 3. Root Configuration
- **Location**: `/home/user/earning/`
- **Files**:
  - `docker-compose.yml` - Orchestrates all services (frontend, backend, database)
  - `.dockerignore` - Root-level Docker ignore file
  - `.env.docker.example` - Environment variable template
  - `DOCKER.md` - Comprehensive Docker documentation
  - `Makefile` - Helper commands for Docker operations

## Quick Start Guide

### Option 1: Using Docker Compose (Recommended)

```bash
# 1. Navigate to project root
cd /home/user/earning

# 2. Setup environment variables
make setup-env
# Or manually: cp .env.docker.example .env

# 3. Edit .env and set your values
nano .env  # or vim .env

# 4. Build and start all services
make up
# Or manually: docker-compose up -d

# 5. Check status
make health
# Or manually: docker-compose ps
```

### Option 2: Using Individual Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Service URLs

Once running, access the application at:

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432 (PostgreSQL)

## Dockerfile Features

### Frontend (app/frontend/Dockerfile)

**Stage 1: Builder**
- Base: `node:20-alpine`
- Installs dependencies with npm ci
- Builds React/Vite application
- Supports build args for VITE_API_URL

**Stage 2: Production**
- Base: `nginx:alpine`
- Serves static files from /usr/share/nginx/html
- Custom nginx configuration with:
  - SPA routing (all routes → index.html)
  - Gzip compression
  - Security headers
  - Static asset caching
  - Health check endpoint at `/health`
- Non-root user (nginx)
- Port 80 exposed
- Health checks every 30s

### Backend (app/backend/Dockerfile)

**Stage 1: Builder**
- Base: `node:20-alpine`
- Copies package.json and Prisma schema
- Installs all dependencies with npm ci
- Generates Prisma client
- Builds TypeScript to JavaScript

**Stage 2: Production**
- Base: `node:20-alpine`
- Installs curl for health checks
- Copies only production dependencies
- Copies built application from builder
- Generates Prisma client for production
- Non-root user (nodejs, UID 1001)
- Port 3001 exposed
- Health checks at `/health` every 30s
- Starts with: `npm start` (node dist/server.js)

## Docker Compose Services

### 1. PostgreSQL Database (postgres)
- Image: `postgres:15-alpine`
- Container: `earntrack-postgres`
- Port: 5432
- Volume: `postgres_data` (persisted)
- Health check: `pg_isready`
- Environment variables:
  - POSTGRES_USER
  - POSTGRES_PASSWORD
  - POSTGRES_DB

### 2. Backend API (backend)
- Built from: `./app/backend/Dockerfile`
- Container: `earntrack-backend`
- Port: 3001
- Depends on: postgres (healthy)
- Health check: curl to `/health`
- Auto-runs migrations on startup
- Environment variables:
  - NODE_ENV
  - DATABASE_URL (auto-configured)
  - JWT_SECRET
  - JWT_EXPIRES_IN
  - ALLOWED_ORIGINS
  - Rate limiting settings
  - Security settings

### 3. Frontend (frontend)
- Built from: `./app/frontend/Dockerfile`
- Container: `earntrack-frontend`
- Port: 80
- Depends on: backend (healthy)
- Health check: curl to `/health`
- Build arg: VITE_API_URL

## Security Features

### Image Security
✅ Multi-stage builds (smaller attack surface)
✅ Alpine Linux base (minimal size)
✅ Non-root users in all containers
✅ No build tools in production images
✅ Health checks for all services

### nginx Security
✅ Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection)
✅ Gzip compression for performance
✅ Static asset caching
✅ SPA routing support
✅ Access log disabled for health checks

### Backend Security
✅ Rate limiting configured
✅ CORS with specific origins
✅ Helmet security headers
✅ Compression enabled
✅ Proper signal handling

## Optimization Features

### Build Optimization
- Layer caching (package.json copied before source code)
- Separate dependency installation layers
- Production-only dependencies in final images
- .dockerignore files reduce context size

### Runtime Optimization
- Alpine Linux (minimal size)
- Multi-stage builds (only runtime files in final image)
- Gzip compression for frontend
- Asset caching headers
- Health checks for orchestration

### Development Features
- Hot reload volume mount for backend (comment out in production)
- Configurable environment variables
- Separate dev and prod configurations
- Makefile for common operations

## Makefile Commands

The Makefile provides convenient shortcuts:

```bash
# Setup
make setup-env        # Copy .env.docker.example to .env
make build           # Build all images
make build-no-cache  # Build without cache

# Running
make up              # Start all services
make down            # Stop all services
make restart         # Restart all services
make logs            # View logs
make logs-f          # Follow logs

# Individual services
make build-frontend  # Build frontend only
make build-backend   # Build backend only
make logs-frontend   # Frontend logs
make logs-backend    # Backend logs
make logs-db         # Database logs

# Status
make ps              # Show containers
make health          # Check health
make stats           # Resource usage

# Database
make db-migrate      # Run migrations
make db-studio       # Open Prisma Studio
make db-reset        # Reset database (dev only!)
make db-backup       # Backup database
make db-shell        # PostgreSQL shell

# Maintenance
make clean           # Stop and remove volumes
make clean-all       # Remove everything
make prune           # Clean Docker system
```

## Environment Variables

Key environment variables in `.env`:

```bash
# Database
POSTGRES_USER=earntrack
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=earntrack

# Backend
NODE_ENV=development|production
JWT_SECRET=<min-32-chars>
JWT_EXPIRES_IN=7d
ALLOWED_ORIGINS=<comma-separated-urls>

# Frontend
VITE_API_URL=http://localhost:3001/api/v1
```

## Health Checks

All services include health checks:

- **Frontend**: GET `/health` → 200 "healthy"
- **Backend**: GET `/health` → 200 with JSON status
- **Database**: `pg_isready -U earntrack`

Check health status:
```bash
make health
# Or: docker inspect --format='{{.State.Health.Status}}' <container-name>
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs <service-name>
docker inspect <container-name>
```

### Database connection issues
```bash
docker-compose exec postgres pg_isready -U earntrack
docker-compose exec backend ping postgres
```

### Build failures
```bash
# Clear cache and rebuild
make build-no-cache
# Or: docker-compose build --no-cache
```

### Reset everything
```bash
make clean-all
make setup-env
make build
make up
```

## Production Deployment

For production:

1. **Update environment variables**:
   - Set NODE_ENV=production
   - Use strong JWT_SECRET (min 32 chars)
   - Use secure database password
   - Set specific ALLOWED_ORIGINS

2. **Remove development features**:
   - Comment out volume mount in backend service
   - Set LOG_LEVEL=info or warn

3. **Add SSL/TLS**:
   - Use reverse proxy (nginx, Traefik, Caddy)
   - Terminate SSL at proxy layer
   - Update ALLOWED_ORIGINS to use https://

4. **Resource limits**:
   - Add CPU and memory limits to docker-compose.yml
   - Monitor resource usage with `docker stats`

5. **Backup strategy**:
   - Regular database backups: `make db-backup`
   - Backup postgres_data volume
   - Store backups off-server

## Next Steps

1. ✅ Docker files created
2. ⏭️ Set up environment variables: `make setup-env`
3. ⏭️ Edit `.env` with your values
4. ⏭️ Build images: `make build`
5. ⏭️ Start services: `make up`
6. ⏭️ Check health: `make health`
7. ⏭️ Access application: http://localhost

## Additional Resources

- [DOCKER.md](/home/user/earning/DOCKER.md) - Comprehensive Docker documentation
- [docker-compose.yml](/home/user/earning/docker-compose.yml) - Service orchestration
- [Makefile](/home/user/earning/Makefile) - Helper commands
- [Frontend Dockerfile](/home/user/earning/app/frontend/Dockerfile)
- [Backend Dockerfile](/home/user/earning/app/backend/Dockerfile)

## Support

For issues or questions:
1. Check logs: `make logs-f`
2. Check health: `make health`
3. Review DOCKER.md for detailed troubleshooting
4. Check Docker documentation: https://docs.docker.com/
