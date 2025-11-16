# EarnTrack - Quick Start Guide

Get EarnTrack running locally in 5 minutes for development.

---

## 5-Minute Quick Start

### Prerequisites (1 min)

```bash
# Verify you have required tools
node --version      # 18+
npm --version       # 9+
git --version       # 2.30+
```

**Don't have them?** Install from:
- Node.js: https://nodejs.org (choose LTS)
- Git: https://git-scm.com

### Clone Repository (1 min)

```bash
# Clone the project
git clone https://github.com/apipatb/earning.git
cd earning

# Or if you forked it
git clone https://github.com/YOUR_USERNAME/earning.git
cd earning
```

### Setup Environment (1 min)

```bash
# Install dependencies
npm install

# Create environment files
cp app/backend/.env.example app/backend/.env.local
cp app/frontend/.env.example app/frontend/.env.local

# Backend defaults to in-memory DB (no PostgreSQL needed!)
# Frontend points to http://localhost:3001
```

### Start Development (2 min)

```bash
# Terminal 1: Start both frontend & backend
npm run dev

# Or in separate terminals:
# Terminal 1 - Backend
npm --prefix app/backend run dev

# Terminal 2 - Frontend
npm --prefix app/frontend run dev
```

### Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api/v1

### Create Test Account

```
Email: test@example.com
Password: Test123!@
```

---

## Detailed Setup

### Option 1: With Real Database (Recommended for production work)

**Using Docker:**

```bash
# Start PostgreSQL container
docker run --name earntrack-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=earntrack \
  -p 5432:5432 \
  -d postgres:14

# Update .env.local with real DATABASE_URL
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/earntrack"

# Run migrations
npm --prefix app/backend run db:push

# Start development
npm run dev
```

**Using Local PostgreSQL:**

```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql

# Start service
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Create database
createdb earntrack

# Update DATABASE_URL in .env.local
# DATABASE_URL="postgresql://your_user:password@localhost:5432/earntrack"

# Run migrations
npm --prefix app/backend run db:push

# Start development
npm run dev
```

**Windows:**

```bash
# Download installer from https://www.postgresql.org/download/windows/
# Run installer and follow setup

# Or use WSL2
wsl --install
# Then follow Linux instructions
```

### Option 2: Docker Compose (All-in-one)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: earntrack
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Run:

```bash
docker-compose up -d
npm --prefix app/backend run db:push
npm run dev
```

---

## Running Services

### Both Frontend & Backend

```bash
# From project root (runs both)
npm run dev
```

Output:
```
> earntrack-frontend: vite
> earntrack-backend: tsx watch src/server.ts

VITE v5.0.7 starting...
Express server running on http://localhost:3001
```

### Backend Only

```bash
# Terminal 1
npm --prefix app/backend run dev

# Output:
# Express server listening on port 3001
# Database connected
# Ready to accept requests
```

### Frontend Only

```bash
# Requires backend running on http://localhost:3001
npm --prefix app/frontend run dev

# Output:
# VITE v5.0.7 ready in XXXms
# ➜  Local:   http://localhost:5173/
```

### Production Build

```bash
# Build both
npm run build

# Or individually
npm --prefix app/backend run build
npm --prefix app/frontend run build

# Start production build
npm --prefix app/backend start
# and serve app/frontend/dist
```

---

## Running Tests

### Unit Tests

```bash
# Backend tests
npm --prefix app/backend run test

# Frontend tests
npm --prefix app/frontend run test

# With coverage
npm --prefix app/backend run test:coverage
npm --prefix app/frontend run test:coverage

# Watch mode (re-run on file change)
npm --prefix app/backend run test:watch
npm --prefix app/frontend run test:watch
```

### E2E Tests

```bash
# Run E2E tests
npm --prefix app/frontend run test:e2e

# Interactive mode
npm --prefix app/frontend run test:e2e:ui

# Debug mode
npm --prefix app/frontend run test:e2e:debug

# Specific browser
npm --prefix app/frontend run test:e2e:chrome
npm --prefix app/frontend run test:e2e:firefox
```

### All Tests

```bash
# Run all tests
npm run test

# Or manually run all
npm --prefix app/backend run test
npm --prefix app/frontend run test
npm --prefix app/frontend run test:e2e
```

---

## Common Commands

### Development

```bash
# Start development servers
npm run dev

# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run build:check
```

### Database

```bash
# Push schema to database
npm --prefix app/backend run db:push

# Create new migration
npm --prefix app/backend run db:migrate:dev --name migration_name

# Open Prisma Studio (visual database editor)
npm --prefix app/backend run db:studio

# Generate Prisma client
npm --prefix app/backend run db:generate
```

### Testing

```bash
# Run tests
npm run test

# Watch mode
npm --prefix app/backend run test:watch

# Coverage
npm --prefix app/backend run test:coverage

# E2E
npm --prefix app/frontend run test:e2e
```

### Building

```bash
# Build everything
npm run build

# Check types and build frontend
npm --prefix app/frontend run build:check

# Preview production build
npm --prefix app/frontend run preview
```

---

## Troubleshooting Setup Issues

### Port Already in Use

```bash
# Find what's using the port
# macOS/Linux
lsof -i :3001
lsof -i :5173

# Windows
netstat -ano | findstr :3001

# Kill the process
kill -9 PID              # macOS/Linux
taskkill /PID PID /F     # Windows

# Or use different port
PORT=3002 npm run dev
```

### npm install fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# If still fails, check Node version
node --version  # Should be 18+
npm install -g npm  # Update npm
```

### Database Connection Error

```bash
# Check if database is running
docker ps                    # If using Docker
psql -d earntrack -c "SELECT 1;"  # If local PostgreSQL

# Verify DATABASE_URL in .env.local
cat app/backend/.env.local | grep DATABASE_URL

# If using in-memory, this error is OK during development
```

### Module Not Found Error

```bash
# Reinstall dependencies
npm install

# Clear build cache
rm -rf dist/
rm -rf app/backend/dist/
rm -rf app/frontend/dist/

# Rebuild
npm run build
```

### TypeScript Compilation Error

```bash
# Check for errors
npm run build:check

# Fix if needed
npm run lint -- --fix

# or manually fix reported issues
```

### Hot Reload Not Working

```bash
# Restart development server
npm run dev

# Check if file watchers available
# Increase file watcher limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Project Structure Overview

```
earning/
├── app/
│   ├── backend/          ← Node.js API server
│   │   ├── src/
│   │   ├── prisma/       ← Database schemas
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── frontend/         ← React web app
│       ├── src/
│       ├── tests/
│       ├── e2e/
│       └── package.json
│
├── package.json          ← Root scripts
└── CONTRIBUTING.md       ← Contributing guide
```

---

## Environment Variables

### Backend (.env.local)

| Variable | Default | Purpose |
|----------|---------|---------|
| DATABASE_URL | in-memory | Database connection (optional) |
| JWT_SECRET | dev-secret | Auth token secret |
| PORT | 3001 | Server port |
| NODE_ENV | development | Environment |
| VITE_API_URL | optional | API URL |
| LOG_LEVEL | debug | Logging level |

### Frontend (.env.local)

| Variable | Default | Purpose |
|----------|---------|---------|
| VITE_API_URL | http://localhost:3001/api/v1 | Backend API URL |

---

## API Endpoints

Quick reference for available endpoints:

```
GET  /health                    Health check
POST /api/v1/auth/register      Create account
POST /api/v1/auth/login         Login
GET  /api/v1/user/profile       Get profile
GET  /api/v1/platforms          List platforms
GET  /api/v1/earnings           List earnings
POST /api/v1/earnings           Create earning
GET  /api/v1/products           List products
GET  /api/v1/sales              List sales
```

**Test API with curl:**

```bash
# Health check
curl http://localhost:3001/health

# Register
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!",
    "name":"Test User"
  }'

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test123!"
  }'

# Get earnings (requires token)
curl http://localhost:3001/api/v1/earnings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## IDE Setup

### Visual Studio Code

1. Install extensions:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - Prisma
   - Thunder Client (for API testing)

2. Create `.vscode/settings.json`:
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "[typescript]": {
       "editor.defaultFormatter": "esbenp.prettier-vscode"
     }
   }
   ```

### Other IDEs

- **WebStorm:** Built-in support for Node.js and React
- **Sublime Text:** Install TypeScript plugin
- **Vim/Neovim:** Install LSP support

---

## Next Steps

1. **Read documentation:**
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deploy to production
   - [CONTRIBUTING.md](CONTRIBUTING.md) - Code standards
   - [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Architecture

2. **Create a feature:**
   - Make changes to app/backend or app/frontend
   - Run tests: `npm run test`
   - Create pull request

3. **Access databases:**
   - Open Prisma Studio: `npm --prefix app/backend run db:studio`
   - Visual database editor on http://localhost:5555

---

## Common Workflows

### Add New Feature

```bash
# 1. Create branch
git checkout -b feat/my-feature

# 2. Make changes
# Edit app/backend/src and app/frontend/src

# 3. Run tests
npm run test

# 4. Commit
git add .
git commit -m "feat: description"

# 5. Push
git push origin feat/my-feature

# 6. Create PR on GitHub
```

### Fix a Bug

```bash
# 1. Create branch
git checkout -b fix/bug-name

# 2. Locate bug
# Use browser DevTools and logs

# 3. Write test
npm --prefix app/backend run test -- write test

# 4. Fix code
# Edit files until test passes

# 5. Verify
npm run build:check

# 6. Commit and push
```

### Update Database Schema

```bash
# 1. Edit schema.prisma
vim app/backend/prisma/schema.prisma

# 2. Create migration
npm --prefix app/backend run db:migrate:dev --name description

# 3. Review migration file
cat app/backend/prisma/migrations/*/migration.sql

# 4. Apply
npm --prefix app/backend run db:push

# 5. Commit
git add .
git commit -m "feat(db): migration description"
```

---

## Performance Tips

### Frontend

- Use Chrome DevTools → Performance tab to profile
- Check Lighthouse scores
- Monitor Network tab for large requests

### Backend

- Enable query logging: `LOG_LEVEL=debug`
- Use Prisma Studio to inspect queries
- Check response times in console output

### Database

- Use `npm --prefix app/backend run db:studio` to view data
- Check slow queries in logs
- Avoid N+1 query problems

---

## Getting Help

### Documentation

- 📖 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment
- 📖 [CONTRIBUTING.md](CONTRIBUTING.md) - Code standards
- 📖 [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Architecture
- 📖 [PRODUCTION_RUNBOOK.md](PRODUCTION_RUNBOOK.md) - Operations

### Online Resources

- **Express.js:** https://expressjs.com
- **React:** https://react.dev
- **Prisma:** https://www.prisma.io/docs
- **PostgreSQL:** https://www.postgresql.org/docs
- **Vite:** https://vitejs.dev

### Ask for Help

- Create GitHub issue for bugs
- Start discussion for questions
- Comment on pull requests

---

**Happy coding! 🚀**

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Ready to Use
