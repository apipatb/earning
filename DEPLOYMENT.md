# EarnTrack Deployment Guide

Complete step-by-step guide to deploy EarnTrack to production.

## Overview

This guide covers deploying:
- **Backend** → Railway or Render (with PostgreSQL)
- **Frontend** → Vercel
- **Database** → PostgreSQL on Railway/Render

**Total Time**: 30-60 minutes
**Cost**: $0 (Free tier)

---

## Prerequisites

- GitHub account
- Railway/Render account (free)
- Vercel account (free)
- Git installed locally

---

## Part 1: Deploy Backend to Railway

Railway offers free PostgreSQL + Node.js hosting with $5 free credit/month.

### Step 1: Prepare Backend

```bash
cd app/backend

# Create .env.example for reference
cat > .env.example << 'EOF'
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-frontend.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
```

### Step 2: Create Railway Project

1. Go to https://railway.app
2. Sign in with GitHub
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your `earning` repository
6. Select **Root directory**: `app/backend`

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create a database
4. Copy the **DATABASE_URL** from the PostgreSQL service

### Step 4: Configure Environment Variables

In Railway project → Backend service → **Variables** tab:

```
DATABASE_URL=<copy from PostgreSQL service>
JWT_SECRET=<generate random string: openssl rand -base64 32>
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=*
```

### Step 5: Run Database Migrations

In Railway → Backend service → **Settings** → **Build Command**:

```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

**Start Command**:
```bash
npm start
```

### Step 6: Deploy

1. Railway auto-deploys on git push
2. Get your backend URL: `https://your-app.up.railway.app`
3. Test: `https://your-app.up.railway.app/health`

---

## Part 2: Deploy Frontend to Vercel

Vercel offers unlimited free hosting for Next.js/React apps.

### Step 1: Prepare Frontend

```bash
cd app/frontend

# Update .env.example
cat > .env.example << 'EOF'
VITE_API_URL=https://your-backend.up.railway.app/api/v1
EOF
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign in with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your `earning` repository
5. Configure:
   - **Root Directory**: `app/frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Add Environment Variables

In Vercel → Project Settings → **Environment Variables**:

```
VITE_API_URL=https://your-backend.up.railway.app/api/v1
```

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Get your URL: `https://your-app.vercel.app`

### Step 5: Update CORS

Go back to Railway → Backend → Variables:

```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Redeploy backend for CORS to take effect.

---

## Part 3: Alternative - Deploy Backend to Render

Render offers 750 hours/month free (PostgreSQL + Web Service).

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign in with GitHub

### Step 2: Create PostgreSQL Database

1. Click **"New"** → **"PostgreSQL"**
2. Settings:
   - **Name**: `earntrack-db`
   - **Database**: `earntrack`
   - **User**: `earntrack`
   - **Region**: Choose closest
   - **Plan**: Free
3. Click **"Create Database"**
4. Copy **Internal Database URL**

### Step 3: Create Web Service

1. Click **"New"** → **"Web Service"**
2. Connect your GitHub repository
3. Settings:
   - **Name**: `earntrack-backend`
   - **Root Directory**: `app/backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 4: Environment Variables

Add in Render → Web Service → **Environment**:

```
DATABASE_URL=<copy Internal Database URL>
JWT_SECRET=<generate random string>
NODE_ENV=production
PORT=10000
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Get URL: `https://earntrack-backend.onrender.com`

**Note**: Free tier spins down after 15 min of inactivity. First request may take 30-60 seconds.

---

## Part 4: Verify Deployment

### Test Backend

```bash
# Health check
curl https://your-backend-url.com/health

# Should return:
{"status":"ok","timestamp":"2025-11-15T..."}
```

### Test Frontend

1. Open `https://your-app.vercel.app`
2. Register a new account
3. Try creating a platform
4. Add an earning
5. Check if everything works

### Common Issues

**CORS Errors**:
- Update `ALLOWED_ORIGINS` in backend env
- Redeploy backend

**Database Connection Failed**:
- Check `DATABASE_URL` is correct
- Ensure migrations ran successfully

**404 on Frontend Routes**:
- Vercel auto-handles SPA routing
- No action needed

**Backend 500 Errors**:
- Check Railway/Render logs
- Verify all env variables are set

---

## Part 5: Custom Domain (Optional)

### Frontend (Vercel)

1. Go to Vercel → Project → **Settings** → **Domains**
2. Add your domain: `earntrack.com`
3. Update DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

### Backend (Railway)

1. Go to Railway → Service → **Settings** → **Domains**
2. Add custom domain: `api.earntrack.com`
3. Update DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-app.up.railway.app
   ```

---

## Part 6: Environment-Specific Configuration

### Production Best Practices

**Backend .env**:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<64-character-random-string>
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://earntrack.com,https://www.earntrack.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend .env**:
```env
VITE_API_URL=https://api.earntrack.com/api/v1
```

### Security Checklist

- ✅ Strong JWT_SECRET (min 32 characters)
- ✅ HTTPS only (enforced by Vercel/Railway)
- ✅ CORS restricted to your domain
- ✅ Rate limiting enabled
- ✅ Database connection via SSL
- ✅ No hardcoded secrets in code
- ✅ Environment variables in deployment platform

---

## Part 7: Monitoring & Maintenance

### Railway/Render Monitoring

- Check logs: Railway/Render Dashboard → Logs
- Monitor usage: Dashboard → Metrics
- Set up alerts: Dashboard → Settings → Notifications

### Database Backups

**Railway**:
- Auto-backups every 24 hours (Pro plan)
- Manual backup: Not available on free tier

**Render**:
- Manual backups via `pg_dump`
- Export: Render Dashboard → Database → Backups

### Manual Backup Script

```bash
# Install PostgreSQL client
brew install postgresql  # macOS
sudo apt install postgresql-client  # Linux

# Backup
pg_dump <DATABASE_URL> > backup.sql

# Restore
psql <DATABASE_URL> < backup.sql
```

---

## Part 8: Continuous Deployment

Both Railway and Vercel auto-deploy on git push:

```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main

# Railway deploys backend automatically
# Vercel deploys frontend automatically
```

### Deployment Workflow

1. Develop locally
2. Test thoroughly
3. Commit to git
4. Push to GitHub
5. Auto-deploys to production
6. Monitor logs for errors

---

## Part 9: Scaling & Costs

### Free Tier Limits

**Railway**:
- $5 credit/month (~500 hours)
- 512MB RAM
- 1GB disk
- Shared CPU

**Render**:
- 750 hours/month
- 512MB RAM
- Shared CPU
- Spins down after 15min inactivity

**Vercel**:
- Unlimited bandwidth
- 100GB bandwidth/month
- Serverless functions

### Upgrading

**When to upgrade**:
- >1000 users
- >$5 Railway credit used
- Need 99.9% uptime
- Custom domains required

**Costs**:
- Railway Pro: $20/month (8GB RAM, 100GB disk)
- Render Standard: $7/month (always-on, 512MB RAM)
- Vercel Pro: $20/month (unlimited bandwidth)

---

## Part 10: Troubleshooting

### Backend won't start

```bash
# Check logs
railway logs  # Railway CLI
# or check Render dashboard

# Common fixes:
1. Verify DATABASE_URL format
2. Check Prisma migrations ran
3. Ensure all env vars are set
4. Check Node.js version (20+)
```

### Frontend build fails

```bash
# Check Vercel logs
# Common fixes:
1. Verify VITE_API_URL is set
2. Check all dependencies installed
3. Fix TypeScript errors
4. Ensure Vite config correct
```

### Database migrations fail

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually:
npx prisma migrate deploy --skip-generate
```

---

## Quick Deploy Commands

### Railway (using CLI)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd app/backend
railway up

# Link to project
railway link

# Set env vars
railway env set JWT_SECRET=your-secret-here
```

### Vercel (using CLI)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd app/frontend
vercel

# Production deploy
vercel --prod
```

---

## Support

- Railway: https://help.railway.app
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs

**Need help?** Open an issue on GitHub!

---

**🎉 Congratulations! Your EarnTrack app is now live!**
