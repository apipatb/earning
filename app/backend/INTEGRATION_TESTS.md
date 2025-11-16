# Integration Tests - Quick Start Guide

This guide will help you get started with the new integration test infrastructure that uses a real PostgreSQL database.

## What Changed?

Previously, all tests used mocked Prisma client. Now:

- **Unit tests** still use mocked Prisma (in `src/controllers/__tests__/`)
- **Integration tests** use real database (in `src/test/__integration__/`)

## Quick Start

### 1. Ensure Database is Running

```bash
# Check if PostgreSQL is running
psql --version

# If not installed, install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: https://www.postgresql.org/download/windows/

# Start PostgreSQL service
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start
# Windows: Start from Services panel
```

### 2. Create Test Database

```bash
# Create database
createdb earning_test

# Set environment variable
export DATABASE_URL="postgresql://your_user:your_password@localhost:5432/earning_test"

# Or add to .env file
echo 'DATABASE_URL="postgresql://your_user:your_password@localhost:5432/earning_test"' >> .env
```

### 3. Run Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test file
npm run test:integration user.integration.test.ts

# Run with watch mode
npm run test:integration:watch

# Run with coverage
npm run test:integration:coverage
```

### 4. Run All Tests (Unit + Integration)

```bash
# Run unit tests only
npm run test:unit

# Run both unit and integration
npm run test:all

# Run standard jest (unit tests only, by default)
npm test
```

## Available Test Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run unit tests (mocked) |
| `npm run test:unit` | Run unit tests explicitly |
| `npm run test:integration` | Run integration tests (real DB) |
| `npm run test:integration:watch` | Watch mode for integration tests |
| `npm run test:integration:coverage` | Integration tests with coverage |
| `npm run test:all` | Run both unit and integration tests |

## Test Files Overview

### Integration Test Files

```
src/test/__integration__/
├── README.md                          # Detailed documentation
├── example.integration.test.ts        # Comprehensive example
├── user.integration.test.ts           # User CRUD operations
├── ticket.integration.test.ts         # Ticket lifecycle
├── quota.integration.test.ts          # API quota management
└── permissions.integration.test.ts    # RBAC permissions
```

### Helper Files

```
src/test/
├── integration-setup.ts    # Database setup/teardown
├── db-helpers.ts          # Database helper functions
├── factories.ts           # Test data factories
├── utils.ts              # Test utilities (existing)
└── setup.ts              # Jest setup (updated)
```

## Writing Your First Integration Test

### 1. Create Test File

Create a new file in `src/test/__integration__/`:

```typescript
// src/test/__integration__/myfeature.integration.test.ts

import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';

describe('My Feature Integration Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  it('should test my feature', async () => {
    // Create test data
    const user = await factories.user.create(prisma);

    // Test your feature
    // ... your test code

    // Assertions
    expect(user).toBeDefined();
  });
});
```

### 2. Use Factories

Factories make it easy to create test data:

```typescript
// Create user with defaults
const user = await factories.user.create(prisma);

// Create user with custom values
const admin = await factories.user.create(prisma, {
  email: 'admin@example.com',
  name: 'Admin User'
});

// Create multiple users
const users = await factories.user.createMany(prisma, 5);

// Create related entities
const ticket = await factories.ticket.create(prisma, user.id, {
  subject: 'Help!',
  priority: 'HIGH'
});

const quota = await factories.quota.createPro(prisma, user.id);
```

### 3. Use Helper Functions

Helpers provide common operations:

```typescript
import {
  createTestUser,
  createTestTicket,
  assignRoleToUser,
  userHasPermission
} from '../db-helpers';

// Create user
const user = await createTestUser(prisma, {
  email: 'test@example.com'
});

// Check permissions
const canRead = await userHasPermission(
  prisma,
  user.id,
  'tickets',
  'READ'
);
```

## Common Patterns

### Testing CRUD Operations

```typescript
it('should create, read, update, and delete', async () => {
  // Create
  const user = await factories.user.create(prisma);
  expect(user.id).toBeDefined();

  // Read
  const found = await prisma.user.findUnique({
    where: { id: user.id }
  });
  expect(found).not.toBeNull();

  // Update
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { name: 'New Name' }
  });
  expect(updated.name).toBe('New Name');

  // Delete
  await prisma.user.delete({ where: { id: user.id } });
  const deleted = await prisma.user.findUnique({
    where: { id: user.id }
  });
  expect(deleted).toBeNull();
});
```

### Testing Relations

```typescript
it('should include relations', async () => {
  const user = await factories.user.create(prisma);
  await factories.platform.create(prisma, user.id);
  await factories.earning.create(prisma, user.id);

  const userWithRelations = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      platforms: true,
      earnings: true
    }
  });

  expect(userWithRelations?.platforms).toHaveLength(1);
  expect(userWithRelations?.earnings).toHaveLength(1);
});
```

### Testing Transactions

```typescript
it('should rollback on error', async () => {
  const initialCount = await prisma.user.count();

  try {
    await prisma.$transaction(async (tx) => {
      await factories.user.create(tx);
      throw new Error('Rollback');
    });
  } catch (error) {
    // Expected
  }

  const finalCount = await prisma.user.count();
  expect(finalCount).toBe(initialCount);
});
```

### Testing Constraints

```typescript
it('should enforce unique constraint', async () => {
  await factories.user.create(prisma, {
    email: 'unique@example.com'
  });

  await expect(
    factories.user.create(prisma, {
      email: 'unique@example.com'
    })
  ).rejects.toThrow();
});
```

## Debugging

### Enable Debug Logging

```bash
# Show all SQL queries
DEBUG_TESTS=true npm run test:integration
```

### Inspect Test Database

```bash
# Connect to test database
psql $DATABASE_URL

# List schemas
\dn test_*

# Set search path to test schema
SET search_path TO test_abc123;

# Query tables
SELECT * FROM "user";
```

### Keep Database for Inspection

Comment out teardown in your test:

```typescript
// afterAll(async () => {
//   await teardownTestDatabase();
// });
```

## Troubleshooting

### Error: "Database does not exist"

```bash
createdb earning_test
```

### Error: "Connection refused"

```bash
# Check if PostgreSQL is running
brew services list  # macOS
sudo service postgresql status  # Linux

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start  # Linux
```

### Error: "Permission denied"

```sql
-- Connect as superuser
psql postgres

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE earning_test TO your_user;
```

### Tests are Slow

```bash
# Reduce parallel workers
npm run test:integration -- --maxWorkers=2

# Run specific tests
npm run test:integration user.integration.test.ts
```

## Best Practices

1. **Always clean up** - Use `cleanupAfterTest()` in `afterEach`
2. **Use factories** - Don't create data manually
3. **Test isolation** - Each test should be independent
4. **Test real scenarios** - Integration tests should test complete flows
5. **Keep tests fast** - Only create necessary data

## Migration from Unit Tests

To convert a unit test to integration test:

```typescript
// Before (unit test)
import prisma from '../../lib/prisma';
jest.mock('../../lib/prisma');

describe('My Tests', () => {
  beforeEach(() => {
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
  });
});

// After (integration test)
import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories } from '../factories';

describe('My Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should work', async () => {
    const user = await factories.user.create(prisma);
    // Real database operations
  });
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: earning_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/earning_test
```

## Next Steps

1. Review existing integration tests in `src/test/__integration__/`
2. Read the detailed README at `src/test/__integration__/README.md`
3. Check the example test at `example.integration.test.ts`
4. Start writing integration tests for your features!

## Getting Help

- Check `src/test/__integration__/README.md` for detailed documentation
- Look at `example.integration.test.ts` for comprehensive examples
- Review existing integration tests for patterns
- Ask the team for help!

## Key Files to Know

| File | Purpose |
|------|---------|
| `integration-setup.ts` | Database setup and teardown |
| `factories.ts` | Test data generation |
| `db-helpers.ts` | Common database operations |
| `utils.ts` | Test utilities |
| `example.integration.test.ts` | Comprehensive example |

Happy testing! 🎉
