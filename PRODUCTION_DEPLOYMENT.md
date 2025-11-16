# EarnTrack - Production Deployment Guide

## 🚀 Complete Deployment Instructions

This guide covers deploying EarnTrack to production with Vercel (Frontend) + Railway (Backend + PostgreSQL).

---

## Prerequisites

1. **GitHub Repository** - Code pushed to GitHub
2. **Vercel Account** - Free tier at https://vercel.com
3. **Railway Account** - Free tier at https://railway.app
4. **PostgreSQL Database** - Will be created via Railway
5. **Environment Variables** - Prepared and ready

---

## Phase 1: Database Setup (Railway)

### Step 1: Create Railway Account
1. Visit https://railway.app
2. Sign up with GitHub
3. Connect to your GitHub account

### Step 2: Create PostgreSQL Database
1. In Railway dashboard, click "New Project"
2. Click "Provision PostgreSQL"
3. Wait for deployment to complete
4. Go to PostgreSQL service → Variables tab
5. Copy the `DATABASE_URL` (you'll need this)

### Step 3: Run Database Migrations
Once PostgreSQL is set up:

```bash
# Option A: Run migrations through Railway CLI
railway run npm run db:push

# Option B: Use Railway Shell
railway shell
cd app/backend
npm run db:push
exit
```

---

## Phase 2: Backend Deployment (Railway)

### Step 1: Create Node.js Service in Railway
1. In Railway project, click "New Service"
2. Select "GitHub Repo"
3. Choose your `earntrack` repository
4. Select branch (main or deployment branch)

### Step 2: Configure Build Settings
1. Go to Service → Settings
2. **Build Command**: `npm run build`
3. **Start Command**: `npm --prefix app/backend start`
4. **Root Directory**: `app/backend` (if Railway asks)

### Step 3: Set Environment Variables
In Railway Service → Variables, add:

```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[dbname]
JWT_SECRET=your-super-secret-jwt-key-change-this-NOW
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://your-domain.vercel.app,https://www.your-domain.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

### Step 4: Deploy Backend
1. Click "Deploy" button
2. Wait for build to complete (2-5 minutes)
3. Get the Railway URL from the domain section
4. Copy this URL - you'll need it for frontend!

**Example Railway URL**: `https://earntrack-backend.railway.app`

---

## Phase 3: Frontend Deployment (Vercel)

### Step 1: Push to GitHub
Ensure all code is committed and pushed:

```bash
git add .
git commit -m "Production ready deployment"
git push origin main
```

### Step 2: Import Project to Vercel
1. Visit https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect it's a monorepo

### Step 3: Configure Build Settings
1. **Framework**: Vite
2. **Root Directory**: `app/frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Node Version**: 18.x

### Step 4: Set Environment Variables
In Vercel → Settings → Environment Variables:

```
VITE_API_URL=https://your-railway-domain.railway.app/api/v1
```

Replace `your-railway-domain` with actual Railway backend URL.

### Step 5: Deploy Frontend
1. Click "Deploy"
2. Wait for build (2-3 minutes)
3. Get Vercel domain from project settings

**Example Vercel URL**: `https://earntrack.vercel.app`

---

## Phase 4: Post-Deployment Configuration

### Step 1: Update CORS in Railway Backend
Go back to Railway backend service, update environment variable:

```
ALLOWED_ORIGINS=https://earntrack.vercel.app,https://www.earntrack.vercel.app
```

### Step 2: Test API Connectivity
```bash
curl https://your-railway-domain.railway.app/health
```

Should return:
```json
{"status":"ok","timestamp":"2025-01-10T..."}
```

### Step 3: Test Frontend-Backend Communication
1. Open https://earntrack.vercel.app
2. Login with test account
3. Check browser console for any CORS errors
4. Verify data loads from API

---

## Monitoring & Maintenance

### View Logs

**Railway Backend Logs:**
```bash
railway logs --service backend
```

**Vercel Frontend Logs:**
- Visit Vercel dashboard → Deployments → View logs

### Monitor Performance

**Railway:**
- CPU/Memory usage: Railway dashboard → Metrics
- Database: Connections, queries, size

**Vercel:**
- Core Web Vitals: Analytics tab
- Build times: Deployments tab
- Error rates: Monitoring tab

### Set Up Alerts

**Railway:**
1. Go to PostgreSQL service
2. Settings → Alerting
3. Set up CPU/memory alerts

**Vercel:**
1. Project settings → Alerts
2. Enable failure notifications

---

## Troubleshooting

### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
1. Verify `VITE_API_URL` in Vercel matches Railway backend
2. Check `ALLOWED_ORIGINS` in Railway backend includes Vercel domain
3. Make sure both have trailing slashes removed

### API Connection Timeout
```
ECONNREFUSED or ETIMEDOUT
```

**Solution:**
1. Verify Railway backend is running: `railway logs --service backend`
2. Check database connection: `railway logs --service postgres`
3. Verify networking in Railway project settings

### Database Connection Failed
```
error: password authentication failed
```

**Solution:**
1. Verify `DATABASE_URL` is correct in Railway
2. Check PostgreSQL service is running
3. Get fresh DATABASE_URL from Railway variables

### Build Failures

**Vercel Build Error:**
```bash
npm ERR! missing: required dependency
```

Solution:
1. Run `npm install` locally
2. Commit lock files: `git add package-lock.json`
3. Push and redeploy

**Railway Build Error:**
```
TSError: Cannot find module
```

Solution:
1. Check build command includes both frontend and backend
2. Verify `app/backend/package.json` has all dependencies
3. Clear Railway cache: redeploy with cache clear

---

## Security Checklist

- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `NODE_ENV=production` in Railway
- [ ] `ALLOWED_ORIGINS` set correctly (no wildcards in production)
- [ ] HTTPS enforced (automatic on Vercel & Railway)
- [ ] Database backups enabled (Railway → PostgreSQL → Backups)
- [ ] Rate limiting active (50 req/min in production)
- [ ] No sensitive data in environment variables file
- [ ] Git repository is private
- [ ] Secrets not committed to repository

---

## Performance Optimization

### Frontend (Vercel)
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ Gzip compression
- ✅ Edge caching

### Backend (Railway)
- ✅ Database connection pooling (Prisma)
- ✅ API rate limiting
- ✅ Payload size limiting (10KB)
- ✅ Health check endpoint

### Database (PostgreSQL)
- ✅ Indexes on foreign keys
- ✅ Query optimization
- ✅ Connection limits
- ✅ Automated backups

---

## Updating Production

### Procedure for Code Updates

1. **Development**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git add .
   git commit -m "Add new feature"
   ```

2. **Testing** (local)
   ```bash
   npm run dev
   # Test all features
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/new-feature
   git checkout main
   git pull origin main
   git merge feature/new-feature
   git push origin main
   ```

4. **Vercel** - Auto-deploys from `main`
5. **Railway** - Auto-deploys if configured, or manual redeploy
6. **Verify** - Test at https://earntrack.vercel.app

### Zero-Downtime Database Migrations

```bash
# 1. Create migration locally
npm run db:migrate --name add_new_column

# 2. Test locally
npm run db:push

# 3. Push code
git add .
git commit -m "Add migration"
git push origin main

# 4. Run migration in production
railway run npm run db:push
```

---

## Backup & Disaster Recovery

### Database Backups

**Automatic Backups (Railway):**
- PostgreSQL → Settings → Backups
- Automatic daily backups for 7 days

**Manual Backup:**
```bash
railway run pg_dump $DATABASE_URL > backup.sql
```

**Restore from Backup:**
```bash
railway run psql $DATABASE_URL < backup.sql
```

### Code Backups
- All code on GitHub (source of truth)
- Vercel has automatic deployment history
- Railway has version history

---

## Scaling for Growth

### When to Scale

| Metric | Action |
|--------|--------|
| DB queries > 1000/min | Upgrade Railway plan |
| API response > 500ms | Add caching layer |
| Monthly visitors > 10k | Enable CDN |
| Storage > 50GB | Upgrade PostgreSQL tier |

### Scaling Steps

1. **Database:** Railway → PostgreSQL → Change plan
2. **Backend:** Railway → Node service → Upgrade RAM/CPU
3. **Frontend:** Vercel → Analytics → Check core web vitals
4. **Cache:** Add Redis (optional, for sessions)

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Express.js Guide**: https://expressjs.com
- **React Docs**: https://react.dev

---

## Deployment Checklist

- [ ] GitHub repository is up to date
- [ ] All tests passing locally
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] API endpoints tested
- [ ] Frontend builds without errors
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Team has access to dashboards
- [ ] Documentation updated
- [ ] Deployment runbook ready

---

## Quick Command Reference

```bash
# Local development
npm run dev                          # Start both frontend & backend
npm run backend:dev                  # Backend only
npm run frontend:dev                 # Frontend only

# Build
npm run build                        # Build both
npm run backend:build                # Backend only

# Database
npm run backend:db:push              # Run migrations
npm run backend:db:migrate           # Create new migration
npm run backend:db:studio            # Open Prisma Studio

# Deployment URLs (after deployment)
Frontend:  https://earntrack.vercel.app
Backend:   https://[project]-backend.railway.app
Database:  postgresql://[user]:[pass]@[host]:[port]/[db]
```

---

## Success Indicators

✅ You're successfully deployed when:

1. Frontend loads at `https://earntrack.vercel.app`
2. Login/signup works correctly
3. API calls return data (check Network tab)
4. All pages load without errors
5. Dashboard shows real data
6. Dark mode works
7. Mobile responsive design functions
8. No console errors
9. Health check passes: `[backend]/health`
10. Performance is acceptable (< 2s page load)

---

**Deployment Date**: _______
**Deployed By**: _______
**Production URL**: https://earntrack.vercel.app
**Backend URL**: https://[railway-domain].railway.app

✨ **Congratulations! EarnTrack is live!** ✨
