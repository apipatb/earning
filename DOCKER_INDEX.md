# EarnTrack Docker - Documentation Index

Complete index of all Docker-related files and documentation.

## 🚀 Start Here

**New to this setup?** Start with these files in order:

1. **DOCKER_QUICK_START.md** - Get running in 5 minutes
2. **DOCKER_README.md** - Daily operations and common commands
3. **DOCKER_DEPLOYMENT.md** - Full deployment guide (when ready for production)

## 📁 File Structure

```
/home/user/earning/
│
├── 🔧 Configuration Files
│   ├── docker-compose.yml              ⭐ Development environment
│   ├── docker-compose.prod.yml         🚀 Production environment
│   ├── .env.example                    📝 Environment variables template
│   └── .dockerignore                   🚫 Docker build exclusions
│
├── 🤖 Helper Scripts (All executable)
│   ├── docker-start.sh                 ▶️  Start services
│   ├── docker-stop.sh                  ⏹️  Stop services
│   ├── docker-init.sh                  🔄 Initialize database
│   ├── docker-backup.sh                💾 Backup database
│   └── docker-logs.sh                  📋 View logs
│
├── 📚 Documentation
│   ├── DOCKER_INDEX.md                 📑 This file (navigation)
│   ├── DOCKER_QUICK_START.md           ⚡ 5-minute quick start
│   ├── DOCKER_README.md                📖 Main documentation
│   ├── DOCKER_DEPLOYMENT.md            🚀 Comprehensive deployment guide
│   ├── DOCKER_FILES_SUMMARY.md         📊 Complete file reference
│   └── DOCKER_SETUP_COMPLETE.md        ✅ Setup completion summary
│
└── app/
    ├── backend/
    │   ├── Dockerfile                  🐳 Backend container
    │   └── .dockerignore              🚫 Backend exclusions
    │
    └── frontend/
        ├── Dockerfile                  🐳 Frontend container
        ├── nginx.conf                 ⚙️  Nginx configuration
        └── .dockerignore              🚫 Frontend exclusions
```

## 📖 Documentation Guide

### For First-Time Users

1. **DOCKER_QUICK_START.md**
   - Time to read: 5 minutes
   - Purpose: Get started immediately
   - Contains:
     - Prerequisites check
     - 3-step quick start
     - Essential commands
     - Common issues
   - Start here: ⭐⭐⭐⭐⭐

2. **DOCKER_SETUP_COMPLETE.md**
   - Time to read: 10 minutes
   - Purpose: Understand what was created
   - Contains:
     - Complete file list
     - Architecture overview
     - Script reference
     - Use cases
   - Recommended: ⭐⭐⭐⭐

### For Regular Development

3. **DOCKER_README.md**
   - Time to read: 15 minutes
   - Purpose: Daily operations
   - Contains:
     - Service details
     - Common commands
     - Environment variables
     - Deployment scenarios
     - Troubleshooting
   - Essential: ⭐⭐⭐⭐⭐

4. **DOCKER_FILES_SUMMARY.md**
   - Time to read: 10 minutes
   - Purpose: File reference
   - Contains:
     - Detailed file descriptions
     - File purposes
     - Configuration details
     - Security features
   - Reference: ⭐⭐⭐

### For Production Deployment

5. **DOCKER_DEPLOYMENT.md**
   - Time to read: 30 minutes
   - Purpose: Production deployment
   - Contains:
     - Installation guides
     - Production configuration
     - Database management
     - Security best practices
     - CI/CD integration
     - Monitoring setup
   - Critical for production: ⭐⭐⭐⭐⭐

### Reference Documents

6. **DOCKER_INDEX.md** (This file)
   - Quick navigation
   - File organization
   - Documentation roadmap

## 🔧 Configuration Files

### docker-compose.yml
**Purpose**: Development environment  
**When to use**: Local development, testing  
**Key features**:
- Hot reload support
- All ports exposed
- Debug logging
- Development-friendly settings

**Quick commands**:
```bash
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose logs -f        # View logs
```

### docker-compose.prod.yml
**Purpose**: Production environment  
**When to use**: Production deployment  
**Key features**:
- Resource limits
- Enhanced security
- Database port not exposed
- Optimized for performance

**Quick commands**:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml logs -f
```

### .env.example
**Purpose**: Environment variables template  
**When to use**: First setup, reference  
**How to use**:
```bash
cp .env.example .env
nano .env  # Edit with your values
```

**Contains**:
- Database credentials
- JWT secrets
- API endpoints
- Security settings
- 50+ configurable variables

## 🤖 Helper Scripts

### ./docker-start.sh
**What it does**: Starts the entire stack  
**When to use**: First start, after updates  
**Features**:
- Checks prerequisites
- Interactive deployment selection
- Builds and starts services
- Runs migrations

**Usage**:
```bash
./docker-start.sh
# Follow interactive prompts
```

### ./docker-stop.sh
**What it does**: Stops services  
**When to use**: End of work, maintenance  
**Features**:
- Safe shutdown
- Option to preserve or remove data
- Confirmation for destructive actions

**Usage**:
```bash
./docker-stop.sh
# Choose: Stop (keep data) or Remove all
```

### ./docker-init.sh
**What it does**: Initializes database  
**When to use**: After first deployment  
**Features**:
- Waits for backend readiness
- Runs Prisma migrations
- Verifies initialization

**Usage**:
```bash
# After first docker-compose up
./docker-init.sh
```

### ./docker-backup.sh
**What it does**: Backs up PostgreSQL database  
**When to use**: Before updates, regularly (cron)  
**Features**:
- Timestamped backups
- Automatic compression
- Keeps last 10 backups
- Shows restore command

**Usage**:
```bash
./docker-backup.sh
# Creates: backups/backup_earntrack_YYYYMMDD_HHMMSS.sql.gz
```

### ./docker-logs.sh
**What it does**: Views service logs  
**When to use**: Debugging, monitoring  
**Features**:
- Interactive service selection
- Real-time streaming
- Auto-detects deployment type

**Usage**:
```bash
./docker-logs.sh
# Choose: All, Backend, Frontend, or Database
```

## 🐳 Container Definitions

### app/backend/Dockerfile
**Purpose**: Backend API container  
**Base**: node:20-alpine  
**Features**:
- Multi-stage build
- Prisma client generation
- Non-root user
- Health checks

**Build**:
```bash
docker build -t earntrack-backend ./app/backend
```

### app/frontend/Dockerfile
**Purpose**: Frontend web application  
**Base**: node:20-alpine → nginx:alpine  
**Features**:
- Multi-stage build (Node → Nginx)
- Vite build with API URL injection
- Nginx serving
- Non-root user

**Build**:
```bash
docker build -t earntrack-frontend \
  --build-arg VITE_API_URL=http://localhost:3001/api/v1 \
  ./app/frontend
```

### app/frontend/nginx.conf
**Purpose**: Nginx web server configuration  
**Features**:
- Gzip compression
- Security headers
- SPA routing
- Static caching
- Health endpoint

## 🎯 Quick Commands Reference

### Starting Services
```bash
# Development (interactive)
./docker-start.sh

# Development (manual)
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d --build
```

### Stopping Services
```bash
# Interactive
./docker-stop.sh

# Manual (keep data)
docker-compose down

# Remove everything (including data)
docker-compose down -v
```

### Viewing Logs
```bash
# Interactive
./docker-logs.sh

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Database Operations
```bash
# Backup
./docker-backup.sh

# Migrations
docker-compose exec backend npx prisma migrate deploy

# Database shell
docker-compose exec postgres psql -U earntrack -d earntrack
```

### Debugging
```bash
# Service status
docker-compose ps

# Health checks
curl http://localhost:3001/health
curl http://localhost/health

# Resource usage
docker stats

# Backend shell
docker-compose exec backend sh
```

## 🗺️ Recommended Learning Path

### Day 1: Getting Started
1. Read **DOCKER_QUICK_START.md** (5 min)
2. Run `./docker-start.sh` (2 min)
3. Access http://localhost:80
4. Create first user account
5. Test API at http://localhost:3001/health

### Day 2: Understanding the Setup
1. Read **DOCKER_SETUP_COMPLETE.md** (10 min)
2. Review **DOCKER_README.md** (15 min)
3. Explore helper scripts
4. Try `./docker-backup.sh`
5. View logs with `./docker-logs.sh`

### Day 3: Development Workflow
1. Make code changes
2. Rebuild services: `docker-compose up -d --build`
3. View logs: `docker-compose logs -f`
4. Test changes
5. Backup database before major changes

### Week 2: Production Preparation
1. Read **DOCKER_DEPLOYMENT.md** (30 min)
2. Review security best practices
3. Plan production environment
4. Update `.env` with production values
5. Test production build locally

### Production Deployment
1. Follow production checklist in **DOCKER_DEPLOYMENT.md**
2. Deploy with `docker-compose.prod.yml`
3. Setup SSL/TLS
4. Configure reverse proxy
5. Schedule automated backups
6. Setup monitoring

## 🆘 Need Help?

### Quick Answers
- **How do I start?** → `DOCKER_QUICK_START.md`
- **What was created?** → `DOCKER_SETUP_COMPLETE.md`
- **Daily commands?** → `DOCKER_README.md`
- **Production deploy?** → `DOCKER_DEPLOYMENT.md`
- **File reference?** → `DOCKER_FILES_SUMMARY.md`

### Troubleshooting Steps
1. Check logs: `./docker-logs.sh`
2. Check status: `docker-compose ps`
3. Verify .env: `cat .env`
4. Check documentation troubleshooting sections
5. Review error messages carefully

### Common Issues
- **Port in use** → Edit .env, change ports
- **Database connection** → Check postgres logs, restart
- **Build fails** → Clear cache: `docker system prune -a`
- **Blank frontend** → Check VITE_API_URL, rebuild
- **Can't connect** → Verify all services running: `docker-compose ps`

## 📊 File Statistics

- **Total Docker files**: 20
- **Configuration files**: 4
- **Helper scripts**: 5
- **Documentation files**: 6
- **Container definitions**: 5
- **Total documentation**: ~15,000 words
- **Total commands**: 100+ examples

## ✅ Setup Checklist

- [ ] All 20 files created
- [ ] Scripts are executable
- [ ] `.env` created from `.env.example`
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Ports 80, 3001, 5432 available
- [ ] 4GB+ RAM available
- [ ] Read DOCKER_QUICK_START.md
- [ ] Started services with `./docker-start.sh`
- [ ] Initialized database with `./docker-init.sh`
- [ ] Accessed application at http://localhost:80

## 🎓 Additional Resources

### Internal Documentation
- Application README: `/home/user/earning/README.md`
- Tech Spec: `/home/user/earning/app/TECH_SPEC.md`
- API Docs: `/home/user/earning/API_DOCS.md`

### External Resources
- Docker: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs/
- Nginx: https://nginx.org/en/docs/
- Prisma: https://www.prisma.io/docs

---

**Created**: 2025-11-16  
**Total Files**: 20  
**Status**: ✅ Complete and Production-Ready

**Navigate with confidence!** 🚀
