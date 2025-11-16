# 🚀 EarnTrack Docker - START HERE

Welcome to your complete Docker deployment setup for EarnTrack!

## ⚡ Quick Start (3 Steps)

### 1️⃣ Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings (optional for development)
```

### 2️⃣ Start Services
```bash
./docker-start.sh
# Or manually: docker-compose up -d
```

### 3️⃣ Initialize Database
```bash
./docker-init.sh
# Or manually: docker-compose exec backend npx prisma migrate deploy
```

## 🌐 Access Your Application

- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📚 Documentation Navigation

### New User? Read These in Order:

1. **DOCKER_QUICK_START.md** ⭐⭐⭐⭐⭐
   - 5-minute quick start guide
   - Essential commands
   - Common troubleshooting

2. **DOCKER_README.md** ⭐⭐⭐⭐
   - Complete Docker reference
   - Daily operations
   - All commands

3. **DOCKER_DEPLOYMENT.md** ⭐⭐⭐⭐⭐
   - Production deployment
   - Security best practices
   - CI/CD integration

### Reference Documents:

- **DOCKER_INDEX.md** - Navigate all documentation
- **DOCKER_SETUP_COMPLETE.md** - What was created
- **DOCKER_FILES_SUMMARY.md** - File reference

## 🤖 Helper Scripts

All scripts are interactive and guide you through the process:

```bash
./docker-start.sh     # Start the application
./docker-stop.sh      # Stop services
./docker-init.sh      # Initialize database
./docker-backup.sh    # Backup database
./docker-logs.sh      # View logs
```

## 🐳 What's Included

### Services
- ✅ PostgreSQL 15 (Database)
- ✅ Node.js Backend (API)
- ✅ React Frontend (Web App)
- ✅ Nginx (Web Server)

### Features
- ✅ Multi-stage Docker builds
- ✅ Health checks on all services
- ✅ Database persistence
- ✅ Hot reload support (development)
- ✅ Production optimizations
- ✅ Security hardening
- ✅ Automated backups
- ✅ Interactive helper scripts

### Files Created (20 Total)
- 4 Configuration files
- 5 Helper scripts
- 8 Documentation files
- 3 Dockerfiles + configs

## 🔧 Common Commands

### Development
```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild after changes
docker-compose up -d --build backend
```

### Production
```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d --build

# View production logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Database
```bash
# Backup database
./docker-backup.sh

# Access database shell
docker-compose exec postgres psql -U earntrack -d earntrack

# Run migrations
docker-compose exec backend npx prisma migrate deploy
```

## 🆘 Troubleshooting

### Services won't start?
```bash
# Check logs
docker-compose logs

# Verify Docker is running
docker ps

# Start fresh
docker-compose down -v
./docker-start.sh
```

### Port already in use?
```bash
# Edit .env file and change ports
nano .env
# Change: FRONTEND_PORT=8080, BACKEND_PORT=3002, POSTGRES_PORT=5433
```

### Can't connect to database?
```bash
# Check database health
docker-compose exec postgres pg_isready -U earntrack

# Restart database
docker-compose restart postgres
```

## 📋 Checklist

Before you start:
- [ ] Docker installed (`docker --version`)
- [ ] Docker Compose installed (`docker-compose --version`)
- [ ] Ports 80, 3001, 5432 available
- [ ] 4GB+ RAM available
- [ ] 10GB+ disk space

After setup:
- [ ] Services started (`docker-compose ps`)
- [ ] Database initialized
- [ ] Frontend accessible at http://localhost:80
- [ ] Backend health check passes
- [ ] First user account created

## 🎯 Next Steps

### For Development
1. Read `DOCKER_README.md`
2. Start making code changes
3. Use `./docker-logs.sh` to debug
4. Backup database regularly with `./docker-backup.sh`

### For Production
1. Read `DOCKER_DEPLOYMENT.md`
2. Update `.env` with production values
3. Use `docker-compose.prod.yml`
4. Setup SSL/TLS certificates
5. Configure reverse proxy
6. Schedule automated backups

## 🔗 Quick Links

| File | Purpose | Priority |
|------|---------|----------|
| DOCKER_QUICK_START.md | 5-minute start | ⭐⭐⭐⭐⭐ |
| DOCKER_README.md | Daily reference | ⭐⭐⭐⭐ |
| DOCKER_DEPLOYMENT.md | Production guide | ⭐⭐⭐⭐⭐ |
| DOCKER_INDEX.md | Documentation index | ⭐⭐⭐ |
| DOCKER_SETUP_COMPLETE.md | Setup summary | ⭐⭐⭐⭐ |

## 💡 Pro Tips

1. **Use helper scripts** - They're interactive and prevent mistakes
2. **Read DOCKER_QUICK_START.md first** - Save time with the essentials
3. **Check logs when debugging** - `./docker-logs.sh` is your friend
4. **Backup before major changes** - `./docker-backup.sh` takes 10 seconds
5. **Use production config for prod** - `docker-compose.prod.yml` has optimizations

## ✅ You're Ready!

Everything is set up and ready to go. Start with:

```bash
./docker-start.sh
```

Then visit: http://localhost:80

---

**Need help?** Check `DOCKER_QUICK_START.md` or `DOCKER_README.md`

**Happy coding!** 🚀
