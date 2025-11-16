# Quick Reference - File Locations & Line Numbers

## Critical Missing Components

### 1. ERROR BOUNDARY (HIGH PRIORITY)
**Status**: NOT FOUND
**Create**: `/app/frontend/src/components/ErrorBoundary.tsx`
**Then wrap**: 
- `/app/frontend/src/App.tsx` line 44-64 (`<Outlet />`)
- `/app/frontend/src/pages/Dashboard.tsx` (entire component)
- `/app/frontend/src/pages/Analytics.tsx` (entire component)
- `/app/frontend/src/pages/Reports.tsx` (entire component)

### 2. ESLINT CONFIG (HIGH PRIORITY)
**Status**: NOT FOUND
**Create**: `/app/frontend/.eslintrc.cjs`
**Add to package.json**: `"lint": "eslint . --ext ts,tsx"`

### 3. PRETTIER CONFIG (HIGH PRIORITY)
**Status**: NOT FOUND  
**Create**: `/app/frontend/.prettierrc`
**Add to package.json**: `"format": "prettier --write ."`

### 4. JEST CONFIG (HIGH PRIORITY)
**Status**: NOT FOUND
**Create**: `/app/backend/jest.config.js`
**Also create test directories**:
- `/app/backend/src/utils/__tests__/`
- `/app/backend/src/middleware/__tests__/`
- `/app/backend/src/controllers/__tests__/`

---

## Files to Modify (Existing)

### Frontend Configuration Files

#### `/app/frontend/vite.config.ts`
**Line 4-15**: Add build optimization
```typescript
build: {
  target: 'esnext',
  minify: 'terser',
  sourcemap: false,
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'router': ['react-router-dom'],
        'forms': ['react-hook-form'],
        'charts': ['recharts'],
      }
    }
  }
}
```

#### `/app/frontend/tsconfig.json`
**Line 14-16**: Change these values:
```json
"strict": true,           // was false
"noUnusedLocals": true,   // was false
"noUnusedParameters": true, // was false
```

#### `/app/frontend/package.json`
**Line 5**: Update scripts section
```json
"lint": "eslint . --ext ts,tsx",
"format": "prettier --write .",
"build:check": "tsc && vite build"
```

#### `/app/frontend/src/App.tsx`
**Line 25-70**: Add lazy loading and 404 route
```typescript
// Add after line 23:
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Earnings = lazy(() => import('./pages/Earnings'));
// ... other lazy imports

// Wrap Routes with Suspense and add 404:
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    {/* existing routes */}
    <Route path="*" element={<NotFound />} />
  </Routes>
</Suspense>
```

### Backend Configuration Files

#### `/app/backend/src/server.ts`
**Line 28-50**: Add missing middleware BEFORE routes
```typescript
import compression from 'compression';
import helmet from 'helmet';

app.use(helmet());
app.use(compression());
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

#### `/app/backend/.env.example`
**Entire file**: Add missing variables
```
# Existing
DATABASE_URL="..."
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV="development"
ALLOWED_ORIGINS="..."
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ADD THESE:
LOG_LEVEL="info"
DB_POOL_SIZE="20"
DB_TIMEOUT="10000"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRES_IN="30d"
SENTRY_DSN=""
SLACK_WEBHOOK_URL=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
```

#### `/app/backend/.env.example` → `/app/frontend/.env.example`
**Entire file**: Currently only has 1 line, add:
```
VITE_API_URL=http://localhost:3001/api/v1
VITE_APP_ENV=development
VITE_LOG_LEVEL=debug
VITE_SENTRY_DSN=
VITE_API_TIMEOUT=30000
VITE_ANALYTICS_ID=
```

#### `/app/backend/tsconfig.json`
**Status**: ✅ GOOD (strict: true already)

#### `/app/backend/package.json`
**Line 10-11**: Add missing packages
```bash
npm install helmet compression
npm install --save-dev @types/compression
```

#### `/app/frontend/package.json`
**Add devDependencies**:
```bash
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser @vitejs/plugin-react
npm uninstall @heroicons/react
npm install react-error-boundary zod
```

---

## Database Schema Changes

### `/app/backend/prisma/schema.prisma`

#### Add to Customer model (after line 240):
```prisma
@@index([userId, createdAt(sort: Desc)])
@@index([userId, lastPurchase(sort: Desc)])
```

#### Add to Invoice model (after line 300):
```prisma
@@index([customerId])
```

#### Add to Product model (after line 169):
```prisma
@@index([userId, reorderPoint])
```

#### Add to Sale model (after line 192):
```prisma
@@index([userId, customer])
```

---

## Code Duplication Patterns to Extract into Hooks

### Pattern 1: useAsync (appears in 15+ pages)
**Example locations**:
- `/app/frontend/src/pages/Dashboard.tsx` lines 35-49
- `/app/frontend/src/pages/Earnings.tsx` lines 39-52
- `/app/frontend/src/pages/Analytics.tsx` lines 32-45

**Extract to**: `/app/frontend/src/hooks/useAsync.ts`

### Pattern 2: useFetch (appears in all API calls)
**Example locations**:
- `/app/frontend/src/pages/Dashboard.tsx` line 41-44 (Promise.all)
- `/app/frontend/src/pages/Earnings.tsx` line 52-57
- `/app/frontend/src/pages/Analytics.tsx` line 45-50

**Extract to**: `/app/frontend/src/hooks/useFetch.ts`

### Pattern 3: usePagination (appears in 8 pages)
**Example locations**:
- `/app/frontend/src/pages/Earnings.tsx` (manual offset/limit)
- `/app/frontend/src/pages/Customers.tsx` (manual offset/limit)
- `/app/frontend/src/pages/Invoices.tsx` (manual offset/limit)

**Extract to**: `/app/frontend/src/hooks/usePagination.ts`

---

## Store Modifications

### Add Persistence to All Stores

#### `/app/frontend/src/store/theme.store.ts`
**Wrap with persist** (currently doesn't persist):
```typescript
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({ ... }),
    { name: 'theme-storage' }
  )
);
```

#### `/app/frontend/src/store/currency.store.ts`
**Wrap with persist**:
```typescript
export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({ ... }),
    { name: 'currency-storage' }
  )
);
```

#### `/app/frontend/src/store/i18n.store.ts`
**Wrap with persist**:
```typescript
export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({ ... }),
    { name: 'i18n-storage' }
  )
);
```

### Create New Stores

#### Create `/app/frontend/src/store/filter.store.ts`
For managing table filters, pagination, sorting globally

#### Create `/app/frontend/src/store/ui.store.ts`
For modals, sidebars, expanded sections, drawer states

#### Split `/app/frontend/src/store/customTheme.store.ts` (10KB - too large)
- Keep colors → `/app/frontend/src/store/branding.store.ts`
- Keep animations → `/app/frontend/src/store/appearance.store.ts`
- Keep fonts → `/app/frontend/src/store/typography.store.ts`

---

## Tests to Create (Priority Order)

### Backend Utilities (90% coverage target)
```
/app/backend/src/utils/__tests__/
  ├── jwt.test.ts (verify/generate token)
  ├── password.test.ts (hash/compare, validate)
  ├── validation.test.ts (parseLimitParam, parseOffsetParam, etc)
  └── resource.test.ts (checkResourceOwnership, getDateRange)
```

### Backend Middleware (80% coverage target)
```
/app/backend/src/middleware/__tests__/
  ├── auth.middleware.test.ts
  └── error.middleware.test.ts
```

### Backend Controllers (70% coverage target)
```
/app/backend/src/controllers/__tests__/
  ├── auth.controller.test.ts (register, login)
  ├── earning.controller.test.ts (CRUD)
  └── invoice.controller.test.ts (create with line items)
```

---

## Docker Files to Create

### `/app/frontend/Dockerfile`
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `/app/backend/Dockerfile`
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### `/docker-compose.yml`
At root level with both services

---

## Package Installation Commands

### Frontend
```bash
# Add error boundary
npm install react-error-boundary

# Add validation to match backend
npm install zod

# Add testing
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Remove duplicate icon library
npm uninstall @heroicons/react

# Add ESLint/Prettier
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-hooks prettier
```

### Backend
```bash
# Add security
npm install helmet compression
npm install --save-dev @types/compression

# Add pino for better logging (optional, current logger works)
npm install pino pino-pretty

# Already installed:
# npm install jest ts-jest supertest --save-dev
```

---

## One-Time Setup Commands

### Initialize Git Pre-commit Hooks (optional but recommended)
```bash
npm install --save-dev husky lint-staged

npx husky install
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-push "npm test"

# Add to package.json:
"lint-staged": {
  "*.{ts,tsx}": "eslint --fix",
  "*.{js,jsx,ts,tsx}": "prettier --write"
}
```

---

## Verification Checklist

After implementing changes, verify with:

```bash
# Frontend
npm run lint              # Should pass with new ESLint config
npm run format            # Should format all files
npm run build:check       # Should build successfully
npm run dev               # Should run without errors

# Backend  
npm test                  # Should run tests (once written)
npm run build             # Should compile TypeScript
npm run db:push           # Should push schema changes
```

---

## File Size Summary

```
Before Optimization:
  Frontend bundle: Unknown (not optimized)
  
After Optimization:
  React vendor: Separate chunk
  Router: Separate chunk
  Charts: Separate chunk
  Main: ~150KB (estimated)
```

---

## Performance Metrics to Track

After implementation:
1. **Lighthouse Score** - Target 80+
2. **Bundle Size** - Target < 300KB (gzipped)
3. **First Contentful Paint** - Target < 2s
4. **Test Coverage** - Target > 70%
5. **Error Rate** - Target 0% with error boundaries

