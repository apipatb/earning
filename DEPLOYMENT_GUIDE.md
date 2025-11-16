# EarnTrack - Comprehensive Deployment Guide

A complete guide for deploying EarnTrack to production with Railway (PostgreSQL + Node.js backend) and Vercel (React frontend).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Backend Deployment (Railway)](#backend-deployment-railway)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Environment Variables](#environment-variables)
6. [Database Migrations](#database-migrations)
7. [Secrets Management](#secrets-management)
8. [Post-Deployment Configuration](#post-deployment-configuration)
9. [Pre-Deployment Checklist](#pre-deployment-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting deployment, ensure you have:

### Required Accounts
- **GitHub Account** - Code repository (https://github.com)
- **Railway Account** - Backend & database hosting (https://railway.app)
- **Vercel Account** - Frontend hosting (https://vercel.com)
- **PostgreSQL Knowledge** - Basic understanding of relational databases

### Required Tools
```bash
# Local machine should have:
- Node.js 18+ (node --version)
- npm 9+ (npm --version)
- Git (git --version)
- PostgreSQL client (optional, for local testing)
```

### Code Repository
```bash
# Fork or clone the repository
git clone https://github.com/apipatb/earning.git
cd earning

# Verify structure
ls -la app/backend
ls -la app/frontend
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    EarnTrack Architecture               │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐           ┌─────────────────────┐
│   Vercel (Edge)  │           │  Railway (Backend)  │
│  ────────────── │           │  ───────────────── │
│  React Frontend  │◄────────► │  Node.js Express   │
│  - React 18     │ HTTPS     │  - API v1          │
│  - Vite         │           │  - Auth (JWT)      │
│  - TailwindCSS  │           │  - Rate Limiting   │
│  - Recharts     │           │  - Redis Cache     │
│  - Zustand      │           │  - Prometheus      │
│  - Axios        │           │  - Winston Logs    │
│  - Storage: 50MB│           │  - Storage: 500MB  │
└──────────────────┘           └──────────┬──────────┘
                                          │
                              ┌───────────▼──────────┐
                              │  PostgreSQL (Railway)│
                              │  ─────────────────  │
                              │  - Users            │
                              │  - Platforms        │
                              │  - Earnings         │
                              │  - Products/Sales   │
                              │  - Customers        │
                              │  - Expenses         │
                              │  - Invoices         │
                              │  - Documents        │
                              │  - Storage: 5GB     │
                              └────────────────────┘

Optional Services:
┌──────────────────────┐   ┌────────────────────┐
│  Redis Cache         │   │  Monitoring Stack  │
│  (Railway)           │   │  (Railway)         │
│  - Session storage   │   │  - Prometheus      │
│  - Cache layer       │   │  - Grafana         │
│  - Rate limit store  │   │  - Winston Logs    │
└──────────────────────┘   └────────────────────┘
```

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.2.0 | UI Framework |
| | Vite | 5.0 | Build tool |
| | TailwindCSS | 3.3 | Styling |
| | Zustand | 4.4 | State management |
| **Backend** | Node.js | 18+ | Runtime |
| | Express | 4.18 | HTTP framework |
| | Prisma | 5.7 | ORM |
| | TypeScript | 5.3 | Type safety |
| **Database** | PostgreSQL | 14+ | Primary database |
| **Cache** | Redis | 7+ | Session/cache store |
| **Security** | JWT | - | Authentication |
| | Helmet | 8.1 | HTTP security |
| | bcrypt | 5.1 | Password hashing |
| **Monitoring** | Prometheus | Latest | Metrics collection |
| | Winston | 3.11 | Logging |

---

## Backend Deployment (Railway)

### Step 1: Create Railway Account

1. Navigate to https://railway.app
2. Click "Start Project"
3. Sign up with GitHub account
4. Grant Railway access to your repositories
5. Select your code repository

### Step 2: Create PostgreSQL Database

1. In Railway dashboard, click "New Project"
2. Select "Provision PostgreSQL"
3. Wait for database initialization (2-3 minutes)
4. Go to PostgreSQL service → "Variables" tab
5. Copy `DATABASE_URL` value (format: `postgresql://user:password@host:port/database`)
6. Save for later use

```bash
# Example DATABASE_URL format:
postgresql://postgres:random_password@containers-us-west-000.railway.app:6542/railway
```

### Step 3: Create Node.js Service

1. In the same Railway project, click "New Service"
2. Select "GitHub Repo"
3. Search and select your repository
4. Select the branch (typically `main`)
5. Click "Deploy"

### Step 4: Configure Build Settings

In Railway Service Settings:

```
Build Command:     npm run build
Start Command:     npm --prefix app/backend start
Root Directory:    app/backend (if needed)
Node Version:      18.x (or latest LTS)
```

Or edit `railway.json` if it exists:

```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "npm run build"
  }
}
```

### Step 5: Configure Environment Variables

In Railway → Variables tab, add these variables:

```bash
# === DATABASE ===
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]

# === AUTHENTICATION ===
JWT_SECRET=your-very-secure-random-string-32-characters-minimum
JWT_EXPIRES_IN=7d

# === SERVER CONFIG ===
NODE_ENV=production
PORT=3000

# === CORS & API ===
ALLOWED_ORIGINS=https://earntrack.vercel.app,https://www.earntrack.vercel.app

# === RATE LIMITING ===
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# === CACHING (Optional) ===
REDIS_URL=redis://[user]:[password]@[host]:[port]
REDIS_ENABLED=true
CACHE_TTL_PROFILE=300
CACHE_TTL_PLATFORMS=1800
CACHE_TTL_EARNINGS=1800

# === MONITORING ===
LOG_LEVEL=info
PROMETHEUS_ENABLED=true

# === FILE UPLOAD ===
MAX_FILE_SIZE=52428800
UPLOAD_STORAGE_PATH=/tmp/uploads
```

**Important Security Notes:**
- Generate a strong JWT_SECRET (use: `openssl rand -base64 32`)
- Never commit secrets to Git
- Use Railway's built-in secrets manager
- Rotate secrets every 90 days

### Step 6: Deploy and Verify

1. Click "Deploy" button in Railway
2. Monitor deployment progress in logs
3. Wait for "Deployment successful" message
4. Verify health endpoint:

```bash
curl https://[railway-domain].railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-10T10:30:00Z",
  "uptime": 125.4
}
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Code

Ensure all code is committed to GitHub:

```bash
# From project root
git add .
git commit -m "Production deployment preparation"
git push origin main
```

### Step 2: Import Project to Vercel

1. Visit https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Select "Import Git Repository"
4. Paste your repository URL
5. Click "Import"

### Step 3: Configure Build Settings

Vercel should auto-detect it's a monorepo. Configure:

```
Framework:           Vite
Root Directory:      app/frontend
Build Command:       npm run build
Output Directory:    dist
Node Version:        18.x or later
Install Command:     npm install
```

Alternatively, create `vercel.json` at root:

```json
{
  "buildCommand": "cd app/frontend && npm run build",
  "outputDirectory": "app/frontend/dist",
  "installCommand": "npm install",
  "env": {
    "VITE_API_URL": "https://your-railway-backend.railway.app/api/v1"
  }
}
```

### Step 4: Set Environment Variables

In Vercel → Settings → Environment Variables:

```
Variable Name:     VITE_API_URL
Value:             https://[railway-domain].railway.app/api/v1
Environments:      Production, Preview, Development
```

To find your Railway backend URL:
1. Go to Railway dashboard
2. Select your backend service
3. Look for "Domain" in the service details
4. Format: `https://[service-name]-[random].railway.app`

### Step 5: Deploy

1. Click "Deploy" button
2. Monitor deployment progress
3. Wait for "Deployment Complete" status
4. Get your Vercel domain from project settings

```
Format: https://[project-name].vercel.app
```

### Step 6: Test Frontend

1. Open https://[project-name].vercel.app
2. Test user registration
3. Test login functionality
4. Open browser console (F12) - check for errors
5. Verify data loads from API
6. Test all main features

---

## Environment Variables

### Frontend Environment Variables

**File:** `/app/frontend/.env.production`

```bash
# API Configuration
VITE_API_URL=https://earntrack-api.railway.app/api/v1

# Feature Flags (optional)
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_SENTRY=false
```

**Local Development:** `/app/frontend/.env.local`

```bash
VITE_API_URL=http://localhost:3001/api/v1
```

### Backend Environment Variables

**File:** `/app/backend/.env.production`

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/dbname

# Authentication & Security
JWT_SECRET=your-strong-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000

# CORS Configuration
ALLOWED_ORIGINS=https://earntrack.vercel.app,https://www.earntrack.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Redis Caching
REDIS_ENABLED=true
REDIS_URL=redis://user:password@host:port
CACHE_TTL_PROFILE=300
CACHE_TTL_PLATFORMS=1800
CACHE_TTL_EARNINGS=1800

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
PROMETHEUS_ENABLED=true
ENABLE_REQUEST_LOGGING=true
```

**Local Development:** `/app/backend/.env.local`

```bash
DATABASE_URL=postgresql://localhost:5432/earntrack
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
REDIS_ENABLED=false
LOG_LEVEL=debug
PROMETHEUS_ENABLED=false
```

### Environment Variable Types

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| DATABASE_URL | String | Yes | PostgreSQL connection string |
| JWT_SECRET | String | Yes | Min 32 chars, alphanumeric+symbols |
| JWT_EXPIRES_IN | String | No | Default: 7d, format: "7d", "24h" |
| NODE_ENV | String | No | production, development, test |
| PORT | Number | No | Default: 3000, Railway assigns automatically |
| ALLOWED_ORIGINS | String | No | Comma-separated CORS origins |
| REDIS_URL | String | No | Optional for caching |
| REDIS_ENABLED | Boolean | No | Default: false, enable for caching |
| VITE_API_URL | String | Yes | Frontend: backend API URL |

---

## Database Migrations

### Initial Setup

After PostgreSQL is created and connected:

```bash
# Option 1: Using Railway CLI
railway run npm run db:push

# Option 2: Using Railway Shell
railway shell
cd app/backend
npm run db:push
exit
```

### Create New Migrations

When modifying the schema (`schema.prisma`):

```bash
# Locally
npm --prefix app/backend run db:migrate:dev --name <migration_name>

# Example
npm --prefix app/backend run db:migrate:dev --name add_user_preferences
```

### Apply Migrations to Production

```bash
# Verify locally first
npm --prefix app/backend run db:push

# Then in production
railway run npm run db:push

# Or check existing migrations
railway run npm run db:migrate
```

### Database Schema

Current Prisma models:

```
User (Central model)
├── Platforms (Earning sources)
├── Earnings (Daily earnings records)
├── Goals (Income targets)
├── Products (Inventory items)
├── Sales (Product sales records)
├── InventoryLogs (Inventory changes)
├── Customers (Client records)
├── Expenses (Cost tracking)
├── Invoices (Invoice documents)
└── Documents (File uploads)
```

### Migration Rollback

To rollback a migration (WARNING: data loss possible):

```bash
# Create a rollback migration
npm --prefix app/backend run db:migrate:dev --name rollback_<name>

# Then remove the problematic migration
# And redeploy
```

---

## Secrets Management

### Generating Secrets

**JWT Secret (32+ characters):**

```bash
# macOS/Linux
openssl rand -base64 32

# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

**Database Password:**

```bash
# Use Railway's auto-generated password (RECOMMENDED)
# Don't change manually unless required
```

### Secret Storage

**Never commit secrets to Git:**

```bash
# .gitignore should include:
.env
.env.local
.env.production
.env.*.local

# Verify no secrets are committed
git log --all -S 'JWT_SECRET' -- ':!'

# If accidentally committed, use git-filter-repo
```

### Railway Secrets Manager

Railway provides built-in secrets management:

1. Go to Railway Project Settings
2. Navigate to "Variables" tab
3. Add variables with sensitive values
4. Mark as "Secrets" if needed
5. Variables are encrypted at rest

### Best Practices

```
✓ Rotate JWT_SECRET every 90 days
✓ Generate with cryptographically secure methods
✓ Use different secrets for dev/staging/prod
✓ Store in Railway's secure vault
✓ Never share secrets via email/chat
✓ Audit who has access to secrets
✓ Log secret access (rotation)
✓ Update consumer applications when rotating
```

---

## Post-Deployment Configuration

### Step 1: Update CORS Configuration

After getting your Vercel domain, update Railway backend:

```bash
# In Railway → Backend Service → Variables
ALLOWED_ORIGINS=https://[project].vercel.app,https://www.[project].vercel.app
```

### Step 2: Verify Health Endpoints

**Backend Health Check:**

```bash
curl https://[railway-domain].railway.app/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2025-01-10T10:30:00Z",
  "uptime": 245.3
}
```

**API Version Check:**

```bash
curl https://[railway-domain].railway.app/api/v1
```

### Step 3: Test Authentication Flow

```bash
# 1. Register new user
curl -X POST https://[railway-domain].railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!","name":"Test User"}'

# 2. Login
curl -X POST https://[railway-domain].railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# 3. Use token in headers
curl https://[railway-domain].railway.app/api/v1/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 4: Configure Domain Aliases (Optional)

**For custom domain:**

1. Purchase domain (GoDaddy, Namecheap, etc.)
2. Vercel: Add custom domain in project settings
3. Update DNS records as indicated by Vercel
4. Wait for SSL certificate (5-10 minutes)
5. Update CORS in Railway to include custom domain

### Step 5: Set Up Monitoring

```bash
# Access Railway logs
railway logs --service backend

# Access Vercel logs
# Via dashboard: Deployments → Select deployment → Logs
```

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing: `npm run test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Code linting passes: `npm run lint`
- [ ] No console errors or warnings
- [ ] No hardcoded URLs or secrets
- [ ] No commented-out code
- [ ] Git history is clean

### Backend Checklist

- [ ] Environment variables documented
- [ ] Database schema finalized
- [ ] Migrations tested locally
- [ ] API endpoints tested
- [ ] Health check endpoint working
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Security headers set (Helmet)
- [ ] Input validation in place

### Frontend Checklist

- [ ] Build completes without errors
- [ ] Environment variables set correctly
- [ ] API URL pointing to correct backend
- [ ] All routes working
- [ ] Forms validating properly
- [ ] Responsive design verified
- [ ] Performance optimized
- [ ] Accessibility checked
- [ ] Error boundaries implemented

### Security Checklist

- [ ] JWT_SECRET is strong (32+ chars)
- [ ] NODE_ENV=production in Railway
- [ ] ALLOWED_ORIGINS restricted (no wildcards)
- [ ] HTTPS enforced everywhere
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] No sensitive data in logs
- [ ] Git repository is private
- [ ] No secrets in code/commits
- [ ] Security headers configured

### Infrastructure Checklist

- [ ] Railway account created and verified
- [ ] Vercel account created and verified
- [ ] GitHub repository connected
- [ ] PostgreSQL database created
- [ ] Environment variables all set
- [ ] Monitoring/logging enabled
- [ ] Backup strategy in place
- [ ] Alert notifications configured
- [ ] Disaster recovery plan documented

---

## Troubleshooting

### Database Connection Issues

**Error:** `error: password authentication failed`

```bash
# Solution:
1. Verify DATABASE_URL is correct in Railway
2. Check PostgreSQL service is running
3. Get fresh DATABASE_URL from Railway Variables tab
4. Ensure special characters are URL-encoded

# Example: password with @ becomes %40
postgresql://user:pass%40123@host:5432/db
```

**Error:** `connect ECONNREFUSED`

```bash
# Solution:
1. Check database is provisioned: Railway dashboard
2. Verify DATABASE_URL environment variable is set
3. Check railway logs: railway logs --service postgres
4. Ensure network connectivity between services
```

### CORS Errors

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

```bash
# Solution:
1. Verify VITE_API_URL in Vercel matches Railway domain
2. Check ALLOWED_ORIGINS in Railway includes Vercel domain
3. Remove trailing slashes from URLs
4. Ensure protocols match (https:// not http://)

# Example VITE_API_URL: https://earntrack-api.railway.app/api/v1
# Example ALLOWED_ORIGINS: https://earntrack.vercel.app,https://www.earntrack.vercel.app
```

### API Connection Timeout

**Error:** `ECONNREFUSED`, `ETIMEDOUT`, or `ERR_INTERNET_DISCONNECTED`

```bash
# Solution:
1. Check backend is running
   railway logs --service backend

2. Verify API endpoint is accessible
   curl https://[railway-domain].railway.app/health

3. Check network policies in Railway
   Railway → Project Settings → Network

4. Verify VITE_API_URL is correct in Vercel
   Vercel → Settings → Environment Variables
```

### Build Failures

**Railway Build Error:** `npm ERR! missing: required dependency`

```bash
# Solution:
1. Run npm install locally
2. Commit lock files: git add package-lock.json
3. Ensure all dependencies in package.json
4. Clear Railway cache: Delete service and redeploy
```

**Vercel Build Error:** `Cannot find module '@/components/...'`

```bash
# Solution:
1. Check TypeScript configuration
2. Verify tsconfig.json paths are correct
3. Ensure imports use correct paths
4. Run build locally to test: npm run build
```

### Performance Issues

**Slow API Response Times**

```bash
# Solution:
1. Check database query performance
   - Add database indexes to heavy queries
   - Use EXPLAIN ANALYZE on slow queries

2. Enable caching
   - Set REDIS_ENABLED=true
   - Adjust cache TTLs

3. Scale infrastructure
   - Upgrade Railway plan for more CPU/memory
   - Add more database connections

4. Monitor performance
   - Check Prometheus metrics
   - Review Winston logs for slow operations
```

---

## Quick Reference Commands

```bash
# Railway CLI
railway login                          # Authenticate with Railway
railway list                           # List projects
railway logs --service backend         # View backend logs
railway logs --service postgres        # View database logs
railway run npm run db:push            # Run migrations
railway shell                          # Open Railway shell

# Vercel CLI
vercel login                           # Authenticate with Vercel
vercel ls                              # List projects
vercel logs [project-name]             # View deployment logs
vercel env pull .env.local             # Pull environment variables

# Git
git add .                              # Stage all changes
git commit -m "message"                # Commit changes
git push origin main                   # Push to GitHub
git log --oneline                      # View commit history
```

---

## Support Resources

- **Railway Documentation:** https://docs.railway.app
- **Vercel Documentation:** https://vercel.com/docs
- **PostgreSQL Documentation:** https://www.postgresql.org/docs
- **Prisma ORM:** https://www.prisma.io/docs
- **Express.js:** https://expressjs.com/
- **React Documentation:** https://react.dev

---

## Deployment Record

```
Date Deployed:        _______________
Deployed By:          _______________
Railway Backend URL:  _______________
Vercel Frontend URL:  _______________
Database URL:         _______________
JWT Secret Rotation:  _______________
Last Backup:          _______________
Next Review Date:     _______________
```

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Production Ready
