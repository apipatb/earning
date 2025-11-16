# 🚂 Railway Deployment Guide - EarnTrack Backend

## Quick Deploy (5 minutes)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub account `apipatb`

### Step 2: Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose repository: `apipatb/earning`
4. Railway will detect the project automatically

### Step 3: Configure Service Settings
1. In Railway dashboard, click on your service
2. Go to **"Settings"**
3. Set **Root Directory**: `app/backend`
4. Set **Build Command**: `npm run build`
5. Set **Start Command**: `npm start`

### Step 4: Add PostgreSQL Database
1. In your project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create a database and provide `DATABASE_URL` automatically

### Step 5: Set Environment Variables
Click **"Variables"** tab and add:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-random-string-change-this
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://earning-liart.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 32
```
Or use: https://generate-secret.vercel.app/32

### Step 6: Deploy
1. Railway will auto-deploy when you push to GitHub
2. Wait for build to complete (2-3 minutes)
3. Copy your Railway URL: `https://your-app.railway.app`

### Step 7: Run Database Migrations
1. In Railway dashboard, go to your service
2. Click **"Deployments"** → Select latest deployment
3. Click **"View Logs"**
4. Verify migrations ran successfully

Or run manually:
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Link project: `railway link`
4. Run: `railway run npm run db:migrate`

### Step 8: Update Frontend Environment Variable
1. Go to Vercel dashboard: https://vercel.com/apipatb/earning
2. Go to **"Settings"** → **"Environment Variables"**
3. Add new variable:
   - Name: `VITE_API_URL`
   - Value: `https://your-app.railway.app/api/v1`
   - Environment: Production, Preview, Development
4. Click **"Save"**
5. Go to **"Deployments"** → Click **"..."** → **"Redeploy"**

## Verify Deployment

### Test API Endpoint:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test from Frontend:
1. Go to https://earning-liart.vercel.app
2. Click **"create a new account"**
3. Register with email/password
4. Login
5. You should see the dashboard! 🎉

## Troubleshooting

### Build Fails
- Check logs in Railway dashboard
- Verify `DATABASE_URL` is set correctly
- Make sure `app/backend` is set as Root Directory

### Database Connection Error
- Verify PostgreSQL service is running
- Check `DATABASE_URL` format
- Run migrations: `railway run npm run db:migrate`

### CORS Error
- Verify `ALLOWED_ORIGINS` includes Vercel URL
- Format: `https://earning-liart.vercel.app` (no trailing slash)

## Cost
- **Free Tier**: $5 credit/month
- **Expected usage**: ~$5-10/month for small projects
- **Upgrade**: If needed, upgrade to Hobby plan ($5/month)

## Done! 🚀
Your backend is now live and connected to your frontend!
