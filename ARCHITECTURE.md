# EarnTrack - System Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Design](#database-design)
5. [API Flow](#api-flow)
6. [WebSocket Architecture](#websocket-architecture)
7. [Caching Strategy](#caching-strategy)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Web Browser                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │         React 18 Application (Vite)               │ │  │
│  │  │                                                    │ │  │
│  │  │  ┌──────────────┐  ┌──────────────────────────┐  │ │  │
│  │  │  │    Pages     │  │     Components           │  │ │  │
│  │  │  │              │  │  ┌──────────────────────┤  │ │  │
│  │  │  │ - Dashboard  │  │  │ - Dashboard Widgets  │  │ │  │
│  │  │  │ - Earnings   │  │  │ - Forms              │  │ │  │
│  │  │  │ - Analytics  │  │  │ - Charts             │  │ │  │
│  │  │  │ - Settings   │  │  │ - Tables             │  │ │  │
│  │  │  │ - Reports    │  │  │ - Navigation         │  │ │  │
│  │  │  └──────────────┘  └──────────────────────────┘  │ │  │
│  │  │                                                    │ │  │
│  │  │  ┌──────────────────────────────────────────┐    │ │  │
│  │  │  │    State Management (Zustand)            │    │ │  │
│  │  │  │  - Auth Store                           │    │ │  │
│  │  │  │  - Notification Store                   │    │ │  │
│  │  │  │  - Theme Store                          │    │ │  │
│  │  │  │  - Currency Store                       │    │ │  │
│  │  │  │  - Widget Store                         │    │ │  │
│  │  │  └──────────────────────────────────────────┘    │ │  │
│  │  │                                                    │ │  │
│  │  │  ┌──────────────────────────────────────────┐    │ │  │
│  │  │  │         Custom Hooks                     │    │ │  │
│  │  │  │  - useFormValidation                    │    │ │  │
│  │  │  │  - useCurrency                          │    │ │  │
│  │  │  │  - usePerformanceMonitoring             │    │ │  │
│  │  │  │  - useWebSocket                         │    │ │  │
│  │  │  └──────────────────────────────────────────┘    │ │  │
│  │  │                                                    │ │  │
│  │  │  ┌──────────────────────────────────────────┐    │ │  │
│  │  │  │       Utilities & Services              │    │ │  │
│  │  │  │  - API Client (Axios)                  │    │ │  │
│  │  │  │  - Form Validation                     │    │ │  │
│  │  │  │  - File Upload                         │    │ │  │
│  │  │  │  - Invoice Generation                  │    │ │  │
│  │  │  │  - CSV Export                          │    │ │  │
│  │  │  │  - Tax Calculation                     │    │ │  │
│  │  │  └──────────────────────────────────────────┘    │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                │                     │
      REST API      WebSocket            File Upload
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│                                                                   │
│  HTTPS / TLS Encryption                                         │
│  CORS Policy Validation                                         │
│  Request Logging                                                │
└─────────────────────────────────────────────────────────────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVER                            │
│                  (Node.js + Express.js)                          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Middleware Stack                        │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │ 1. Request Parsing (JSON, FormData)              │   │ │
│  │  │ 2. Security Headers (Helmet)                     │   │ │
│  │  │ 3. Rate Limiting (express-rate-limit)            │   │ │
│  │  │ 4. CORS Validation                               │   │ │
│  │  │ 5. Authentication (JWT)                          │   │ │
│  │  │ 6. Request Validation (Zod)                      │   │ │
│  │  │ 7. Error Handling                                │   │ │
│  │  │ 8. Logging (Winston)                             │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │              Routes (16 modules)                  │   │ │
│  │  │  ┌──────────────────────────────────────────────┐ │   │ │
│  │  │  │ /auth      - Authentication                │ │   │ │
│  │  │  │ /users     - User Management               │ │   │ │
│  │  │  │ /platforms - Platform Management           │ │   │ │
│  │  │  │ /earnings  - Earnings Tracking             │ │   │ │
│  │  │  │ /goals     - Goal Management               │ │   │ │
│  │  │  │ /analytics - Analytics Data                │ │   │ │
│  │  │  │ /reports   - Report Generation             │ │   │ │
│  │  │  │ /invoices  - Invoice Management            │ │   │ │
│  │  │  │ /expenses  - Expense Tracking              │ │   │ │
│  │  │  │ /inventory - Inventory Management          │ │   │ │
│  │  │  │ /products  - Product Management            │ │   │ │
│  │  │  │ /sales     - Sales Tracking                │ │   │ │
│  │  │  │ /customers - Customer Management           │ │   │ │
│  │  │  │ /jobs      - Scheduled Jobs                │ │   │ │
│  │  │  │ /upload    - File Upload                   │ │   │ │
│  │  │  │ /metrics   - Metrics Collection            │ │   │ │
│  │  │  └──────────────────────────────────────────────┘ │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │          Controllers (15 modules)                 │   │ │
│  │  │  - Request Handling                              │   │ │
│  │  │  - Business Logic Delegation                     │   │ │
│  │  │  - Response Formatting                           │   │ │
│  │  │  - Error Response Generation                     │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │          Services Layer                           │   │ │
│  │  │  - Business Logic Implementation                 │   │ │
│  │  │  - Data Transformation                           │   │ │
│  │  │  - Integration Logic                             │   │ │
│  │  │  - Calculations                                  │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │          Utilities & Helpers                      │   │ │
│  │  │  - Password Hashing (bcrypt)                     │   │ │
│  │  │  - JWT Token Management                          │   │ │
│  │  │  - Email Sending (Nodemailer)                    │   │ │
│  │  │  - Input Sanitization                            │   │ │
│  │  │  - Query Optimization                            │   │ │
│  │  │  - WebSocket Utilities                           │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │       WebSocket Event Handlers                    │   │ │
│  │  │  - Real-time Notifications                       │   │ │
│  │  │  - Live Updates                                  │   │ │
│  │  │  - Activity Feeds                                │   │ │
│  │  │  - User Presence                                 │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │       Scheduled Jobs (Cron)                       │   │ │
│  │  │  - Notification Scheduling                       │   │ │
│  │  │  - Report Generation                             │   │ │
│  │  │  - Data Cleanup                                  │   │ │
│  │  │  - Performance Optimization                      │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                 │                    │
       SQL            Redis Cache         File Storage
         │                 │                    │
         ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                            │
│                                                                   │
│  ┌────────────────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │    PostgreSQL ORM      │  │  Redis Cache │  │   S3/CDN   │  │
│  │      (Prisma)          │  │   (ioredis)  │  │  Storage   │  │
│  │                        │  │              │  │            │  │
│  │ - Schema Definition    │  │ - Session    │  │ - Uploads  │  │
│  │ - CRUD Operations      │  │ - User Data  │  │ - Images   │  │
│  │ - Migrations           │  │ - Analytics  │  │ - Files    │  │
│  │ - Query Building       │  │ - Cache Keys │  │ - Reports  │  │
│  │ - Type Safety          │  │              │  │            │  │
│  └────────────────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                │                     │
         ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PERSISTENT STORAGE                           │
│                                                                   │
│  ┌────────────────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │    PostgreSQL DB       │  │  Redis DB    │  │   S3 CDN   │  │
│  │    (Railway)           │  │  (Railway)   │  │  (Vercel)  │  │
│  │                        │  │              │  │            │  │
│  │ - User Data            │  │ - Cache      │  │ - Assets   │  │
│  │ - Earnings             │  │ - Sessions   │  │ - Uploads  │  │
│  │ - Transactions         │  │ - Real-time  │  │ - Media    │  │
│  │ - Historical Data      │  │              │  │            │  │
│  └────────────────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Tree

```
App.tsx
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   │   ├── NavLink (Desktop)
│   │   │   └── MobileMenu
│   │   ├── UserMenu
│   │   │   ├── Avatar
│   │   │   └── Dropdown
│   │   └── ThemeToggle
│   │
│   ├── Sidebar
│   │   ├── SidebarNav
│   │   │   └── NavItem (multiple)
│   │   │       └── NavIcon + NavLabel
│   │   └── SidebarFooter
│   │
│   ├── Main Content Area
│   │   ├── Router
│   │   │   ├── Route: Login
│   │   │   ├── Route: Register
│   │   │   ├── Route: Dashboard
│   │   │   │   ├── EarningsCard
│   │   │   │   ├── GoalsCard
│   │   │   │   ├── ActivityFeed
│   │   │   │   ├── EarningsHeatmap
│   │   │   │   └── QuickStats
│   │   │   │
│   │   │   ├── Route: Earnings
│   │   │   │   ├── EarningsTable
│   │   │   │   ├── FilterPanel
│   │   │   │   ├── DateRangePicker
│   │   │   │   └── BulkActions
│   │   │   │
│   │   │   ├── Route: Analytics
│   │   │   │   ├── ChartContainer
│   │   │   │   │   ├── LineChart (Earnings Trend)
│   │   │   │   │   ├── PieChart (By Platform)
│   │   │   │   │   ├── BarChart (By Category)
│   │   │   │   │   └── AreaChart (Over Time)
│   │   │   │   ├── MetricsPanel
│   │   │   │   └── ExportButton
│   │   │   │
│   │   │   ├── Route: Reports
│   │   │   │   ├── ReportSelector
│   │   │   │   ├── DateRangeFilter
│   │   │   │   ├── ReportViewer
│   │   │   │   ├── ChartReport
│   │   │   │   ├── PDFExport
│   │   │   │   └── CSVExport
│   │   │   │
│   │   │   ├── Route: Goals
│   │   │   │   ├── GoalsList
│   │   │   │   │   └── GoalCard (multiple)
│   │   │   │   │       ├── ProgressBar
│   │   │   │   │       ├── GoalActions
│   │   │   │   │       └── Deadline
│   │   │   │   ├── CreateGoalForm
│   │   │   │   └── GoalChart
│   │   │   │
│   │   │   ├── Route: Platforms
│   │   │   │   ├── PlatformsList
│   │   │   │   │   └── PlatformCard (multiple)
│   │   │   │   │       ├── PlatformIcon
│   │   │   │   │       ├── Stats
│   │   │   │   │       └── Actions
│   │   │   │   └── CreatePlatformForm
│   │   │   │
│   │   │   ├── Route: Invoices
│   │   │   │   ├── InvoicesList
│   │   │   │   ├── InvoiceForm
│   │   │   │   ├── InvoicePreview
│   │   │   │   ├── PaymentStatusBadge
│   │   │   │   └── ExportButton
│   │   │   │
│   │   │   ├── Route: Inventory
│   │   │   │   ├── InventoryTable
│   │   │   │   ├── StockAlerts
│   │   │   │   ├── LowStockWarning
│   │   │   │   └── AddProductForm
│   │   │   │
│   │   │   ├── Route: Customers
│   │   │   │   ├── CustomersList
│   │   │   │   ├── CustomerCard
│   │   │   │   ├── LTVMetrics
│   │   │   │   └── InteractionHistory
│   │   │   │
│   │   │   ├── Route: Sales
│   │   │   │   ├── SalesTable
│   │   │   │   ├── SalesChart
│   │   │   │   ├── CreateSaleForm
│   │   │   │   └── SalesMetrics
│   │   │   │
│   │   │   ├── Route: Expenses
│   │   │   │   ├── ExpensesList
│   │   │   │   ├── ExpenseForm
│   │   │   │   ├── ExpenseCategory
│   │   │   │   ├── TaxDeductible
│   │   │   │   └── ExpenseChart
│   │   │   │
│   │   │   ├── Route: Budget
│   │   │   │   ├── BudgetOverview
│   │   │   │   ├── BudgetForm
│   │   │   │   ├── BudgetChart
│   │   │   │   └── BudgetVsActual
│   │   │   │
│   │   │   ├── Route: Time Tracking
│   │   │   │   ├── TimerWidget
│   │   │   │   ├── TimeLogsList
│   │   │   │   └── TimeAnalytics
│   │   │   │
│   │   │   ├── Route: Settings
│   │   │   │   ├── ProfileSettings
│   │   │   │   ├── SecuritySettings
│   │   │   │   ├── PreferencesSettings
│   │   │   │   ├── DisplaySettings
│   │   │   │   ├── NotificationSettings
│   │   │   │   ├── ThemeSettings
│   │   │   │   ├── BackupSettings
│   │   │   │   └── DangerZone
│   │   │   │
│   │   │   ├── Route: Achievements
│   │   │   │   ├── AchievementGrid
│   │   │   │   │   └── AchievementBadge (multiple)
│   │   │   │   ├── AchievementProgress
│   │   │   │   └── AchievementStats
│   │   │   │
│   │   │   └── Route: Tax Calculator
│   │   │       ├── TaxForm
│   │   │       ├── TaxCalculation
│   │   │       └── TaxReport
│   │   │
│   │   └── Notifications
│   │       ├── NotificationCenter
│   │       │   └── NotificationItem (multiple)
│   │       └── Toast Alerts
│   │
│   └── Footer
│       ├── Links
│       ├── Copyright
│       └── SocialLinks
│
├── Modals & Dialogs
│   ├── ConfirmDialog
│   ├── FormModal
│   ├── AlertDialog
│   └── CustomModal
│
└── Global Components
    ├── LoadingSpinner
    ├── ErrorBoundary
    ├── Loader
    └── SkeletonLoader
```

### State Management Flow

```
┌─────────────────────────────────────┐
│       Zustand Store (Global)        │
├─────────────────────────────────────┤
│                                     │
│  1. Auth Store                      │
│     ├── user: User | null           │
│     ├── token: string               │
│     ├── isAuthenticated: boolean    │
│     └── login/logout/register       │
│                                     │
│  2. Notification Store              │
│     ├── notifications: []           │
│     ├── preferences: object         │
│     ├── quietHours: object          │
│     └── addNotification/remove      │
│                                     │
│  3. Theme Store                     │
│     ├── isDarkMode: boolean         │
│     ├── theme: string               │
│     └── toggleTheme/setTheme        │
│                                     │
│  4. Currency Store                  │
│     ├── selectedCurrency: string    │
│     ├── exchangeRates: object       │
│     └── setCurrency                 │
│                                     │
│  5. Widget Store                    │
│     ├── visibleWidgets: []          │
│     ├── widgetLayout: object        │
│     └── toggleWidget/reorder        │
│                                     │
│  6. I18n Store                      │
│     ├── language: string            │
│     └── setLanguage                 │
│                                     │
│  7. Custom Theme Store              │
│     ├── colors: object              │
│     ├── fonts: object               │
│     └── saveTheme                   │
│                                     │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│    React Components (Consumers)     │
├─────────────────────────────────────┤
│                                     │
│  useAuthStore()                     │
│  useNotificationStore()             │
│  useThemeStore()                    │
│  useCurrencyStore()                 │
│  useWidgetStore()                   │
│                                     │
└─────────────────────────────────────┘
```

---

## Backend Architecture

### Service Layer Architecture

```
Request → Middleware → Controller → Service → Repository → Database
   │          │            │          │           │
   │          ▼            ▼          ▼           ▼
   │    ┌──────────────────────────────────────────┐
   │    │   Validation & Auth                      │
   │    │   - JWT Verification                     │
   │    │   - Rate Limiting                        │
   │    │   - Input Validation (Zod)               │
   │    │   - CORS Check                           │
   │    └──────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────┐
│              Route Handler                        │
│   ├── auth.routes.ts                            │
│   ├── user.routes.ts                            │
│   ├── earning.routes.ts                         │
│   ├── goal.routes.ts                            │
│   ├── analytics.routes.ts                       │
│   ├── platform.routes.ts                        │
│   ├── invoice.routes.ts                         │
│   ├── expense.routes.ts                         │
│   ├── product.routes.ts                         │
│   ├── inventory.routes.ts                       │
│   ├── sales.routes.ts                           │
│   ├── customer.routes.ts                        │
│   ├── notification.routes.ts                    │
│   ├── jobs.routes.ts                            │
│   ├── upload.routes.ts                          │
│   └── metrics.routes.ts                         │
└──────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────┐
│            Controllers (Request Handler)          │
│   ├── auth.controller.ts                        │
│   ├── user.controller.ts                        │
│   ├── earning.controller.ts                     │
│   ├── goal.controller.ts                        │
│   ├── analytics.controller.ts                   │
│   ├── platform.controller.ts                    │
│   ├── invoice.controller.ts                     │
│   ├── expense.controller.ts                     │
│   ├── product.controller.ts                     │
│   ├── inventory.controller.ts                   │
│   ├── sales.controller.ts                       │
│   ├── customer.controller.ts                    │
│   ├── notification.controller.ts                │
│   ├── jobs.controller.ts                        │
│   └── upload.controller.ts                      │
└──────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────┐
│          Services (Business Logic)                │
│   ├── AuthService                               │
│   ├── UserService                               │
│   ├── EarningService                            │
│   ├── GoalService                               │
│   ├── AnalyticsService                          │
│   ├── PlatformService                           │
│   ├── InvoiceService                            │
│   ├── ExpenseService                            │
│   ├── ProductService                            │
│   ├── InventoryService                          │
│   ├── SalesService                              │
│   ├── CustomerService                           │
│   └── NotificationService                       │
└──────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────┐
│         Repositories (Data Access)                │
│   ├── UserRepository                            │
│   ├── EarningRepository                         │
│   ├── GoalRepository                            │
│   ├── PlatformRepository                        │
│   ├── InvoiceRepository                         │
│   ├── ExpenseRepository                         │
│   ├── ProductRepository                         │
│   ├── InventoryRepository                       │
│   ├── SalesRepository                           │
│   ├── CustomerRepository                        │
│   └── NotificationRepository                    │
└──────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────┐
│        Prisma ORM (Database Abstraction)          │
│   ├── User Model                                │
│   ├── Earning Model                             │
│   ├── Goal Model                                │
│   ├── Platform Model                            │
│   ├── Invoice Model                             │
│   ├── Expense Model                             │
│   ├── Product Model                             │
│   ├── Inventory Model                           │
│   ├── Sales Model                               │
│   ├── Customer Model                            │
│   ├── Notification Model                        │
│   └── ... (10+ more models)                     │
└──────────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────────┐
│         PostgreSQL Database                       │
│   - Primary data store                          │
│   - ACID transactions                           │
│   - Relational integrity                        │
└──────────────────────────────────────────────────┘
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────────┐
│        User             │
├─────────────────────────┤
│ id (PK)                 │
│ email (UNIQUE)          │
│ password (hash)         │
│ name                    │
│ timezone                │
│ currency                │
│ createdAt               │
│ updatedAt               │
└────────┬────────────────┘
         │ 1:N
         │
    ┌────┴──────────────────────────────────────┐
    │                    │                      │
    ▼                    ▼                      ▼
┌─────────────┐  ┌───────────────┐  ┌──────────────────┐
│  Platform   │  │    Earning    │  │      Goal        │
├─────────────┤  ├───────────────┤  ├──────────────────┤
│ id (PK)     │  │ id (PK)       │  │ id (PK)          │
│ userId (FK) │  │ userId (FK)   │  │ userId (FK)      │
│ name        │  │ platformId(FK)│  │ title            │
│ category    │  │ date          │  │ description      │
│ color       │  │ amount        │  │ targetAmount     │
│ createdAt   │  │ hours         │  │ currentAmount    │
└─────────────┘  │ notes         │  │ deadline         │
        │        │ createdAt     │  │ status           │
        │        └───────────────┘  │ createdAt        │
        │              │            └──────────────────┘
        └──────────────┘

        Additional Models:
        ├── Invoice (userId, customerId, amount, status)
        ├── Expense (userId, amount, category, taxDeductible)
        ├── Product (userId, name, sku, price, category)
        ├── Inventory (productId, quantity, alertLevel)
        ├── Sales (userId, productId, amount, date)
        ├── Customer (userId, name, email, ltv)
        ├── Notification (userId, type, message, read)
        ├── Achievement (userId, type, unlockedAt)
        └── ... and 5+ more models
```

### Data Flow Example: Creating an Earning

```
Frontend                           Backend                          Database
├─ Form Input
├─ Validation
└─ POST /api/earnings             ──────────────────────────────→
                                   │
                                   ├─ middleware/auth.ts
                                   │  └─ Verify JWT token
                                   │
                                   ├─ middleware/validate.ts
                                   │  └─ Validate request body
                                   │
                                   ├─ routes/earning.routes.ts
                                   │  └─ Route to controller
                                   │
                                   ├─ controllers/earning.controller.ts
                                   │  ├─ Extract request data
                                   │  └─ Call EarningService
                                   │
                                   ├─ services/earning.service.ts
                                   │  ├─ Validate business rules
                                   │  ├─ Calculate hourly rate
                                   │  ├─ Check platform exists
                                   │  └─ Call repository
                                   │
                                   ├─ repositories/earning.repo.ts
                                   │  └─ prisma.earning.create()
                                   │
                                   └────────────────────────────────→ PostgreSQL
                                                                     │
                                                                     ├─ INSERT earnings
                                                                     │  table
                                                                     │
                                                                     └─ Return result
                                   ←────────────────────────────────
                                   │
                                   ├─ Cache update
                                   │  └─ redis.set('earnings:*')
                                   │
                                   ├─ WebSocket emit
                                   │  └─ io.emit('earning:created')
                                   │
                                   ├─ Email notification
                                   │  └─ mailer.send()
                                   │
                                   └─ Return response
    ←──────────────────────────────────
    │
    ├─ Parse response
    ├─ Update state
    ├─ Show success message
    └─ Refresh data
```

---

## API Flow

### Request/Response Cycle

```
1. CLIENT REQUEST
   ├─ URL: POST /api/v1/earnings
   ├─ Headers:
   │  ├─ Authorization: Bearer {JWT_TOKEN}
   │  └─ Content-Type: application/json
   └─ Body:
      {
        "platformId": "uuid",
        "date": "2025-01-15",
        "amount": 500,
        "hours": 8,
        "notes": "Client project"
      }

2. GATEWAY VALIDATION
   ├─ HTTPS verification
   ├─ CORS policy check
   ├─ Request logging
   └─ Route matching

3. MIDDLEWARE PROCESSING
   ├─ Request parsing (JSON)
   ├─ Security headers (Helmet)
   ├─ Rate limiting check
   ├─ CORS headers
   ├─ JWT verification
   │  ├─ Token extraction
   │  ├─ Token validation
   │  └─ User identification
   ├─ Request validation (Zod)
   └─ Error handling setup

4. CONTROLLER EXECUTION
   ├─ Extract request data
   ├─ Call service method
   └─ Handle response/error

5. SERVICE PROCESSING
   ├─ Validate business rules
   ├─ Transform data
   ├─ Execute business logic
   ├─ Call repository
   └─ Return result

6. REPOSITORY OPERATION
   ├─ Build Prisma query
   ├─ Execute database operation
   ├─ Cache invalidation
   └─ Return data

7. POST-PROCESSING
   ├─ WebSocket notifications
   ├─ Email sending
   ├─ Cache updates
   └─ Event logging

8. RESPONSE GENERATION
   ├─ Format response data
   ├─ Add status code
   ├─ Set response headers
   └─ Return to client

9. CLIENT RECEIVES
   ├─ Status: 201 Created
   ├─ Headers:
   │  └─ Content-Type: application/json
   └─ Body:
      {
        "id": "uuid",
        "platformId": "uuid",
        "date": "2025-01-15",
        "amount": 500,
        "hours": 8,
        "notes": "Client project",
        "createdAt": "2025-01-15T10:30:00Z"
      }

10. CLIENT PROCESSING
    ├─ Parse response
    ├─ Update state
    ├─ Cache update
    ├─ UI update
    └─ Show success message
```

---

## WebSocket Architecture

### Real-time Communication Flow

```
┌──────────────────────────────────────────────────┐
│          Client WebSocket Connection              │
│         (via Socket.io in React)                 │
└──────────────────────────────┬───────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Socket.io Client │
                    └──────────────────┘
                               │
                    Events:
                    ├─ connect
                    ├─ disconnect
                    ├─ error
                    └─ Custom events:
                       ├─ earning:created
                       ├─ earning:updated
                       ├─ earning:deleted
                       ├─ goal:updated
                       ├─ notification:received
                       ├─ user:online
                       ├─ user:offline
                       └─ activity:logged
                               │
                               ▼
                    ┌──────────────────┐
                    │ Transport Layer  │
                    │ (WebSocket/HTTP) │
                    └──────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────┐
│         Server WebSocket Handler                  │
│           (Socket.io in Express)                 │
└──────────────────────────────┬───────────────────┘
                               │
                        ┌──────▼──────┐
                        │ Event Router │
                        └──────┬──────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
   ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ Connection      │ │ Event        │ │ Broadcast        │
   │ Handler         │ │ Listener     │ │ Handler          │
   ├─────────────────┤ ├──────────────┤ ├──────────────────┤
   │ - User join     │ │ - Parse data │ │ - User rooms     │
   │ - User leave    │ │ - Validate   │ │ - Activity feed  │
   │ - Room mgmt     │ │ - Call svc   │ │ - Notifications  │
   │ - Presence      │ │ - Response   │ │ - Stats update   │
   └─────────────────┘ └──────────────┘ └──────────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Service Layer    │
                    │ - Update data    │
                    │ - Cache update   │
                    │ - DB operations  │
                    └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Response Emitter │
                    └──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
     ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
     │ Sender only   │ │ Room Broadcast│ │ All clients  │
     │ io.to(        │ │ io.to(room)  │ │ io.emit()    │
     │  socketId)    │ │ .emit()      │ │              │
     │ .emit()       │ │              │ │              │
     └───────────────┘ └──────────────┘ └──────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │ Client Receives  │
                    │ Event Data       │
                    └──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
   ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │ Update State    │ │ Update Cache  │ │ Emit Notification│
   │ - Zustand      │ │ - Local store │ │ - Toast message  │
   │ - Component    │ │ - IndexedDB   │ │ - Audio/visual   │
   │   re-render    │ │              │ │                  │
   └─────────────────┘ └──────────────┘ └──────────────────┘
```

---

## Caching Strategy

### Multi-Layer Caching Architecture

```
┌─────────────────────────────────────────┐
│       Application Cache Layers           │
└─────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
    ┌────────────┐  ┌──────────┐  ┌─────────────┐
    │  Browser   │  │  Redis   │  │ Database    │
    │  Cache     │  │  Cache   │  │ Cache       │
    │  Layer 1   │  │  Layer 2 │  │ Layer 3     │
    └────────────┘  └──────────┘  └─────────────┘

Browser Cache (Client-Side):
├─ LocalStorage (persistent)
│  ├─ User preferences
│  ├─ Theme settings
│  ├─ Currency selection
│  └─ Language preference
│
├─ SessionStorage (session-based)
│  ├─ Auth token
│  ├─ Current page state
│  └─ Temporary data
│
├─ IndexedDB (large data sets)
│  ├─ Offline earnings data
│  ├─ Historical charts
│  └─ Full analytics cache
│
└─ Memory Cache (in-component)
   ├─ React component state
   ├─ Component queries
   └─ Temporary UI state

Redis Cache (Server-Side):
├─ Session Management
│  ├─ User sessions
│  ├─ Token blacklist
│  └─ Rate limit counters
│
├─ Data Cache (TTL-based)
│  ├─ User data (5 min)
│  ├─ Earnings data (10 min)
│  ├─ Analytics (15 min)
│  ├─ Platform data (30 min)
│  └─ Goal data (10 min)
│
├─ Computed Results
│  ├─ Hourly rates (5 min)
│  ├─ Monthly totals (10 min)
│  ├─ Analytics graphs (15 min)
│  └─ Reports (1 hour)
│
└─ Real-time Data
   ├─ Activity feed
   ├─ Notifications
   ├─ User presence
   └─ Live metrics

Database Cache (Query Optimization):
├─ Query Result Caching
│  └─ Prisma result caching
│
├─ Index Strategy
│  ├─ userId + date (earnings)
│  ├─ userId + platform (totals)
│  ├─ userId + status (goals)
│  └─ userId + createdAt (activity)
│
└─ Connection Pooling
   ├─ Persistent connections
   ├─ Connection reuse
   └─ Query batching

Cache Invalidation Strategy:
├─ Time-based (TTL)
│  ├─ Short-lived: 1-5 minutes
│  ├─ Medium-lived: 10-30 minutes
│  └─ Long-lived: 1+ hours
│
├─ Event-based
│  ├─ On earning created → invalidate analytics cache
│  ├─ On goal updated → invalidate goal cache
│  ├─ On platform changed → invalidate all related caches
│  └─ On profile update → invalidate user cache
│
├─ Manual Invalidation
│  ├─ User-triggered refresh
│  ├─ Admin actions
│  └─ Batch operations
│
└─ LRU Eviction
   ├─ Redis memory management
   ├─ Least recent first
   └─ Size limit: 1GB
```

---

## Security Architecture

### Authentication & Authorization Flow

```
┌─────────────────────────────────────────┐
│   AUTHENTICATION FLOW (JWT)              │
└─────────────────────────────────────────┘

1. LOGIN
   Client                           Server
    │                                │
    ├─ POST /auth/login             │
    │  {email, password}            │
    ├───────────────────────────────→
    │                         ┌──────┴──────────┐
    │                         │ Hash password   │
    │                         │ Compare with DB │
    │                         │ Generate JWT    │
    │                         │ {              │
    │                         │  header: RS256  │
    │                         │  payload: {    │
    │                         │   userId,      │
    │                         │   email,       │
    │                         │   iat,         │
    │                         │   exp          │
    │                         │  }             │
    │                         │ }              │
    │                         │ Sign with key  │
    │                         └────────┬───────┘
    │ ← JWT token + refresh token ────┤
    │                                 │
    └─ Store in secure httpOnly cookie
       or localStorage

2. AUTHENTICATED REQUEST
   Client                           Server
    │                                │
    ├─ GET /api/earnings           │
    │  Headers: {                  │
    │   Authorization: "Bearer JWT"│
    │  }                           │
    ├───────────────────────────────→
    │                         ┌──────┴──────────┐
    │                         │ Extract JWT     │
    │                         │ Verify signature│
    │                         │ Check expiry    │
    │                         │ Extract userId  │
    │                         │ Check user      │
    │                         │ exists          │
    │                         └────────┬───────┘
    │ ← Authorized response ─────────┤
    │                                 │

3. TOKEN REFRESH
   When JWT expires:
    ├─ Send refresh token
    ├─ Server validates
    ├─ Generate new JWT
    └─ Return new token

Security Measures:
├─ bcrypt password hashing (10 rounds)
├─ JWT signed with RS256
├─ Token expiry: 1 hour
├─ Refresh token expiry: 7 days
├─ HTTPOnly cookie storage
├─ HTTPS only transmission
├─ Rate limiting on login
├─ Account lockout after failures
└─ Token blacklist on logout
```

### Authorization Levels

```
User Roles & Permissions:

┌─────────────────────────────────┐
│   USER ROLE HIERARCHY            │
└─────────────────────────────────┘

Admin
├─ All permissions
├─ User management
├─ System settings
└─ Audit logs

User (Free)
├─ Own data access
├─ 3 platforms max
├─ Basic analytics
├─ CSV export
└─ Read-only settings

User (Pro)
├─ Own data access
├─ Unlimited platforms
├─ Advanced analytics
├─ Custom themes
├─ API access (limited)
└─ Settings edit

User (Business)
├─ Team management
├─ Multi-user access
├─ Advanced analytics
├─ Custom themes
├─ API access (full)
├─ White-label options
└─ Support priority

┌─────────────────────────────────┐
│   DATA ACCESS CONTROL            │
└─────────────────────────────────┘

Row-Level Security:
├─ Users can only access own data
├─ Earnings filtered by userId
├─ Goals filtered by userId
├─ Platforms filtered by userId
└─ Invoices filtered by userId

API Endpoint Authorization:
├─ Public endpoints:
│  ├─ POST /auth/login
│  ├─ POST /auth/register
│  └─ GET /public/features
│
├─ Authenticated endpoints:
│  ├─ Require valid JWT token
│  ├─ Auto userId from token
│  └─ Filter results by userId
│
└─ Admin endpoints:
   ├─ Require admin role
   ├─ Full data access
   └─ System management
```

### Data Encryption

```
Encryption Layers:

Transport Layer:
├─ HTTPS/TLS 1.3
├─ All API communication
├─ WebSocket over WSS
└─ Certificate validation

Storage Layer:
├─ Database encryption (at rest)
├─ Sensitive fields encrypted:
│  ├─ Passwords (bcrypt hash)
│  ├─ API keys
│  ├─ Tokens
│  └─ PII data
│
└─ Encryption algorithm: AES-256

Sensitive Data Handling:
├─ Passwords: Never stored plaintext
│  └─ bcrypt with salt
│
├─ Tokens: Encrypted in DB
│  └─ Signed JWT
│
├─ API Keys: Hashed
│  └─ Comparison on validation
│
└─ Personal Data: GDPR compliant
   └─ Can be deleted on request
```

### Input Validation & Sanitization

```
Validation Pipeline:

Request → Zod Schema → Sanitization → Service

1. Zod Schema Validation
   ├─ Type checking
   ├─ Format validation
   ├─ Length limits
   ├─ Pattern matching
   ├─ Enum validation
   └─ Custom validators

2. XSS Protection
   ├─ HTML escaping
   ├─ Script tag removal
   ├─ Event handler removal
   └─ URL validation

3. SQL Injection Prevention
   ├─ Parameterized queries (Prisma)
   ├─ No raw SQL
   ├─ Type safety
   └─ Prepared statements

4. Rate Limiting
   ├─ IP-based: 100 req/15min (dev), 50 req/15min (prod)
   ├─ User-based: 1000 req/hour
   ├─ Endpoint-specific limits
   └─ Exponential backoff

5. CORS Policy
   ├─ Whitelist allowed origins
   ├─ Specific methods (GET, POST, PUT, DELETE)
   ├─ Specific headers
   └─ Credentials: include
```

---

## Deployment Architecture

### Production Environment

```
┌──────────────────────────────────────────────────┐
│              PRODUCTION DEPLOYMENT                │
└──────────────────────────────────────────────────┘

Global CDN (Vercel Edge Network)
│
├─ Frontend Distribution
│  ├─ Europe: 5 regions
│  ├─ Americas: 4 regions
│  ├─ Asia: 3 regions
│  └─ Africa: 2 regions

Frontend Application
│
├─ Vercel Deployment
│  ├─ Auto scaling
│  ├─ Zero cold starts
│  ├─ Edge functions
│  ├─ Analytics
│  └─ 99.9% uptime SLA
│
└─ Features
   ├─ Automatic HTTPS
   ├─ HTTP/2 push
   ├─ Gzip compression
   ├─ Minification
   └─ Source map uploading

API Gateway
│
└─ Reverse Proxy
   ├─ Load balancing
   ├─ Rate limiting
   ├─ Request filtering
   └─ SSL termination

Backend Application
│
├─ Railway Deployment
│  ├─ Container-based
│  ├─ Auto-scaling (2-10 instances)
│  ├─ Health checks
│  ├─ Zero-downtime deploys
│  └─ 99.95% uptime SLA
│
└─ Features
   ├─ Process monitoring
   ├─ Automatic restarts
   ├─ Environment management
   ├─ Logging integration
   └─ Metrics collection

Database
│
├─ PostgreSQL (Railway)
│  ├─ Multi-region backup
│  ├─ Point-in-time recovery
│  ├─ Automated maintenance
│  ├─ Connection pooling
│  └─ Read replicas (optional)
│
└─ Features
   ├─ Daily backups
   ├─ 30-day retention
   ├─ Encryption at rest
   ├─ SSL connection
   └─ Monitor alerts

Redis Cache
│
├─ Redis (Railway)
│  ├─ 512MB to 2GB capacity
│  ├─ Persistence: RDB
│  ├─ Replication
│  └─ Auto failover
│
└─ Features
   ├─ Session storage
   ├─ Cache management
   ├─ Rate limit counters
   └─ Real-time data

Monitoring & Logging
│
├─ Application Monitoring
│  ├─ Prometheus metrics
│  ├─ Grafana dashboards
│  ├─ Error tracking
│  └─ Performance monitoring
│
├─ Logging
│  ├─ Winston logger
│  ├─ Daily rotating files
│  ├─ Console output
│  └─ Centralized logs
│
└─ Alerts
   ├─ Error rate > 1%
   ├─ Response time > 1s
   ├─ Database connection issues
   ├─ Memory usage > 80%
   └─ Disk space > 90%

DNS & Domain
│
├─ Custom domain
├─ DNS provider
├─ SSL certificate
└─ CNAME records

Backup & Disaster Recovery
│
├─ Database backups
│  ├─ Daily automated
│  ├─ 30-day retention
│  ├─ Point-in-time recovery
│  └─ Multi-region storage
│
├─ Application backups
│  ├─ Docker images
│  ├─ Git repository
│  └─ Configuration versioning
│
└─ Disaster recovery plan
   ├─ RTO: 1 hour
   ├─ RPO: 1 hour
   ├─ Failover procedures
   └─ Communication plan
```

---

## Performance Optimization

### Frontend Performance

```
Optimization Strategies:

1. Code Splitting
   ├─ Route-based splitting
   ├─ Component lazy loading
   ├─ Dynamic imports
   └─ Vendor bundling

2. Bundle Optimization
   ├─ Tree shaking
   ├─ Minification
   ├─ Gzip compression
   ├─ Source maps
   └─ Asset optimization

3. Image Optimization
   ├─ Lazy loading
   ├─ Responsive images
   ├─ WebP format
   ├─ Image compression
   └─ CDN delivery

4. Runtime Optimization
   ├─ Memoization (React.memo)
   ├─ useCallback hooks
   ├─ useMemo hooks
   ├─ Virtual scrolling
   └─ Pagination

5. Caching Strategy
   ├─ Service Workers
   ├─ HTTP caching
   ├─ Browser cache
   └─ IndexedDB

Performance Targets:
├─ First Contentful Paint: < 1.5s
├─ Largest Contentful Paint: < 2.5s
├─ Cumulative Layout Shift: < 0.1
├─ Time to Interactive: < 3s
└─ Core Web Vitals: All "Green"
```

### Backend Performance

```
Optimization Strategies:

1. Database Optimization
   ├─ Query indexing
   ├─ Lazy loading
   ├─ Connection pooling
   ├─ Query caching
   └─ Pagination (cursor-based)

2. Caching Layer
   ├─ Redis caching
   ├─ Cache-aside pattern
   ├─ Write-through cache
   ├─ TTL management
   └─ Cache invalidation

3. API Optimization
   ├─ Response compression
   ├─ Request validation
   ├─ Early error detection
   ├─ Batch operations
   └─ Async processing

4. Scaling Strategy
   ├─ Horizontal scaling
   ├─ Load balancing
   ├─ Queue processing
   ├─ Microservices (future)
   └─ Serverless options

Performance Targets:
├─ API Response: < 200ms (p95)
├─ Database Query: < 100ms (p95)
├─ Cache Hit Rate: > 80%
├─ Throughput: > 1000 req/s
└─ Availability: 99.9% uptime
```

---

## Scalability Architecture

### Horizontal Scaling

```
Load Balancer
│
├─ Backend Instance 1
│  └─ Node.js process
│
├─ Backend Instance 2
│  └─ Node.js process
│
├─ Backend Instance 3
│  └─ Node.js process
│
└─ Backend Instance N
   └─ Node.js process

Shared Resources:
├─ PostgreSQL (primary/replica)
├─ Redis (cluster mode)
├─ Message queue (future)
└─ File storage (S3/CDN)

Auto-scaling Rules:
├─ CPU > 70% → Add instance
├─ Memory > 75% → Add instance
├─ Request queue > 100 → Add instance
├─ Response time > 500ms → Add instance
└─ Min 2 / Max 10 instances
```

---

## Conclusion

EarnTrack's architecture is built on modern, scalable technologies with separation of concerns, proper layering, and production-ready patterns. The system is designed to handle growth from hundreds to millions of users through intelligent caching, database optimization, and horizontal scaling capabilities.

**Key Architectural Principles:**
- Clean separation of concerns (Controllers → Services → Repositories)
- Type safety throughout (TypeScript)
- Security-first design (Authentication, encryption, validation)
- Performance optimization (Caching, indexing, query optimization)
- Scalability ready (Stateless design, horizontal scaling)
- Monitoring & observability (Logs, metrics, alerts)
- Disaster recovery (Backups, failover, replication)

---

**Last Updated:** November 16, 2025
**Architecture Version:** 1.0
**Status:** Production Ready ✅
