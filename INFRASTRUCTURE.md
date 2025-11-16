# EarnTrack - Infrastructure Architecture

Complete infrastructure documentation including architecture diagram, technology stack, database schema, API architecture, caching strategy, and security layers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Deployment Architecture](#deployment-architecture)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Caching Strategy](#caching-strategy)
7. [Security Layers](#security-layers)
8. [Monitoring & Observability](#monitoring--observability)
9. [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EarnTrack Platform                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐
│   CLIENT LAYER              │
├─────────────────────────────┤
│ Web Browser                 │
│ ├─ React 18.2              │
│ ├─ Vite                     │
│ ├─ TailwindCSS              │
│ ├─ Zustand (State)          │
│ └─ Axios (HTTP)             │
│                             │
│ Mobile Browser              │
│ └─ Responsive Design        │
└─────────────────────────────┘
          ▲
          │ HTTPS/TLS
          ▼
┌─────────────────────────────┐
│   CDN & EDGE LAYER          │
├─────────────────────────────┤
│ Vercel Edge Network         │
│ ├─ Static Asset Caching     │
│ ├─ Image Optimization       │
│ ├─ Gzip Compression         │
│ ├─ DDoS Protection          │
│ └─ SSL/TLS Termination      │
└─────────────────────────────┘
          ▲
          │ HTTPS
          ▼
┌──────────────────────────────────┐
│   API GATEWAY & SECURITY         │
├──────────────────────────────────┤
│ Express.js Server                │
│ ├─ CORS Middleware               │
│ ├─ Rate Limiting (express-limit) │
│ ├─ Request Validation (Zod)      │
│ ├─ Authentication (JWT)          │
│ ├─ Request Logging               │
│ └─ Error Handling Middleware     │
│                                  │
│ Helmet Security Headers          │
│ ├─ Strict-Transport-Security     │
│ ├─ Content-Security-Policy       │
│ ├─ X-Frame-Options               │
│ └─ X-Content-Type-Options        │
└──────────────────────────────────┘
          ▲
          │ TCP/IP
          ▼
┌──────────────────────────────────┐
│   APPLICATION LAYER              │
├──────────────────────────────────┤
│ Express.js Controllers           │
│                                  │
│ Route Handlers:                  │
│ ├─ /auth          (JWT, bcrypt)  │
│ ├─ /users         (Profiles)     │
│ ├─ /platforms     (Data source)  │
│ ├─ /earnings      (Core)         │
│ ├─ /products      (Inventory)    │
│ ├─ /sales         (Commerce)     │
│ ├─ /customers     (CRM)          │
│ ├─ /expenses      (Tracking)     │
│ ├─ /invoices      (Billing)      │
│ ├─ /documents     (Files)        │
│ └─ /analytics     (Reports)      │
│                                  │
│ Business Logic:                  │
│ ├─ Authentication & Authorization│
│ ├─ Data validation               │
│ ├─ Business rules enforcement    │
│ ├─ Complex calculations          │
│ └─ Event handling                │
└──────────────────────────────────┘
          ▲
          │ TCP/IP
          ▼
┌────────────────────────────────────────────┐
│   DATA & CACHE LAYER                       │
├────────────────────────────────────────────┤
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ PostgreSQL (Primary Database)        │  │
│ ├──────────────────────────────────────┤  │
│ │ ├─ User Accounts                     │  │
│ │ ├─ Earning Records                   │  │
│ │ ├─ Platform Configurations           │  │
│ │ ├─ Product Inventory                 │  │
│ │ ├─ Sales Records                     │  │
│ │ ├─ Customer Data                     │  │
│ │ ├─ Expense Tracking                  │  │
│ │ ├─ Invoice Management                │  │
│ │ ├─ Uploaded Documents                │  │
│ │ ├─ Indexed queries                   │  │
│ │ └─ Connection pooling (Prisma)       │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ Redis Cache (Optional)               │  │
│ ├──────────────────────────────────────┤  │
│ │ ├─ Session storage                   │  │
│ │ ├─ Profile cache (5 min)             │  │
│ │ ├─ Platform cache (30 min)           │  │
│ │ ├─ Earnings aggregates (30 min)      │  │
│ │ ├─ Analytics cache (1 hour)          │  │
│ │ ├─ Rate limit counters               │  │
│ │ └─ Real-time data updates            │  │
│ └──────────────────────────────────────┘  │
│                                            │
│ ┌──────────────────────────────────────┐  │
│ │ File Storage                         │  │
│ ├──────────────────────────────────────┤  │
│ │ ├─ Document uploads                  │  │
│ │ ├─ Receipt images                    │  │
│ │ ├─ Invoice PDFs                      │  │
│ │ └─ Stored in PostgreSQL BYTEA        │  │
│ └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
          ▲
          │ Encrypted Connection
          ▼
┌──────────────────────────────────────┐
│   MONITORING & LOGGING               │
├──────────────────────────────────────┤
│ ├─ Prometheus Metrics                │
│ ├─ Grafana Dashboards                │
│ ├─ Winston Logger (JSON)              │
│ ├─ Railway Logs                       │
│ ├─ Vercel Analytics                   │
│ ├─ Error tracking                     │
│ └─ Performance monitoring             │
└──────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 18.2.0 | UI library |
| **Build Tool** | Vite | 5.0.7 | Module bundler |
| **Language** | TypeScript | 5.3.3 | Type safety |
| **Styling** | TailwindCSS | 3.3.6 | Utility CSS |
| **Icons** | Lucide React | 0.298.0 | Icon library |
| **State** | Zustand | 4.4.7 | State management |
| **Routing** | React Router | 6.20.1 | Client routing |
| **HTTP** | Axios | 1.6.2 | HTTP client |
| **Charts** | Recharts | 2.10.3 | Data visualization |
| **Forms** | React Hook Form | 7.49.2 | Form handling |
| **PDF** | jsPDF | 2.5.1 | PDF generation |
| **Testing** | Vitest | 4.0.9 | Unit testing |
| **E2E Testing** | Playwright | 1.56.1 | Browser testing |
| **Linting** | ESLint | 8.55.0 | Code quality |

### Backend Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ LTS | Server runtime |
| **Framework** | Express.js | 4.18.2 | HTTP server |
| **Language** | TypeScript | 5.3.3 | Type safety |
| **ORM** | Prisma | 5.7.0 | Database ORM |
| **Database** | PostgreSQL | 14+ | Primary database |
| **Cache** | Redis | 7+ | Session/cache store |
| **Authentication** | JWT | jsonwebtoken 9.0.2 | Token auth |
| **Password** | bcrypt | 5.1.1 | Password hashing |
| **Validation** | Zod | 3.22.4 | Schema validation |
| **Security** | Helmet | 8.1.0 | HTTP headers |
| **CORS** | cors | 2.8.5 | Cross-origin |
| **Rate Limit** | express-rate-limit | 7.1.5 | Request limiting |
| **File Upload** | Multer | 2.0.2 | File handling |
| **Image** | Sharp | 0.34.5 | Image processing |
| **Email** | Nodemailer | 7.0.10 | Email sending |
| **Scheduling** | node-cron | 4.2.1 | Scheduled jobs |
| **Logging** | Winston | 3.11.0 | Structured logging |
| **Metrics** | prom-client | 15.1.3 | Prometheus metrics |
| **Testing** | Jest | 29.7.0 | Unit testing |

### Infrastructure Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Hosting** | Railway | Backend + Database |
| **CDN/Hosting** | Vercel | Frontend delivery |
| **Database** | PostgreSQL | Primary data store |
| **Cache** | Redis | Session/cache layer |
| **Monitoring** | Prometheus | Metrics collection |
| **Visualization** | Grafana | Dashboard display |
| **Version Control** | Git/GitHub | Code repository |
| **CI/CD** | GitHub Actions | Automation (optional) |

---

## Deployment Architecture

### Development Environment

```
Local Machine
├─ Node.js 18+
├─ npm packages
├─ Local PostgreSQL (optional)
├─ Redis (optional)
└─ Environment variables (.env.local)

Local Workflow:
1. npm install
2. npm run dev (both frontend & backend)
3. Open http://localhost:5173 (frontend)
4. Open http://localhost:3001 (backend)
5. npm run test
```

### Staging Environment (Optional)

```
Staging Railway Project
├─ PostgreSQL (separate instance)
├─ Redis (optional)
├─ Node.js backend (staging branch)
├─ Environment: staging
└─ Isolated from production

Staging Vercel Project
├─ Frontend (staging branch)
├─ Preview deployments enabled
└─ Test environment variables
```

### Production Environment

```
Production Railway Project
├─ PostgreSQL (production instance)
│  ├─ Daily automated backups
│  ├─ 7-day retention
│  └─ Connection pooling
│
├─ Redis (production)
│  ├─ Persistence enabled
│  ├─ 6GB memory
│  └─ Cluster configuration
│
├─ Node.js Backend
│  ├─ Auto-scaling enabled
│  ├─ 2GB RAM, 1 CPU
│  ├─ Health checks configured
│  ├─ Log aggregation
│  └─ Metrics collection
│
├─ Environment: production
├─ Domain: earntrack-api.railway.app
└─ SSL/TLS: Auto-managed

Production Vercel Project
├─ Frontend (main branch)
├─ Auto-deploy from main
├─ CDN distribution
├─ Edge caching
├─ SSL/TLS: Auto-managed
├─ Domain: earntrack.vercel.app
└─ Analytics tracking enabled
```

### Network Architecture

```
Internet (HTTPS/TLS)
       ↓
Vercel Edge Nodes (Global CDN)
       ↓
Application Router (Auto-routing)
       ↓
Railway Network (Encrypted)
       ↓
Backend Service (Node.js)
       ↓ (Prisma connection pool)
PostgreSQL Database
       ↓ (Optional)
Redis Cache

All connections:
- Encrypted in transit (TLS 1.3+)
- Isolated network (private)
- Authenticated
- Rate limited
- Logged & monitored
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────────┐
│      USERS           │
├──────────────────────┤
│ id (UUID) PK         │
│ email (unique)       │
│ passwordHash         │
│ name                 │
│ timezone             │
│ currency             │
│ createdAt            │
│ updatedAt            │
└──────────┬───────────┘
           │
      ┌────┴─────┬─────────────┬──────────────┬──────────┬────────────┬──────────┐
      │           │             │              │          │            │          │
      ▼           ▼             ▼              ▼          ▼            ▼          ▼
┌──────────┐  ┌────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌──────────┐ ┌──────────┐
│PLATFORMS │  │EARNINGS│  │PRODUCTS  │  │GOALS   │  │CUSTOMERS │  │EXPENSES  │ │INVOICES  │
├──────────┤  ├────────┤  ├──────────┤  ├────────┤  ├──────────┤  ├──────────┤ ├──────────┤
│id (PK)   │  │id (PK) │  │id (PK)   │  │id (PK) │  │id (PK)   │  │id (PK)   │ │id (PK)   │
│userId    │  │userId  │  │userId    │  │userId  │  │userId    │  │userId    │ │userId    │
│name      │  │date    │  │name      │  │type    │  │name      │  │category  │ │invoiceNo │
│category  │  │amount  │  │price     │  │target  │  │email     │  │amount    │ │amount    │
│color     │  │hours   │  │quantity  │  │period  │  │phone     │  │date      │ │dueDate   │
│expected  │  │notes   │  │category  │  │active  │  │address   │  │status    │ │paid      │
│isActive  │  │created │  │sku       │  │created │  │created   │  │notes     │ │created   │
└────┬─────┘  └────┬───┘  └────┬─────┘  └────────┘  └──────────┘  └──────────┘ └──────────┘
     │            │            │
     │            └────────────────────────────────────────────┐
     │                         │                               │
     │                    ┌────▼────────┐                      │
     │                    │ SALES        │                      │
     │                    ├─────────────┤                      │
     │                    │ id (PK)      │                      │
     │                    │ userId       │                      │
     │                    │ productId FK ├──────────────────────┘
     │                    │ quantity     │
     │                    │ unitPrice    │
     │                    │ totalAmount  │
     │                    │ saleDate     │
     │                    │ customer     │
     │                    │ status       │
     │                    │ notes        │
     │                    │ created      │
     │                    └──────────────┘
     │
     └───────────────────┐
                         │
                    ┌────▼──────────────┐
                    │ INVENTORYLOGS     │
                    ├───────────────────┤
                    │ id (PK)           │
                    │ userId            │
                    │ productId FK      │
                    │ type              │
                    │ quantity          │
                    │ reason            │
                    │ beforeQuantity    │
                    │ afterQuantity     │
                    │ created           │
                    └───────────────────┘

Additional:
├─ DOCUMENTS (File storage)
│  ├─ id (PK)
│  ├─ userId FK
│  ├─ fileName
│  ├─ fileType
│  ├─ fileSize
│  ├─ data (BYTEA)
│  └─ createdAt
│
└─ SESSIONS (Optional, Redis)
   ├─ userId
   ├─ token
   ├─ expiresAt
   └─ createdAt
```

### Table Details

**USERS Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  timezone VARCHAR(50) DEFAULT 'UTC',
  currency VARCHAR(3) DEFAULT 'USD',
  email_notifications_enabled BOOLEAN DEFAULT true,
  weekly_report_enabled BOOLEAN DEFAULT true,
  invoice_notification_enabled BOOLEAN DEFAULT true,
  expense_alert_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  INDEX idx_users_email (email),
  INDEX idx_users_created (created_at DESC)
);
```

**EARNINGS Table** (Most frequently queried)
```sql
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours DECIMAL(5,2),
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  -- Indexes optimized for common queries
  INDEX idx_earnings_user_date (user_id, date DESC),
  INDEX idx_earnings_platform_date (platform_id, date DESC),
  INDEX idx_earnings_composite (user_id, platform_id, date DESC)
);
```

**PRODUCTS Table**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  sku VARCHAR(100),
  quantity DECIMAL(10,2) DEFAULT 0,
  reorder_point DECIMAL(10,2) DEFAULT 10,
  supplier_name VARCHAR(255),
  supplier_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE (user_id, name),
  INDEX idx_products_user_active (user_id, is_active),
  INDEX idx_products_low_stock (user_id, quantity)
);
```

### Indexes & Performance

**Primary Indexes:**
- User authentication: `idx_users_email`
- Earnings queries: `idx_earnings_user_date` (most critical)
- Platform earnings: `idx_earnings_platform_date`
- Product inventory: `idx_products_user_active`

**Index Strategy:**
```
Covered Indexes (includes all query columns):
- earnings: (user_id, date, amount, hours)
- platforms: (user_id, is_active, name)
- products: (user_id, is_active, quantity)

Partial Indexes (for active records):
- WHERE is_active = true

Optimization:
- All foreign key columns indexed
- Sort keys DESC for recent-first queries
- Composite indexes for multi-column queries
- Regular ANALYZE for statistics
- REINDEX quarterly for fragmentation
```

### Data Retention Policies

```
User Data:
  - Retention: Permanent until deletion request
  - Archival: None (active data only)
  - Backup: Daily for 7 days

Earnings Records:
  - Retention: 7+ years (tax compliance)
  - Archive: Move to archive table after 2 years
  - Backup: Daily for 7 days

Product Data:
  - Retention: Until manually deleted
  - Archive: Inactive products after 1 year
  - Backup: Daily for 7 days

Logs:
  - Application logs: 7 days
  - Database logs: 30 days
  - Backup logs: 90 days
```

---

## API Architecture

### API Versioning

```
/api/v1/     → Current version
/api/v2/     → Future version (if needed)

Structure:
GET    /api/v1/health                      Status check
GET    /api/v1/                            API info

AUTH ENDPOINTS:
POST   /api/v1/auth/register               Create account
POST   /api/v1/auth/login                  Login
POST   /api/v1/auth/refresh                Refresh token
POST   /api/v1/auth/logout                 Logout
POST   /api/v1/auth/forgot-password        Password reset
POST   /api/v1/auth/reset-password         Complete reset

USER ENDPOINTS:
GET    /api/v1/user/profile                Get profile
PUT    /api/v1/user/profile                Update profile
DELETE /api/v1/user/account                Delete account
PUT    /api/v1/user/preferences            Update preferences
GET    /api/v1/user/settings               Get settings
PUT    /api/v1/user/settings               Update settings

PLATFORM ENDPOINTS:
GET    /api/v1/platforms                   List platforms
POST   /api/v1/platforms                   Create platform
PUT    /api/v1/platforms/:id               Update platform
DELETE /api/v1/platforms/:id               Delete platform
GET    /api/v1/platforms/:id               Get platform details

EARNINGS ENDPOINTS:
GET    /api/v1/earnings                    List earnings
POST   /api/v1/earnings                    Create earning
PUT    /api/v1/earnings/:id                Update earning
DELETE /api/v1/earnings/:id                Delete earning
GET    /api/v1/earnings/summary             Summary stats
GET    /api/v1/earnings/monthly             Monthly breakdown
GET    /api/v1/earnings/platform/:id        Platform earnings

PRODUCT ENDPOINTS:
GET    /api/v1/products                    List products
POST   /api/v1/products                    Create product
PUT    /api/v1/products/:id                Update product
DELETE /api/v1/products/:id                Delete product
GET    /api/v1/products/inventory          Inventory status

SALES ENDPOINTS:
GET    /api/v1/sales                       List sales
POST   /api/v1/sales                       Create sale
PUT    /api/v1/sales/:id                   Update sale
DELETE /api/v1/sales/:id                   Delete sale
GET    /api/v1/sales/analytics             Sales analytics

CUSTOMER ENDPOINTS:
GET    /api/v1/customers                   List customers
POST   /api/v1/customers                   Create customer
PUT    /api/v1/customers/:id               Update customer
DELETE /api/v1/customers/:id               Delete customer

EXPENSE ENDPOINTS:
GET    /api/v1/expenses                    List expenses
POST   /api/v1/expenses                    Create expense
PUT    /api/v1/expenses/:id                Update expense
DELETE /api/v1/expenses/:id                Delete expense

INVOICE ENDPOINTS:
GET    /api/v1/invoices                    List invoices
POST   /api/v1/invoices                    Create invoice
PUT    /api/v1/invoices/:id                Update invoice
GET    /api/v1/invoices/:id/pdf            Download PDF

DOCUMENT ENDPOINTS:
POST   /api/v1/documents/upload            Upload file
GET    /api/v1/documents/:id               Get file
DELETE /api/v1/documents/:id               Delete file
GET    /api/v1/documents                   List files

ANALYTICS ENDPOINTS:
GET    /api/v1/analytics/dashboard         Dashboard data
GET    /api/v1/analytics/reports           Reports
GET    /api/v1/analytics/trends            Trend analysis
GET    /api/v1/analytics/export            Data export
```

### Request/Response Format

**Standard Request:**
```json
{
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer [JWT_TOKEN]",
    "User-Agent": "EarnTrack/1.0"
  },
  "body": {
    "field1": "value1",
    "field2": 123
  }
}
```

**Standard Success Response:**
```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid",
    "field1": "value1",
    "field2": 123,
    "created_at": "2025-01-10T10:30:00Z"
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "requestId": "req-abc-123"
}
```

**Standard Error Response:**
```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "field1": "Field is required",
      "field2": "Must be a number"
    }
  },
  "timestamp": "2025-01-10T10:30:00Z",
  "requestId": "req-abc-123"
}
```

**Status Codes:**
```
2xx Success:
  200 OK              Successful request
  201 Created         Resource created
  204 No Content      Successful, no response body

4xx Client Error:
  400 Bad Request     Invalid input/validation error
  401 Unauthorized    Missing/invalid authentication
  403 Forbidden       Insufficient permissions
  404 Not Found       Resource not found
  409 Conflict        Resource already exists
  429 Too Many        Rate limit exceeded
  422 Unprocessable   Semantic error

5xx Server Error:
  500 Internal Error  Unexpected server error
  503 Unavailable     Service temporarily unavailable
```

### Rate Limiting

```
Public Endpoints:
  - 10 requests per minute per IP
  - Reset: Every 1 minute

Authenticated Endpoints:
  - 100 requests per 15 minutes per user
  - Reset: Every 15 minutes

Burst Limits:
  - Max 50 requests per second
  - Response: 429 Too Many Requests

Rate Limit Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 45
  X-RateLimit-Reset: 1673350800
```

---

## Caching Strategy

### Cache Layers

```
Layer 1: Browser Cache (Client)
  - Static assets: 30 days
  - API responses: 5 minutes
  - Mechanism: ETag, Cache-Control headers

Layer 2: CDN Cache (Vercel)
  - Static files: 1 year
  - Images: 30 days
  - HTML: 1 hour (must-revalidate)
  - Mechanism: Edge caching

Layer 3: Redis Cache (Optional)
  - Profile data: 5 minutes
  - Platform list: 30 minutes
  - Earnings aggregates: 30 minutes
  - Analytics: 1 hour
  - Mechanism: Key-value store with TTL

Layer 4: Database Query Cache (Prisma)
  - Prepared statements
  - Connection pooling
  - Mechanism: Built-in pooling
```

### Caching Strategy by Data Type

**User Profile** (Cache: 5 min)
```javascript
// Get from cache first
const profile = await redis.get(`user:${userId}:profile`);

if (!profile) {
  // Cache miss - fetch from DB
  const data = await db.user.findUnique({ where: { id: userId } });

  // Store in cache
  await redis.setex(
    `user:${userId}:profile`,
    300,  // 5 minutes
    JSON.stringify(data)
  );

  return data;
}

return JSON.parse(profile);
```

**Platform List** (Cache: 30 min)
```javascript
const key = `user:${userId}:platforms`;
const cached = await redis.get(key);

if (cached) {
  return JSON.parse(cached);
}

const platforms = await db.platform.findMany({
  where: { userId }
});

await redis.setex(key, 1800, JSON.stringify(platforms));
return platforms;
```

**Earnings Aggregates** (Cache: 30 min)
```javascript
const key = `user:${userId}:earnings:${period}`;

const earnings = await db.earning.aggregate({
  where: { userId },
  _sum: { amount: true },
  _count: true
});

await redis.setex(key, 1800, JSON.stringify(earnings));
return earnings;
```

### Cache Invalidation

**Manual Invalidation** (User action)
```javascript
// When user updates profile
await redis.del(`user:${userId}:profile`);

// When user updates platform
await redis.del(`user:${userId}:platforms`);
await redis.del(`user:${userId}:earnings:*`);  // Invalidate all

// When user creates earning
await redis.del(`user:${userId}:earnings:daily`);
await redis.del(`user:${userId}:earnings:monthly`);
```

**Time-based Invalidation** (TTL)
```javascript
// Redis automatically removes keys after TTL expires
// No manual action needed
// Example: 5-minute TTL for profile

// Monitor cache hit rate
redis.info('stats');  // Shows hits vs misses
```

**Event-based Invalidation** (Updates from other users)
```javascript
// When database changes
// Emit event to update caches
// Example: Admin updates system config
eventEmitter.emit('cache:clear:config');

redis.on('cache:clear:config', async () => {
  await redis.del('config:*');
});
```

### Cache Metrics

```
Monitor these metrics:

Hit Rate:
  Target: > 80%
  Formula: hits / (hits + misses)

Eviction Rate:
  Target: < 5%
  Indicates cache size is adequate

Miss Rate:
  Target: < 20%
  Higher = potentially larger TTL needed

Memory Usage:
  Target: < 2GB
  Monitor for optimal size

Performance Impact:
  With cache: avg response time 50ms
  Without cache: avg response time 250ms
  Target improvement: 4-5x faster
```

---

## Security Layers

### Authentication & Authorization

```
Layer 1: API Key / JWT Token
  - JWT-based authentication
  - Token expires in 7 days
  - Stored in localStorage (frontend)
  - Sent in Authorization header

Layer 2: Password Security
  - Algorithm: bcrypt with 10 salt rounds
  - Min length: 8 characters
  - Requirement: Upper, lower, number, special char
  - Hash stored: Password never logged

Layer 3: Session Management
  - Stateless JWT (no server-side sessions)
  - Refresh token rotation (optional)
  - Device tracking (optional)
  - Session timeout: 7 days

Layer 4: Role-Based Access Control
  - User: Can access own data only
  - Admin: Can access all data (if applicable)
  - Checks: Every endpoint validates permissions

Example Token Structure:
{
  "iss": "earntrack",
  "sub": "user-123",
  "aud": "earntrack-app",
  "exp": 1673350800,
  "iat": 1673265400,
  "email": "user@example.com",
  "role": "user"
}
```

### Data Encryption

```
At Rest:
  - Database credentials: Encrypted in .env
  - User passwords: Hashed with bcrypt
  - JWT secrets: Secure string in environment
  - Files: Optional encryption (future)

In Transit:
  - HTTPS/TLS 1.3+ required everywhere
  - Certificate: Auto-managed by platforms
  - Cipher suites: Modern (no weak ciphers)
  - Compression: Enabled (gzip)

Key Management:
  - JWT_SECRET: 32+ character random string
  - DATABASE_URL: Provided by Railway (encrypted)
  - Rotation: Quarterly for secrets
  - Access: Only necessary services/developers
```

### Input Validation & Sanitization

```
Validation Layer:
  - Schema validation: Zod schemas
  - Type checking: TypeScript
  - Range validation: Min/max values
  - Format validation: Email, phone, etc.

Sanitization:
  - XSS protection: DOMPurify (frontend)
  - HTML escaping: Express.js (backend)
  - SQL injection: Parameterized queries (Prisma)
  - NoSQL injection: Query builder (Prisma)

Example Validation Schema:
import { z } from 'zod';

const EarningSchema = z.object({
  amount: z.number().positive().max(9999999),
  date: z.date().max(new Date()),
  platformId: z.string().uuid(),
  hours: z.number().min(0).max(24).optional(),
  notes: z.string().max(1000).optional()
});

// Validate before processing
const parsed = EarningSchema.parse(req.body);
```

### HTTP Security Headers

```
Helmet.js Configuration:

Strict-Transport-Security:
  - max-age=31536000
  - includeSubDomains
  - preload
  - Forces HTTPS everywhere

Content-Security-Policy:
  - default-src 'self'
  - script-src 'self' 'unsafe-inline'
  - style-src 'self' 'unsafe-inline'
  - img-src 'self' data: https:
  - font-src 'self'

X-Frame-Options: DENY
  - Prevents clickjacking

X-Content-Type-Options: nosniff
  - Prevents MIME sniffing

X-XSS-Protection: 1; mode=block
  - XSS filter enabled

Referrer-Policy: strict-origin-when-cross-origin
  - Controls referrer information
```

### Rate Limiting & DDoS Protection

```
Application Level:
  - express-rate-limit middleware
  - Per-user limits
  - Per-IP limits
  - Endpoint-specific limits

Example Limits:
  - Public endpoints: 10 req/min per IP
  - Auth endpoints: 5 attempts/min per IP
  - User endpoints: 100 req/15min per user
  - API endpoints: 1000 req/hour per user

Infrastructure Level:
  - Vercel: Built-in DDoS protection
  - Railway: Network-level protection
  - CloudFlare (optional): Advanced DDoS

Bypass Lists:
  - Internal services
  - Healthcheck endpoints
  - Status endpoints
  - Admin IPs (optional)
```

### Secrets Management

```
Development:
  - .env.local file (not committed)
  - Example .env provided
  - Secrets documented

Production:
  - Railway environment variables
  - Encrypted at rest
  - Logged access
  - Rotated quarterly

Secrets Checklist:
  - [ ] JWT_SECRET (32+ chars)
  - [ ] DATABASE_URL (from Railway)
  - [ ] Database password (never changed manually)
  - [ ] API keys (if applicable)
  - [ ] Encryption keys (if applicable)
  - [ ] Email credentials (if sending)
```

### Audit & Compliance

```
Logging & Monitoring:
  - All authentication attempts logged
  - Failed login tracking
  - API access logs (sanitized)
  - Data modification audit trail
  - Admin actions tracked

GDPR Compliance:
  - User data portability
  - Right to be forgotten
  - Consent management
  - Privacy policy
  - Data processing agreements

Security Standards:
  - OWASP Top 10 addressed
  - CWE/SANS Top 25 reviewed
  - NIST Cybersecurity Framework
  - ISO 27001 considerations
```

---

## Monitoring & Observability

### Metrics Collection

**Application Metrics:**
```
HTTP Requests:
  - Total requests
  - Requests by status code
  - Requests by endpoint
  - Request duration (p50, p95, p99)

Application:
  - Active connections
  - Memory usage
  - CPU usage
  - Garbage collection stats

Database:
  - Active queries
  - Connection pool usage
  - Query duration
  - Errors

Cache (Redis):
  - Hit rate
  - Miss rate
  - Evictions
  - Memory usage
```

**Prometheus Metrics:**
```
# Request count
http_requests_total{method="GET", status="200", endpoint="/api/v1/earnings"}

# Request duration
http_request_duration_seconds{quantile="0.95"} 0.234

# Active connections
pg_stat_activity_count 42

# Cache operations
redis_commands_processed_total{command="get"} 10234

# System metrics
process_resident_memory_bytes 104857600
process_cpu_seconds_total 1234.56
```

### Logging Strategy

**Log Levels:**
```
ERROR: Application errors, failures
WARN:  Warnings, unexpected conditions
INFO:  Info messages, important events
DEBUG: Debug information, verbose logging

Production: INFO level
Development: DEBUG level
Testing: WARN level
```

**Log Format (JSON):**
```json
{
  "timestamp": "2025-01-10T10:30:00.123Z",
  "level": "info",
  "service": "earntrack-backend",
  "requestId": "req-abc-xyz",
  "userId": "user-123",
  "endpoint": "/api/v1/earnings",
  "method": "GET",
  "statusCode": 200,
  "duration": 45,
  "message": "Earnings retrieved successfully",
  "context": {
    "count": 150,
    "from": "2025-01-01",
    "to": "2025-01-10"
  }
}
```

### Dashboards

**Grafana Dashboard Panels:**

1. **Service Health**
   - Uptime %
   - Request rate (req/s)
   - Error rate (%)
   - Response times (p50, p95, p99)

2. **Resource Utilization**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network bandwidth

3. **Database Performance**
   - Query count
   - Query latency
   - Connection pool usage
   - Cache hit rate

4. **Business Metrics**
   - Active users
   - Total earnings tracked
   - API calls/day
   - Features used

### Alerting

**Critical Alerts:**
```
CPU > 80%: Immediate notification
Memory > 85%: Immediate notification
Error rate > 1%: Immediate notification
API unavailable: Immediate notification
Database connection failed: Immediate notification
Disk > 90%: Warning
Low cache hit rate: Info
```

---

## Disaster Recovery

### Backup Strategy

```
Frequency:
  - Database: Daily at 00:00 UTC
  - Retention: 7 days (automatic)
  - Manual: On-demand

Backup Contents:
  - All user data
  - All application data
  - Not included: Logs, temp files, cache

Testing:
  - Monthly restore test
  - Verify data integrity
  - Test recovery time

Storage:
  - Railway-managed
  - Encrypted
  - Geographically distributed
```

### Recovery Procedures

**Database Restore** (10-30 min):
```bash
# 1. Stop backend service
# 2. Restore from backup
# 3. Verify data integrity
# 4. Restart backend
# 5. Run health checks
```

**Code Rollback** (2-5 min):
```bash
# Frontend: Revert to previous Vercel deployment
# Backend: Redeploy previous version
# Verify health endpoints
```

**Complete Disaster** (2-4 hours):
```
1. Create new Railway project
2. Provision new PostgreSQL
3. Restore from backup
4. Deploy code
5. Update DNS/domains
6. Verify services
7. Notify users
```

### Runbook References

- Production Runbook: PRODUCTION_RUNBOOK.md
- Deployment Guide: DEPLOYMENT_GUIDE.md
- Troubleshooting: TROUBLESHOOTING_GUIDE.md

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Production Ready
