# Integration Tests

This directory contains integration tests that use a real PostgreSQL database instead of mocked Prisma client.

## Overview

Unlike unit tests that mock the database layer, integration tests:
- Connect to a real PostgreSQL database
- Use actual Prisma queries and transactions
- Test the complete database interaction flow
- Verify data integrity, constraints, and relationships
- Ensure cascade deletes, foreign keys, and other DB features work correctly

## Running Integration Tests

### Prerequisites

1. PostgreSQL database server running
2. Database URL configured in environment:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/earning_test"
   ```

### Run All Integration Tests

```bash
# Run only integration tests
npm test -- __integration__

# Or using jest directly
npx jest src/test/__integration__
```

### Run Specific Test Files

```bash
# User operations
npm test -- user.integration.test.ts

# Ticket lifecycle
npm test -- ticket.integration.test.ts

# Quota operations
npm test -- quota.integration.test.ts

# Permission checks
npm test -- permissions.integration.test.ts
```

### Run with Coverage

```bash
npm test -- __integration__ --coverage
```

## Test Structure

### Test Files

- `user.integration.test.ts` - User CRUD operations, relations, transactions
- `ticket.integration.test.ts` - Ticket lifecycle, status changes, assignments
- `quota.integration.test.ts` - API quotas, tier upgrades, usage tracking
- `permissions.integration.test.ts` - RBAC, roles, permissions, access control

### Helper Files

- `integration-setup.ts` - Database setup, teardown, and cleanup utilities
- `db-helpers.ts` - Helper functions for creating test data
- `factories.ts` - Factory pattern for generating test entities
- `utils.ts` - Shared test utilities (request/response mocks, assertions)

## Test Database Management

### Automatic Schema Management

Each test run creates a unique PostgreSQL schema:
```
test_<random_id>
```

This ensures:
- Test isolation between parallel runs
- No conflicts with development data
- Clean state for each test suite
- Automatic cleanup after tests complete

### Manual Cleanup

If tests fail and leave schemas behind:
```sql
-- List test schemas
SELECT schema_name FROM information_schema.schemata
WHERE schema_name LIKE 'test_%';

-- Drop specific schema
DROP SCHEMA test_abc123 CASCADE;
```

## Writing Integration Tests

### Basic Structure

```typescript
import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
import { factories, resetSequence } from '../factories';

describe('My Integration Tests', () => {
  const prisma = getTestPrismaClient();

  afterEach(async () => {
    await cleanupAfterTest();
    resetSequence();
  });

  it('should do something', async () => {
    const user = await factories.user.create(prisma);
    // ... test code
  });
});
```

### Using Factories

Factories provide consistent test data generation:

```typescript
// Create user with defaults
const user = await factories.user.create(prisma);

// Create user with overrides
const admin = await factories.user.create(prisma, {
  email: 'admin@example.com',
  name: 'Admin User'
});

// Create multiple users
const users = await factories.user.createMany(prisma, 5);

// Create ticket
const ticket = await factories.ticket.create(prisma, user.id, {
  subject: 'Test Ticket',
  priority: 'HIGH'
});

// Create quota with preset
const quota = await factories.quota.createPro(prisma, user.id);
```

### Using Helper Functions

Helper functions provide common operations:

```typescript
import {
  createTestUser,
  createTestTicket,
  createTestQuota,
  assignRoleToUser,
  assignPermissionToRole,
  userHasPermission
} from '../db-helpers';

// Create test environment
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

### Testing Transactions

```typescript
it('should rollback on error', async () => {
  const initialCount = await prisma.user.count();

  try {
    await prisma.$transaction(async (tx) => {
      await factories.user.create(tx);
      throw new Error('Forced rollback');
    });
  } catch (error) {
    // Expected
  }

  const finalCount = await prisma.user.count();
  expect(finalCount).toBe(initialCount); // No change
});
```

### Testing Cascade Deletes

```typescript
it('should cascade delete relations', async () => {
  const user = await factories.user.create(prisma);
  const ticket = await factories.ticket.create(prisma, user.id);

  await prisma.user.delete({ where: { id: user.id } });

  const foundTicket = await prisma.ticket.findUnique({
    where: { id: ticket.id }
  });

  expect(foundTicket).toBeNull();
});
```

### Testing Constraints

```typescript
it('should enforce unique email constraint', async () => {
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

## Best Practices

### 1. Test Isolation

Each test should be independent:
```typescript
afterEach(async () => {
  await cleanupAfterTest(); // Clean database
  resetSequence();          // Reset factory sequences
});
```

### 2. Use Factories

Prefer factories over manual creation:
```typescript
// Good
const user = await factories.user.create(prisma);

// Avoid (too verbose, brittle)
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    passwordHash: await bcrypt.hash('password', 10),
    timezone: 'UTC',
    currency: 'USD',
    // ... more fields
  }
});
```

### 3. Test Real Scenarios

Test actual use cases:
```typescript
it('should complete ticket lifecycle', async () => {
  const user = await factories.user.create(prisma);
  const agent = await factories.user.create(prisma);

  // Create ticket
  let ticket = await factories.ticket.create(prisma, user.id);
  expect(ticket.status).toBe('OPEN');

  // Assign to agent
  ticket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { assignedTo: agent.id, status: 'IN_PROGRESS' }
  });

  // Resolve
  ticket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'RESOLVED', resolvedAt: new Date() }
  });

  // Close
  ticket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'CLOSED' }
  });

  expect(ticket.status).toBe('CLOSED');
  expect(ticket.resolvedAt).toBeDefined();
});
```

### 4. Error Handling

Test error conditions:
```typescript
it('should handle invalid data', async () => {
  const user = await factories.user.create(prisma);

  await expect(
    prisma.ticket.create({
      data: {
        userId: 'invalid-user-id', // Non-existent user
        subject: 'Test',
        description: 'Test',
        status: 'OPEN',
        priority: 'MEDIUM'
      }
    })
  ).rejects.toThrow();
});
```

### 5. Performance

Keep tests fast:
- Use `createMany` for bulk operations
- Only create necessary test data
- Clean up efficiently with `cleanupAfterTest`

## Debugging

### Enable Query Logging

```bash
DEBUG_TESTS=true npm test -- __integration__
```

This will show all Prisma queries in the console.

### Check Database State

During development, you can inspect the test database:
```bash
# Get current schema name from test output
psql $DATABASE_URL -c "\dn test_*"

# Connect to specific test schema
psql $DATABASE_URL -c "SET search_path TO test_abc123; SELECT * FROM \"user\";"
```

### Keep Test Database

To prevent automatic cleanup (for debugging):
```typescript
// Comment out teardown in your test
// afterAll(async () => {
//   await teardownTestDatabase();
// });
```

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Setup PostgreSQL
  run: |
    docker run -d \
      -e POSTGRES_USER=test \
      -e POSTGRES_PASSWORD=test \
      -e POSTGRES_DB=earning_test \
      -p 5432:5432 \
      postgres:15

- name: Run Integration Tests
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/earning_test
  run: |
    npm run test -- __integration__
```

## Troubleshooting

### "Database does not exist"

Ensure PostgreSQL is running and database exists:
```bash
createdb earning_test
```

### "Permission denied"

Check database user permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE earning_test TO your_user;
GRANT ALL ON SCHEMA public TO your_user;
```

### "Too many open connections"

Reduce parallel test execution:
```bash
npm test -- __integration__ --maxWorkers=2
```

### Schema not cleaning up

Manually drop orphaned schemas:
```sql
DO $$
DECLARE
  schema_name text;
BEGIN
  FOR schema_name IN
    SELECT nspname FROM pg_namespace
    WHERE nspname LIKE 'test_%'
  LOOP
    EXECUTE 'DROP SCHEMA IF EXISTS ' || schema_name || ' CASCADE';
  END LOOP;
END $$;
```

## Migration from Unit Tests

To convert existing unit tests to integration tests:

1. Move test file to `__integration__/` directory
2. Change imports:
   ```typescript
   // Before
   import prisma from '../../lib/prisma';
   jest.mock('../../lib/prisma');

   // After
   import { getTestPrismaClient, cleanupAfterTest } from '../integration-setup';
   const prisma = getTestPrismaClient();
   ```

3. Replace mocks with real data:
   ```typescript
   // Before
   (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

   // After
   const user = await factories.user.create(prisma);
   ```

4. Add cleanup:
   ```typescript
   afterEach(async () => {
     await cleanupAfterTest();
   });
   ```

## Further Reading

- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [PostgreSQL Testing Best Practices](https://wiki.postgresql.org/wiki/Testing)
