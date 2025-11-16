# EarnTrack Docker - Quick Start Guide

Get EarnTrack running in 5 minutes!

## Prerequisites Check

```bash
# Verify Docker is installed
docker --version
# Should show: Docker version 20.10+

# Verify Docker Compose is installed
docker-compose --version
# Should show: Docker Compose version 2.0+

# Check Docker is running
docker ps
# Should show running containers or empty table (not an error)
```

## 3-Step Quick Start

### Step 1: Configure Environment

```bash
# Navigate to project directory
cd /home/user/earning

# Copy environment template
cp .env.example .env

# (Optional) Edit environment variables
nano .env
```

**Minimum required changes for production:**
- Change `POSTGRES_PASSWORD` to a strong password
- Change `JWT_SECRET` to a random 64-character string
- Update `ALLOWED_ORIGINS` to your domain

### Step 2: Start Services

**Option A: Using Helper Script (Recommended)**
```bash
./docker-start.sh
```

**Option B: Manual Start**
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d --build
```

### Step 3: Initialize Database

```bash
# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Verify services are running
docker-compose ps
```

## Access Your Application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Verify Everything Works

```bash
# Check all services are healthy
docker-compose ps

# Test backend health endpoint
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}

# Test frontend
curl http://localhost/
# Should return HTML content

# View logs
docker-compose logs -f
```

## Essential Commands

### Daily Operations

```bash
# View logs
./docker-logs.sh
# or
docker-compose logs -f

# Stop services
./docker-stop.sh
# or
docker-compose down

# Restart after code changes
docker-compose up -d --build backend

# Backup database
./docker-backup.sh
```

### Troubleshooting

```bash
# Service won't start?
docker-compose logs backend

# Port already in use?
# Edit .env and change BACKEND_PORT or FRONTEND_PORT

# Database connection issues?
docker-compose restart postgres
docker-compose logs postgres

# Clear everything and start fresh
docker-compose down -v
docker system prune -a
./docker-start.sh
```

## Next Steps

1. **Create First User**: Visit http://localhost:80 and sign up
2. **Test API**: Use http://localhost:3001/api/v1/*
3. **View Logs**: Run `./docker-logs.sh`
4. **Setup Backups**: Schedule `./docker-backup.sh` with cron
5. **Production Deploy**: See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

## Common Issues

### "Port 5432 already in use"
```bash
# Another PostgreSQL is running
sudo systemctl stop postgresql
# or change port in .env
POSTGRES_PORT=5433
```

### "Cannot connect to database"
```bash
# Wait for database to be ready
docker-compose exec postgres pg_isready -U earntrack

# Check database logs
docker-compose logs postgres
```

### "Frontend shows blank page"
```bash
# Check VITE_API_URL in .env
VITE_API_URL=http://localhost:3001/api/v1

# Rebuild frontend
docker-compose up -d --build frontend
```

### "Backend health check fails"
```bash
# Check backend logs
docker-compose logs backend

# Verify database connection
docker-compose exec backend npx prisma db execute --stdin <<< "SELECT 1"
```

## Production Checklist

Before deploying to production:

- [ ] Update `.env` with production values
- [ ] Change `POSTGRES_PASSWORD` to strong password
- [ ] Generate secure `JWT_SECRET` (64+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Update `ALLOWED_ORIGINS` to your domain
- [ ] Update `VITE_API_URL` to production API URL
- [ ] Setup SSL/TLS certificates
- [ ] Configure reverse proxy (nginx/traefik)
- [ ] Setup database backups (cron job)
- [ ] Configure monitoring and logging
- [ ] Test all endpoints

## Need Help?

- **Quick Reference**: [DOCKER_README.md](./DOCKER_README.md)
- **Full Guide**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **View Logs**: `docker-compose logs -f`
- **Check Status**: `docker-compose ps`

---

**Happy Tracking!** 🚀
