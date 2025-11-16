# EarnTrack - Vercel Deployment Guide

## Overview
EarnTrack is a full-stack application with:
- **Frontend**: React + Vite (best on Vercel)
- **Backend**: Express.js + PostgreSQL (better on Railway/Render)

## Deployment Strategy

### Option 1: Frontend on Vercel + Backend on Railway (Recommended)

#### Step 1: Deploy Frontend to Vercel

1. **Connect Git Repository**
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables in Vercel Dashboard**
   - Go to Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.railway.app/api/v1`

3. **Deploy**
   ```bash
   vercel --prod
   ```

#### Step 2: Deploy Backend to Railway

1. **Create Railway Account** at https://railway.app

2. **Create New Project**
   - Connect GitHub repository
   - Select this repository

3. **Configure Services**
   - **PostgreSQL Service**
     - Add PostgreSQL from Railway marketplace
     - Create database

   - **Node.js Service**
     - Point to `app/backend` folder
     - Set build command: `npm install && npm run build`
     - Set start command: `npm start`

4. **Set Environment Variables**
   ```
   DATABASE_URL=<from Railway PostgreSQL>
   JWT_SECRET=<generate-random-secret>
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
   PORT=3000
   ```

5. **Run Database Migration**
   ```bash
   npm run db:push
   # or
   npm run db:migrate
   ```

#### Step 3: Update Frontend API Endpoint

After deploying the backend, update your frontend environment:
1. In Vercel Dashboard → Environment Variables
2. Set `VITE_API_URL` to your Railway backend URL

---

### Option 2: Frontend Only on Vercel (Recommended for Simple Setup)

If you want to keep everything simple initially:

1. **Deploy only the frontend to Vercel**
2. **Run backend locally** during development
3. **Upgrade to separate backend service later**

---

## Local Development

### Start Both Services
```bash
npm run dev
```

This runs:
- Frontend on http://localhost:5173
- Backend on http://localhost:3001

### Backend Only
```bash
npm run backend:dev
```

### Frontend Only
```bash
npm run frontend:dev
```

---

## Environment Variables

### Frontend (app/frontend/.env)
```
VITE_API_URL=http://localhost:3001/api/v1
```

### Backend (app/backend/.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/earntrack
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.vercel.app
PORT=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Database Migration on Production

After setting up PostgreSQL:

```bash
cd app/backend
npm run db:push
# or for managed migrations
npm run db:migrate
```

---

## Troubleshooting

### CORS Errors
- Make sure `ALLOWED_ORIGINS` includes your Vercel domain
- Format: `https://your-app.vercel.app`

### API Connection Errors
- Verify `VITE_API_URL` in Vercel environment variables
- Check backend is running and accessible
- Test endpoint: `curl https://your-backend-url/health`

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is accessible from Railway
- Run migrations: `npm run db:push`

---

## Deployment Timeline

1. **Day 1**: Deploy frontend to Vercel
2. **Day 2**: Set up PostgreSQL on Railway
3. **Day 3**: Deploy backend to Railway
4. **Day 4**: Configure environment variables
5. **Day 5**: Run database migrations
6. **Day 6**: Test all features
7. **Day 7**: Go live!

---

## Alternative Backend Hosting Options

| Platform | Best For | Cost |
|----------|----------|------|
| **Railway** | Full-stack apps | $5/month starter |
| **Render** | Static + dynamic apps | $7/month starter |
| **Fly.io** | Global distribution | $5/month starter |
| **AWS EC2** | Full control | $1-5/month free tier |
| **Heroku** | Quick setup (paid only) | $7/month basic |

---

## Quick Deploy Checklist

- [ ] Frontend built and deployed to Vercel
- [ ] Backend repository connected to Railway
- [ ] PostgreSQL database created
- [ ] Environment variables set on both platforms
- [ ] Database migrations run
- [ ] CORS origins configured
- [ ] Health endpoint accessible
- [ ] API endpoints tested
- [ ] Frontend-backend communication verified
- [ ] Production domain configured

---

## Support Resources

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Express.js Guide](https://expressjs.com)
- [React Docs](https://react.dev)
