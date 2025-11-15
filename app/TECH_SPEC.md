# Earning Tracker App - Technical Specification
## Complete Blueprint for Development

---

## 📋 PROJECT OVERVIEW

### What We're Building
**Name:** EarnTrack
**Type:** Web + Mobile App (Progressive Web App)
**Purpose:** Track earnings across multiple platforms automatically and manually

### Target Users
- Freelancers (Upwork, Fiverr, etc.)
- Gig workers (DoorDash, Uber, TaskRabbit)
- Multi-platform earners (anyone following the daily earning strategy)

### Core Value Proposition
"See all your earnings in one place. Know your real hourly rate. Make data-driven decisions."

---

## 🎯 MVP FEATURES (Version 1.0)

### Phase 1: Manual Entry (Launch in 6 weeks)

**1. Platform Management**
- Add/edit/delete platforms
- Categories: Freelance, Delivery, Services, Other
- Custom platform names
- Set hourly rate expectations

**2. Earning Entry**
- Manual log earnings
- Fields: Date, Platform, Hours, Amount, Notes
- Quick entry mode (just amount)
- Detailed entry mode (all fields)

**3. Dashboard**
- Total earnings (today, week, month, all-time)
- Earnings by platform (pie chart)
- Earnings over time (line graph)
- Average hourly rate
- Best/worst platform

**4. Analytics**
- Hourly rate by platform
- Platform comparison
- Weekly/monthly trends
- Goal tracking

**5. Export**
- CSV export
- Date range selection
- Filter by platform

**6. User Account**
- Sign up / Login
- Profile settings
- Timezone
- Currency

---

## 🏗️ SYSTEM ARCHITECTURE

### Tech Stack

**Frontend:**
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts or Chart.js
- **State Management:** Zustand (lighter than Redux)
- **Forms:** React Hook Form
- **Date handling:** date-fns
- **Icons:** Lucide React
- **PWA:** Vite PWA Plugin

**Backend:**
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Validation:** Zod
- **Authentication:** JWT
- **Password:** bcrypt

**Database:**
- **Primary:** PostgreSQL 15+
- **ORM:** Prisma
- **Migrations:** Prisma Migrate

**Hosting:**
- **Frontend:** Vercel (free tier OK for MVP)
- **Backend:** Railway or Render (free tier)
- **Database:** Railway PostgreSQL or Supabase

**Development:**
- **Monorepo:** Not needed for MVP, separate repos
- **Version Control:** Git + GitHub
- **API Documentation:** OpenAPI/Swagger
- **Testing:** Vitest (frontend), Jest (backend)

---

## 📊 DATABASE SCHEMA

### Tables

**users**
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
email             VARCHAR(255) UNIQUE NOT NULL
password_hash     VARCHAR(255) NOT NULL
name              VARCHAR(255)
timezone          VARCHAR(50) DEFAULT 'UTC'
currency          VARCHAR(3) DEFAULT 'USD'
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

**platforms**
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id           UUID REFERENCES users(id) ON DELETE CASCADE
name              VARCHAR(100) NOT NULL
category          VARCHAR(50) NOT NULL -- freelance, delivery, services, other
color             VARCHAR(7) -- hex color for UI
expected_rate     DECIMAL(10,2) -- expected hourly rate
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

UNIQUE(user_id, name)
INDEX idx_user_platforms ON platforms(user_id, is_active)
```

**earnings**
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id           UUID REFERENCES users(id) ON DELETE CASCADE
platform_id       UUID REFERENCES platforms(id) ON DELETE CASCADE
date              DATE NOT NULL
hours             DECIMAL(5,2) -- hours worked
amount            DECIMAL(10,2) NOT NULL
notes             TEXT
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()

INDEX idx_user_earnings ON earnings(user_id, date DESC)
INDEX idx_platform_earnings ON earnings(platform_id, date DESC)
```

**goals** (for future, but include in schema)
```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id           UUID REFERENCES users(id) ON DELETE CASCADE
type              VARCHAR(50) NOT NULL -- daily, weekly, monthly
target_amount     DECIMAL(10,2) NOT NULL
start_date        DATE NOT NULL
end_date          DATE
is_active         BOOLEAN DEFAULT true
created_at        TIMESTAMP DEFAULT NOW()
```

---

## 🔌 API DESIGN

### Base URL
```
https://api.earntrack.app/v1
```

### Authentication
All protected routes require JWT in header:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### **Auth**

**POST /auth/register**
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response: 201
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

**POST /auth/login**
```json
Request:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response: 200
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

#### **Platforms**

**GET /platforms**
```json
Response: 200
{
  "platforms": [
    {
      "id": "uuid",
      "name": "Upwork",
      "category": "freelance",
      "color": "#14a800",
      "expected_rate": 30.00,
      "is_active": true,
      "stats": {
        "total_earnings": 5420.50,
        "total_hours": 180.5,
        "avg_hourly_rate": 30.02
      }
    }
  ]
}
```

**POST /platforms**
```json
Request:
{
  "name": "Upwork",
  "category": "freelance",
  "color": "#14a800",
  "expected_rate": 30.00
}

Response: 201
{
  "platform": { /* platform object */ }
}
```

**PUT /platforms/:id**
**DELETE /platforms/:id**

#### **Earnings**

**GET /earnings**
```
Query params:
- start_date (ISO date)
- end_date (ISO date)
- platform_id (optional)
- limit (default 100)
- offset (default 0)
```

```json
Response: 200
{
  "earnings": [
    {
      "id": "uuid",
      "platform": {
        "id": "uuid",
        "name": "Upwork",
        "color": "#14a800"
      },
      "date": "2025-11-15",
      "hours": 4.5,
      "amount": 135.00,
      "hourly_rate": 30.00,
      "notes": "Blog post for SaaS client"
    }
  ],
  "total": 156,
  "has_more": true
}
```

**POST /earnings**
```json
Request:
{
  "platform_id": "uuid",
  "date": "2025-11-15",
  "hours": 4.5,
  "amount": 135.00,
  "notes": "Blog post for SaaS client"
}

Response: 201
{
  "earning": { /* earning object */ }
}
```

**PUT /earnings/:id**
**DELETE /earnings/:id**

#### **Analytics**

**GET /analytics/summary**
```
Query params:
- period: today | week | month | year | all
- start_date (optional, overrides period)
- end_date (optional)
```

```json
Response: 200
{
  "period": "month",
  "start_date": "2025-11-01",
  "end_date": "2025-11-30",
  "total_earnings": 6420.50,
  "total_hours": 210.5,
  "avg_hourly_rate": 30.50,
  "by_platform": [
    {
      "platform": {
        "id": "uuid",
        "name": "Upwork",
        "color": "#14a800"
      },
      "earnings": 4200.00,
      "hours": 140.0,
      "hourly_rate": 30.00,
      "percentage": 65.4
    }
  ],
  "daily_breakdown": [
    {
      "date": "2025-11-01",
      "earnings": 240.50,
      "hours": 8.0
    }
  ]
}
```

**GET /analytics/comparison**
```
Compare platforms, time periods, etc.
```

#### **Export**

**GET /export/csv**
```
Query params: same as /earnings

Response: 200 (CSV file)
Content-Type: text/csv
Content-Disposition: attachment; filename="earnings-2025-11.csv"
```

---

## 🎨 UI/UX DESIGN

### Color Scheme
```css
Primary: #3b82f6 (blue)
Secondary: #10b981 (green - for money)
Danger: #ef4444 (red)
Warning: #f59e0b (orange)
Gray scale: Tailwind default
```

### Key Screens

**1. Dashboard (Home)**
```
┌─────────────────────────────────────┐
│  EarnTrack        [+ Add Earning]   │
├─────────────────────────────────────┤
│                                     │
│  📊 This Month                      │
│  ┌──────────┬──────────┬─────────┐ │
│  │ $6,420   │ 210h     │ $30/h   │ │
│  │ Earned   │ Worked   │ Rate    │ │
│  └──────────┴──────────┴─────────┘ │
│                                     │
│  📈 Earnings Trend                  │
│  [Line chart: last 30 days]        │
│                                     │
│  🎯 By Platform                     │
│  [Pie chart or bar chart]          │
│  • Upwork      $4,200  (65%)       │
│  • DoorDash    $1,500  (23%)       │
│  • Fiverr        $720  (12%)       │
│                                     │
│  📋 Recent Entries                  │
│  Nov 15 - Upwork    $135.00  4.5h  │
│  Nov 14 - DoorDash  $180.00  6h    │
│  Nov 14 - Upwork     $90.00  3h    │
│  [View All]                         │
│                                     │
└─────────────────────────────────────┘
```

**2. Add/Edit Earning**
```
┌─────────────────────────────────────┐
│  ← Back        Add Earning          │
├─────────────────────────────────────┤
│                                     │
│  Platform *                         │
│  [Dropdown: Upwork ▼]              │
│                                     │
│  Date *                             │
│  [📅 2025-11-15]                   │
│                                     │
│  Amount * ($)                       │
│  [___135.00__]                     │
│                                     │
│  Hours Worked                       │
│  [___4.5_____]                     │
│  Hourly Rate: $30.00 (auto)        │
│                                     │
│  Notes (optional)                   │
│  [Blog post for SaaS client]       │
│                                     │
│  [Cancel]  [Save Entry]            │
│                                     │
└─────────────────────────────────────┘
```

**3. Platforms Management**
```
┌─────────────────────────────────────┐
│  ← Back        Platforms  [+ Add]   │
├─────────────────────────────────────┤
│                                     │
│  Active (3)                         │
│  ┌─────────────────────────────┐   │
│  │ 🟢 Upwork                   │   │
│  │    $4,200 • 140h • $30/h    │   │
│  │    [Edit] [Archive]         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔴 DoorDash                 │   │
│  │    $1,500 • 60h • $25/h     │   │
│  │    [Edit] [Archive]         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Archived (1)                       │
│  ┌─────────────────────────────┐   │
│  │ ⚫ Fiverr                    │   │
│  │    $720 • 24h • $30/h       │   │
│  │    [Edit] [Activate]        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**4. Analytics**
```
┌─────────────────────────────────────┐
│  ← Back        Analytics            │
│  [This Month ▼]                     │
├─────────────────────────────────────┤
│                                     │
│  Platform Comparison                │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │  [Bar chart comparing all]  │   │
│  │                             │   │
│  │  Upwork    ████████  $30/h  │   │
│  │  DoorDash  ██████    $25/h  │   │
│  │  Fiverr    ████████  $30/h  │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Time Analysis                      │
│  • Best day: Thursday ($420 avg)   │
│  • Worst day: Monday ($180 avg)    │
│  • Peak hours: 2-6 PM              │
│                                     │
│  Insights                           │
│  💡 Your Upwork rate is 20%        │
│     higher than your target        │
│  💡 Consider dropping Fiverr?      │
│     Only $30/h vs target $50/h     │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔐 SECURITY

### Authentication
- JWT tokens (7-day expiry)
- Refresh tokens (30-day expiry)
- HTTP-only cookies for web
- Secure password requirements (min 8 char, uppercase, number)
- bcrypt with salt rounds: 12

### Data Protection
- All API calls over HTTPS only
- Input validation (Zod schemas)
- SQL injection prevention (Prisma ORM)
- XSS prevention (React auto-escapes)
- CSRF tokens for state-changing operations
- Rate limiting (100 requests/15min per IP)

### Privacy
- User data isolated (row-level security)
- No sharing of data between users
- Optional analytics (can be disabled)
- GDPR-compliant data export/deletion

---

## 📱 RESPONSIVE DESIGN

### Breakpoints (Tailwind)
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### Mobile-First Approach
- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly targets (min 44×44px)
- Swipe gestures (delete, archive)

---

## 🚀 PERFORMANCE

### Frontend
- Code splitting (lazy load routes)
- Image optimization (WebP, lazy load)
- Minimize bundle size (tree shaking)
- Service worker (offline support)
- Local caching (IndexedDB for offline)

### Backend
- Database indexes (see schema)
- Connection pooling
- Query optimization
- Caching frequent queries (Redis - Phase 2)
- Pagination (max 100 items per request)

### Metrics Goals
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: >90

---

## 🧪 TESTING STRATEGY

### Frontend
- Unit tests: Vitest (components, utils)
- Integration tests: React Testing Library
- E2E tests: Playwright (critical flows)
- Coverage goal: >80%

### Backend
- Unit tests: Jest (services, utils)
- Integration tests: Supertest (API endpoints)
- Database tests: Test database
- Coverage goal: >85%

### Test Scenarios
1. User registration & login
2. Add/edit/delete earnings
3. Platform management
4. Analytics calculations
5. Export functionality
6. Edge cases (negative amounts, future dates, etc.)

---

## 📦 DEPLOYMENT

### CI/CD Pipeline (GitHub Actions)
```yaml
On push to main:
1. Run tests
2. Build frontend
3. Build backend
4. Deploy frontend to Vercel
5. Deploy backend to Railway
6. Run database migrations
7. Smoke tests
```

### Environments
- **Development:** Local
- **Staging:** staging.earntrack.app
- **Production:** earntrack.app

### Monitoring
- **Uptime:** UptimeRobot (free)
- **Errors:** Sentry (free tier)
- **Analytics:** Plausible or Simple Analytics
- **Logs:** Railway built-in

---

## 💰 MONETIZATION (Phase 2)

### Free Tier
- 3 platforms
- Manual entry only
- Basic analytics
- Export last 30 days

### Pro Tier ($9.99/month)
- Unlimited platforms
- Advanced analytics
- Export unlimited
- Goal tracking
- Email reports
- Priority support

### Future (Phase 3)
- API integrations ($19.99/month)
- Team accounts ($29.99/month)
- White-label ($99/month)

---

## 📅 DEVELOPMENT TIMELINE

### Week 1-2: Setup & Backend
- [ ] Initialize projects
- [ ] Database setup (Prisma schema)
- [ ] Authentication endpoints
- [ ] CRUD endpoints (platforms, earnings)
- [ ] Basic tests

### Week 3-4: Frontend Core
- [ ] Setup React + TypeScript
- [ ] Authentication UI
- [ ] Dashboard
- [ ] Add/edit earning forms
- [ ] Platform management

### Week 5: Analytics & Polish
- [ ] Analytics page
- [ ] Charts integration
- [ ] Export functionality
- [ ] Responsive design
- [ ] PWA setup

### Week 6: Testing & Launch
- [ ] Bug fixes
- [ ] E2E tests
- [ ] Documentation
- [ ] Deploy to production
- [ ] Beta launch!

---

## 🎯 SUCCESS METRICS

### Week 1
- [ ] 10 beta users signed up
- [ ] 100+ earnings entries
- [ ] No critical bugs

### Month 1
- [ ] 100 active users
- [ ] 50% weekly retention
- [ ] <2% error rate

### Month 3
- [ ] 500 active users
- [ ] 10-20% conversion to paid
- [ ] $500-2,000 MRR

### Month 6
- [ ] 2,000 active users
- [ ] 15-25% conversion
- [ ] $3,000-5,000 MRR

---

## 🔮 FUTURE FEATURES (Post-MVP)

### Phase 2 (Month 2-3)
- [ ] API integrations (Upwork, PayPal)
- [ ] Mobile apps (React Native)
- [ ] Goal tracking with progress
- [ ] Recurring earnings (retainers)
- [ ] Multi-currency support
- [ ] Dark mode

### Phase 3 (Month 4-6)
- [ ] Team accounts
- [ ] Invoice generation
- [ ] Expense tracking
- [ ] Tax calculations
- [ ] Email/SMS notifications
- [ ] Calendar integration

### Phase 4 (Month 7-12)
- [ ] AI insights & recommendations
- [ ] Automatic platform detection
- [ ] Bank account integration
- [ ] Forecasting & predictions
- [ ] Client management (CRM lite)
- [ ] Time tracking integration

---

## 📞 SUPPORT PLAN

### Documentation
- Getting started guide
- Video tutorials
- FAQ
- API documentation

### Support Channels
- Email: support@earntrack.app
- Discord community (free users)
- Priority email (paid users)
- Feature requests (GitHub Issues)

### SLA
- Free: Best effort
- Paid: <24 hour response

---

## ✅ NEXT STEPS

1. **Create GitHub repos**
   - earntrack-frontend
   - earntrack-backend

2. **Setup development environment**
   - Install Node.js, PostgreSQL
   - Setup Prisma
   - Initialize React project

3. **Start coding!**
   - Begin with backend (database + auth)
   - Then frontend
   - Iterate quickly

---

**Ready to build!** 🚀

This spec gives us everything needed to start development. Shall we begin writing code?
