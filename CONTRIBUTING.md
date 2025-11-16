# EarnTrack - Contributing Guide

Guidelines for contributing to EarnTrack project. This covers development environment setup, code standards, testing requirements, and pull request process.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Code Standards & Conventions](#code-standards--conventions)
5. [Testing Requirements](#testing-requirements)
6. [Commit Message Format](#commit-message-format)
7. [Pull Request Process](#pull-request-process)
8. [Common Development Tasks](#common-development-tasks)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

```bash
# Check versions
node --version        # Should be 18.0.0 or higher
npm --version         # Should be 9.0.0 or higher
git --version         # Should be 2.30.0 or higher
```

### Fork & Clone

```bash
# 1. Fork the repository on GitHub
#    https://github.com/apipatb/earning → Click "Fork"

# 2. Clone your fork locally
git clone https://github.com/YOUR_USERNAME/earning.git
cd earning

# 3. Add upstream remote
git remote add upstream https://github.com/apipatb/earning.git

# 4. Verify remotes
git remote -v
# origin   → your fork
# upstream → original repo
```

### Initial Setup

```bash
# Install dependencies
npm install

# Create .env.local files
cp app/backend/.env.example app/backend/.env.local
cp app/frontend/.env.example app/frontend/.env.local

# Verify installation
npm run build:check

# Start development servers
npm run dev
```

---

## Development Environment Setup

### PostgreSQL Setup (Local)

**Option 1: Using Docker (Recommended)**

```bash
# Install Docker if not already installed
# https://docs.docker.com/get-docker/

# Start PostgreSQL container
docker run --name earntrack-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=earntrack \
  -p 5432:5432 \
  -d postgres:14

# Verify connection
psql -h localhost -U postgres -d earntrack -c "SELECT 1;"
```

**Option 2: Using Local PostgreSQL**

```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: https://www.postgresql.org/download/windows/

# Create database
createdb earntrack

# Verify
psql -d earntrack -c "SELECT 1;"
```

### Environment Variables

**Backend Configuration** (`app/backend/.env.local`):

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/earntrack?schema=public"

# Authentication
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
NODE_ENV="development"
PORT="3001"

# CORS
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="debug"

# Redis (optional)
REDIS_ENABLED="false"
# REDIS_URL="redis://localhost:6379"
```

**Frontend Configuration** (`app/frontend/.env.local`):

```bash
# API Configuration
VITE_API_URL="http://localhost:3001/api/v1"

# Feature Flags
VITE_ENABLE_ANALYTICS="false"
```

### Redis Setup (Optional)

```bash
# Using Docker
docker run --name earntrack-redis \
  -p 6379:6379 \
  -d redis:7

# Or using Homebrew (macOS)
brew install redis
redis-server

# Verify
redis-cli ping
# Expected: PONG
```

### IDE Setup

**Visual Studio Code (Recommended)**

```json
// Extensions to install:
- ESLint
- Prettier - Code formatter
- Thunder Client (API testing)
- Thunder Client
- REST Client
- Prisma
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
```

**Configuration** (`.vscode/settings.json`):

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Project Structure

```
earning/
├── app/
│   ├── backend/                    # Express.js server
│   │   ├── src/
│   │   │   ├── controllers/        # Route handlers
│   │   │   ├── services/           # Business logic
│   │   │   ├── middleware/         # Express middleware
│   │   │   ├── routes/             # API routes
│   │   │   ├── models/             # Data models
│   │   │   ├── utils/              # Utility functions
│   │   │   ├── types/              # TypeScript types
│   │   │   └── server.ts           # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   └── migrations/         # Database migrations
│   │   ├── tests/                  # Unit & integration tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/                   # React + Vite
│       ├── src/
│       │   ├── components/         # React components
│       │   ├── pages/              # Page components
│       │   ├── hooks/              # Custom hooks
│       │   ├── stores/             # Zustand stores
│       │   ├── services/           # API services
│       │   ├── types/              # TypeScript types
│       │   ├── utils/              # Utility functions
│       │   ├── styles/             # Global styles
│       │   └── App.tsx             # Root component
│       ├── tests/                  # Unit tests
│       ├── e2e/                    # E2E tests (Playwright)
│       ├── public/                 # Static assets
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── playwright.config.ts
│
├── docs/                           # Documentation
├── .github/
│   └── workflows/                  # CI/CD workflows
│
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── CONTRIBUTING.md                 # This file
```

---

## Code Standards & Conventions

### TypeScript Standards

**Type Safety:**
```typescript
// ✓ Good: Explicit types
function calculateEarnings(
  amount: number,
  currency: string,
  taxRate: number
): number {
  return amount * (1 - taxRate / 100);
}

// ✗ Bad: Using any
function calculateEarnings(amount: any, currency: any): any {
  return amount * (1 - 0.2);
}
```

**Interfaces & Types:**
```typescript
// ✓ Use interfaces for object contracts
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// ✓ Use types for unions, aliases
type Status = 'active' | 'inactive' | 'pending';
type ID = string | number;

// ✗ Don't use lowercase 'interface' for types
interface earning {  // Wrong
  amount: number;
}
```

**Naming Conventions:**
```typescript
// Classes & Interfaces: PascalCase
class UserService {}
interface User {}

// Functions & Variables: camelCase
function getUserEmail() {}
const userEmail = 'user@example.com';

// Constants: UPPER_SNAKE_CASE
const MAX_ATTEMPTS = 5;
const DEFAULT_TIMEOUT = 30000;

// Private methods: _camelCase or #privateField
class Service {
  private _internalState: string;
  #privateValue: number;
}

// Booleans: is/has prefix
const isActive = true;
const hasPermission = false;
```

### Code Formatting

**Prettier Configuration** (`.prettierrc`):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Format code before committing:**
```bash
# Format all files
npm run format

# Or format specific file
npx prettier --write app/backend/src/server.ts
```

### Frontend Conventions

**Component Structure:**
```typescript
// components/EarningCard.tsx
import React from 'react';

interface EarningCardProps {
  amount: number;
  platform: string;
  date: Date;
  onEdit: (id: string) => void;
}

export const EarningCard: React.FC<EarningCardProps> = ({
  amount,
  platform,
  date,
  onEdit,
}) => {
  return (
    <div className="card">
      <h3>{platform}</h3>
      <p>${amount}</p>
      <p>{date.toLocaleDateString()}</p>
      <button onClick={() => onEdit(id)}>Edit</button>
    </div>
  );
};

export default EarningCard;
```

**Custom Hooks:**
```typescript
// hooks/useEarnings.ts
import { useState, useEffect } from 'react';

export const useEarnings = (userId: string) => {
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/earnings?userId=${userId}`
        );
        const data = await response.json();
        setEarnings(data);
      } catch (err) {
        setError('Failed to fetch earnings');
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [userId]);

  return { earnings, loading, error };
};
```

### Backend Conventions

**Controller Structure:**
```typescript
// controllers/earningsController.ts
import { Request, Response } from 'express';
import { earningService } from '../services/earningService';

export const earningsController = {
  async list(req: Request, res: Response) {
    try {
      const { userId } = req.user;
      const earnings = await earningService.getEarnings(userId);
      res.json({ success: true, data: earnings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { userId } = req.user;
      const earning = await earningService.createEarning(userId, req.body);
      res.status(201).json({ success: true, data: earning });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
```

**Service Structure:**
```typescript
// services/earningService.ts
import { prisma } from '../prisma';

export const earningService = {
  async getEarnings(userId: string) {
    return await prisma.earning.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  },

  async createEarning(userId: string, data: any) {
    return await prisma.earning.create({
      data: {
        userId,
        ...data,
      },
    });
  },
};
```

### Comments & Documentation

**When to comment:**
```typescript
// ✓ Good: Explains why, not what
// We use UTC for consistency across all timezone calculations
const timestamp = new Date().toISOString();

// ✗ Bad: Obvious from code
// Set the earning amount
const amount = 100;

// ✓ Good: Documents complex logic
// Apply progressive tax calculation:
// 0-1000: 10%, 1000-5000: 20%, 5000+: 30%
const calculateTax = (amount: number) => {
  if (amount <= 1000) return amount * 0.1;
  if (amount <= 5000) return amount * 0.2;
  return amount * 0.3;
};
```

**JSDoc for public APIs:**
```typescript
/**
 * Calculates total earnings for a user in a date range
 * @param userId - The user's unique identifier
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @returns Total earnings amount
 * @throws {Error} If user not found
 */
export async function calculateTotalEarnings(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  // Implementation
}
```

---

## Testing Requirements

### Unit Tests

**Backend Tests** (`app/backend/tests/`):

```bash
# Run all tests
npm --prefix app/backend run test

# Run specific test file
npm --prefix app/backend run test -- services/earningService.test.ts

# Run with coverage
npm --prefix app/backend run test:coverage

# Watch mode (auto-run on file changes)
npm --prefix app/backend run test:watch
```

**Example Unit Test:**
```typescript
// services/earningService.test.ts
import { earningService } from '../services/earningService';

describe('EarningService', () => {
  describe('calculateTotal', () => {
    it('should sum all earnings for a user', () => {
      const earnings = [
        { amount: 100 },
        { amount: 200 },
        { amount: 150 },
      ];

      const total = earningService.calculateTotal(earnings);

      expect(total).toBe(450);
    });

    it('should handle empty earnings array', () => {
      const total = earningService.calculateTotal([]);
      expect(total).toBe(0);
    });
  });
});
```

### Frontend Tests

**React Component Tests:**

```bash
# Run all tests
npm --prefix app/frontend run test

# Run specific test
npm --prefix app/frontend run test -- EarningCard.test.tsx

# With coverage
npm --prefix app/frontend run test:coverage

# UI mode
npm --prefix app/frontend run test:ui
```

**Example Test:**
```typescript
// components/EarningCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EarningCard } from './EarningCard';

describe('EarningCard', () => {
  it('should render earning information', () => {
    render(
      <EarningCard
        amount={100}
        platform="Upwork"
        date={new Date('2025-01-10')}
        onEdit={() => {}}
      />
    );

    expect(screen.getByText('Upwork')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
  });

  it('should call onEdit when button clicked', () => {
    const onEdit = jest.fn();
    render(
      <EarningCard
        amount={100}
        platform="Upwork"
        date={new Date()}
        onEdit={onEdit}
      />
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();
  });
});
```

### E2E Tests

**Using Playwright:**

```bash
# Run all E2E tests
npm --prefix app/frontend run test:e2e

# Run specific test
npm --prefix app/frontend run test:e2e -- login.spec.ts

# Debug mode
npm --prefix app/frontend run test:e2e:debug

# UI mode
npm --prefix app/frontend run test:e2e:ui
```

**Example E2E Test:**
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');

    // Fill form
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'Password123!');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation();

    // Verify dashboard loaded
    expect(page.url()).toContain('/dashboard');
    expect(await page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });
});
```

### Test Coverage Requirements

```
Minimum coverage targets:

Backend:
  Statements: 80%
  Branches: 75%
  Functions: 80%
  Lines: 80%

Frontend:
  Statements: 70%
  Branches: 65%
  Functions: 70%
  Lines: 70%

Critical paths (auth, data access): 100%

Generate coverage report:
npm run test:coverage
# Open coverage/index.html
```

---

## Commit Message Format

### Format Specification

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

```
feat:     A new feature
fix:      A bug fix
docs:     Documentation only
style:    Code style changes (formatting, semicolons, etc.)
refactor: Code refactoring
perf:     Performance improvements
test:     Test additions/modifications
ci:       CI/CD configuration
chore:    Dependency updates, build tools, etc.
```

### Scope

Area of codebase affected:
```
auth, users, earnings, platforms, products, sales,
customers, expenses, invoices, documents, ui, api,
database, infrastructure, etc.
```

### Examples

```
✓ feat(earnings): add monthly earnings summary
✓ fix(auth): resolve JWT token validation issue
✓ docs(readme): update deployment instructions
✓ refactor(earnings): optimize query performance
✓ test(auth): add login flow tests
✓ chore(deps): upgrade typescript to 5.3.3

✗ Fixed stuff
✗ Updated code
✗ Changes
```

### Subject Line Rules

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Max 50 characters
- Be specific and descriptive

### Body

Explain WHAT and WHY, not HOW:

```
feat(earnings): add monthly earnings summary

Add new endpoint to calculate monthly earnings totals
by platform. This enables users to see performance
trends over time and make better decisions about
which platforms to focus on.

- Calculate totals per platform
- Sort by highest earnings
- Cache results for 30 minutes
```

### Footer

Reference issues and breaking changes:

```
feat(auth): redesign login flow

BREAKING CHANGE: Remove deprecated /auth/legacy endpoint.
Use /auth/login instead.

Fixes #123
Related to #456
```

---

## Pull Request Process

### Before Creating PR

```bash
# 1. Update main branch
git checkout main
git pull upstream main

# 2. Create feature branch
git checkout -b feat/your-feature-name

# 3. Make changes and test
npm run test
npm run build:check
npm run lint

# 4. Commit changes
git add .
git commit -m "feat(scope): description"

# 5. Push to your fork
git push origin feat/your-feature-name
```

### Creating PR

1. **Go to GitHub** → Your fork
2. **Click "Pull requests"** tab
3. **Click "New pull request"**
4. **Set base:** upstream/main
5. **Set compare:** your feature branch

### PR Title & Description

**Title Format:**
```
[FEATURE] Add monthly earnings summary
[FIX] Resolve JWT token validation
[DOCS] Update deployment guide
```

**Description Template:**
```markdown
## Description
Brief summary of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Tests passing locally
- [ ] No new warnings generated
```

### PR Review Checklist

Code reviewers check for:

- [ ] Code quality & standards compliance
- [ ] Test coverage adequate
- [ ] Documentation updated
- [ ] No security issues
- [ ] Performance acceptable
- [ ] Backwards compatible
- [ ] No hardcoded values
- [ ] Error handling complete

### Approval & Merge

```
Approval Process:
1. Code review (minimum 1 approval required)
2. Tests passing (CI/CD)
3. No conflicts with main branch
4. Squash commits (optional)
5. Merge pull request

Merge Strategy:
- Squash commits if many small commits
- Use "Create merge commit" for releases
- Delete branch after merge
```

---

## Common Development Tasks

### Adding a New Feature

**Step 1: Create branch**
```bash
git checkout -b feat/new-feature
```

**Step 2: Create API endpoint**
```typescript
// routes/newFeature.ts
router.get('/new-feature', async (req, res) => {
  try {
    const data = await newFeatureService.getData();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

**Step 3: Create service**
```typescript
// services/newFeatureService.ts
export const newFeatureService = {
  async getData() {
    return await prisma.model.findMany();
  }
};
```

**Step 4: Create tests**
```typescript
// tests/newFeature.test.ts
describe('New Feature', () => {
  it('should retrieve data', async () => {
    const data = await newFeatureService.getData();
    expect(data).toBeDefined();
  });
});
```

**Step 5: Create frontend component**
```typescript
// components/NewFeature.tsx
export const NewFeature = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/v1/new-feature')
      .then(res => res.json())
      .then(data => setData(data));
  }, []);

  return <div>{/* render data */}</div>;
};
```

**Step 6: Test locally**
```bash
npm run dev
# Test in browser
```

**Step 7: Commit and push**
```bash
git add .
git commit -m "feat(feature): add new feature"
git push origin feat/new-feature
```

### Fixing a Bug

**Step 1: Identify root cause**
```bash
# Check logs
npm run dev
# Reproduce issue locally
```

**Step 2: Write test for bug**
```typescript
it('should handle edge case', () => {
  // Test that exposes the bug
});
```

**Step 3: Fix the bug**
```typescript
// Fix implementation
```

**Step 4: Verify test passes**
```bash
npm run test
```

**Step 5: Commit**
```bash
git commit -m "fix(scope): brief description of fix"
```

### Database Migrations

**Create migration:**
```bash
npm --prefix app/backend run db:migrate:dev --name add_new_field
```

**Edit migration file:**
```sql
-- prisma/migrations/[timestamp]_add_new_field/migration.sql
ALTER TABLE table_name ADD COLUMN new_field VARCHAR(255);
```

**Apply migration:**
```bash
npm --prefix app/backend run db:push
```

**Update schema.prisma:**
```prisma
model TableName {
  id String @id @default(uuid())
  newField String?
  // ...
}
```

### Updating Dependencies

```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all packages
npm update

# Install new dependency
npm install new-package

# Install dev dependency
npm install --save-dev dev-package

# Run tests to ensure compatibility
npm run test
```

---

## Troubleshooting

### Common Issues & Solutions

**Issue: `npm install` fails**
```bash
# Clear cache
npm cache clean --force

# Reinstall
npm install

# Or remove node_modules
rm -rf node_modules
npm install
```

**Issue: PostgreSQL connection fails**
```bash
# Verify database is running
docker ps | grep postgres

# Check DATABASE_URL in .env.local

# Test connection manually
psql $DATABASE_URL -c "SELECT 1;"
```

**Issue: Port already in use**
```bash
# Find process using port
lsof -i :3001
# or
netstat -tlnp | grep 3001

# Kill process
kill -9 [PID]

# Or use different port
PORT=3002 npm run dev
```

**Issue: Tests failing**
```bash
# Clear jest cache
npm --prefix app/backend run test -- --clearCache

# Run tests in verbose mode
npm --prefix app/backend run test -- --verbose

# Run single test
npm --prefix app/backend run test -- specific.test.ts
```

**Issue: Build fails**
```bash
# Check for TypeScript errors
npm run build:check

# Fix linting errors
npm run lint -- --fix

# Try clean rebuild
rm -rf dist/
npm run build
```

---

## Getting Help

- **GitHub Issues:** Report bugs or ask questions
- **Discussions:** Ask for help with contribution
- **Pull Request:** Use PR comments for context
- **Email:** Contact maintainers for complex issues

---

**Last Updated:** 2025-01-16
**Version:** 1.0
**Status:** Active
