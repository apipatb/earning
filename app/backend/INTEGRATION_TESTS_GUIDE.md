# Integration Tests Guide

## Overview

Comprehensive integration tests for critical API workflows have been created to test:

1. **Authentication Flow** - Register, login, token validation, and protected endpoint access
2. **Earnings Workflow** - CRUD operations, pagination, filtering, and WebSocket event triggers
3. **Invoices Workflow** - Invoice creation with line items, customer linking, status updates, and filtering

## Test Files Created

### 1. `/src/__tests__/integration/test-setup.ts`
Central test setup utility providing:
- Express app initialization with all necessary routes
- Database connection management
- Test data creation helpers (users, platforms, customers, earnings)
- Cleanup utilities for database between tests
- Mock database support for development testing

### 2. `/src/__tests__/integration/auth.integration.test.ts`
**12 integration tests** covering:
- User registration with validation
- Login with valid/invalid credentials
- Token generation and verification
- Bearer token authentication
- Protected endpoint access
- Error handling for invalid inputs
- Duplicate email prevention

### 3. `/src/__tests__/integration/earnings.integration.test.ts`
**17 integration tests** covering:
- Complete CRUD workflow (Create → Read → Update → Delete)
- WebSocket event triggers for earnings operations
- Pagination with limit and offset
- Date range filtering
- Platform filtering
- Validation error handling
- Cross-user data isolation
- Hourly rate calculations

### 4. `/src/__tests__/integration/invoices.integration.test.ts`
**17 integration tests** covering:
- Invoice creation with line items
- Multiple line items handling
- Customer linking and validation
- Invoice status updates (draft → sent → paid)
- Mark invoice as paid
- Complete invoice workflow
- Invoice deletion
- Pagination and filtering by status/date
- Validation of line items and amounts
- Cross-user data isolation

## Quick Start

### Prerequisites

- Node.js 16+
- npm or yarn
- PostgreSQL (for production testing) OR use mock mode (for development)

### Installation

```bash
cd /home/user/earning/app/backend

# Install dependencies (already done)
npm install

# Install additional test dependencies (if needed)
npm install --save-dev @types/supertest
```

### Running Tests

#### Option 1: Mock Database Mode (Development - No DB Setup)

```bash
# Run all integration tests
npm test -- --testPathPattern="integration"

# Run specific test suite
npm test -- --testPathPattern="integration/auth"
npm test -- --testPathPattern="integration/earnings"
npm test -- --testPathPattern="integration/invoices"

# Run with coverage
npm test -- --testPathPattern="integration" --coverage

# Run specific test
npm test -- --testPathPattern="integration/auth" --testNamePattern="Register user"
```

#### Option 2: Real Database Mode (Production Testing)

To run tests against a real PostgreSQL database:

1. **Create a test database:**

```bash
createdb earntrack_test
```

2. **Set up `.env.test` file:**

```bash
cat > .env.test << 'EOF'
DATABASE_URL="postgresql://username:password@localhost:5432/earntrack_test?schema=public"
USE_MOCK_DATABASE="false"
JWT_SECRET="test-secret-key"
JWT_EXPIRES_IN="1h"
PORT=3001
NODE_ENV="test"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
EOF
```

3. **Run Prisma migrations:**

```bash
npx prisma migrate deploy --skip-generate
```

4. **Run tests:**

```bash
npm test -- --testPathPattern="integration"
```

## Test Coverage Summary

### Authentication Tests (12 tests)
- ✓ Register with valid data
- ✓ Login with credentials
- ✓ Access protected endpoints with token
- ✓ Complete auth flow workflow
- ✓ Reject non-existent users
- ✓ Reject incorrect passwords
- ✓ Validate email format
- ✓ Prevent duplicate registrations
- ✓ Require authentication for protected routes
- ✓ Validate token format
- ✓ Reject invalid Bearer tokens
- ✓ Accept valid tokens

### Earnings Tests (17 tests)
- ✓ Create earning with all fields
- ✓ Read earnings list
- ✓ Update earning details
- ✓ Delete earning
- ✓ Complete CRUD workflow
- ✓ WebSocket event on creation
- ✓ WebSocket event on update
- ✓ WebSocket event on deletion
- ✓ Pagination with limit
- ✓ Pagination with offset
- ✓ Filter by date range
- ✓ Filter by platform
- ✓ Validate required fields
- ✓ Validate date format
- ✓ Prevent non-existent platform usage
- ✓ Prevent non-existent earning updates
- ✓ Prevent cross-user data access

### Invoices Tests (17 tests)
- ✓ Create invoice with line items
- ✓ Create invoice with multiple items
- ✓ Create invoice without customer
- ✓ Link invoice to customer
- ✓ Reject non-existent customer
- ✓ Prevent cross-user customer linking
- ✓ Update invoice status
- ✓ Mark invoice as paid
- ✓ Update invoice details
- ✓ Complete invoice workflow
- ✓ Delete invoice
- ✓ Reject deletion of non-existent invoice
- ✓ List invoices with pagination
- ✓ Filter invoices by status
- ✓ Filter invoices by date range
- ✓ Validate line item data
- ✓ Reject negative amounts

## Key Testing Patterns

### 1. Test Data Isolation

Each test cleans the database before running:

```typescript
beforeEach(async () => {
  await TestSetup.cleanDatabase();
  // Create fresh test data
});
```

### 2. User Authentication

Tests create users and obtain valid tokens:

```typescript
const { user, token } = await TestSetup.createTestUser();
const response = await request(app)
  .post('/api/v1/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .send(data);
```

### 3. CRUD Workflow Testing

Complete workflows are tested:

```typescript
// CREATE
const createRes = await request(app).post('/api/v1/resource').send(data);

// READ
const readRes = await request(app).get('/api/v1/resource');

// UPDATE
const updateRes = await request(app).put(`/api/v1/resource/${id}`).send(updates);

// DELETE
const deleteRes = await request(app).delete(`/api/v1/resource/${id}`);
```

### 4. Error Handling Validation

Tests verify proper error responses:

```typescript
const response = await request(app)
  .post('/api/v1/endpoint')
  .send(invalidData);

expect(response.status).toBe(400);
expect(response.body.error).toBe('Validation Error');
```

## Configuration Files

### `.env.test` - Test Environment Variables
```
USE_MOCK_DATABASE=true          # Enable mock mode
DATABASE_URL=postgresql://...   # Test DB connection
JWT_SECRET=test-secret-key      # JWT signing key
JWT_EXPIRES_IN=1h              # Token expiration
NODE_ENV=test                  # Environment
```

### `jest.config.js` - Jest Configuration
- Configured for TypeScript with ts-jest
- Setup file loads .env.test
- Test timeout: 30 seconds
- Coverage reports in `coverage/` directory

### `jest.setup.js` - Test Setup
- Loads environment variables from .env.test
- Enables mock database mode by default
- Sets NODE_ENV to 'test'

## Continuous Integration

For CI/CD pipelines:

```bash
# Run all tests with coverage
npm test -- --coverage --forceExit

# Run only integration tests
npm test -- --testPathPattern="integration" --coverage --forceExit

# Generate coverage report
npm run test:coverage
```

## Troubleshooting

### Tests Timeout

Increase timeout in jest.config.js:
```javascript
testTimeout: 60000 // 60 seconds
```

### Prisma Client Error

If you see "Did not initialize" error:
1. Ensure USE_MOCK_DATABASE=true in .env.test
2. Or run: `npx prisma generate`

### Database Connection Error

When not using mock database:
1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in .env.test
3. Run migrations: `npx prisma migrate deploy`

### Port Already in Use

Change PORT in .env.test or:
```bash
lsof -i :3001
kill -9 <PID>
```

## Performance Considerations

- Mock mode: ~5-10 seconds for full test suite
- Real database: ~10-20 seconds (depending on DB speed)
- Individual test: <100ms typically

## Future Enhancements

1. **WebSocket Testing**: Full socket.io client integration for real-time events
2. **Performance Tests**: Benchmark critical operations
3. **Load Testing**: Stress test with high concurrency
4. **Security Tests**: SQL injection, XSS, CSRF protection
5. **Snapshot Testing**: API response structure validation

## API Endpoints Tested

### Authentication
- POST `/api/v1/auth/register` - User registration
- POST `/api/v1/auth/login` - User login

### Earnings
- GET `/api/v1/earnings` - List earnings with pagination/filtering
- POST `/api/v1/earnings` - Create earning
- PUT `/api/v1/earnings/:id` - Update earning
- DELETE `/api/v1/earnings/:id` - Delete earning

### Invoices
- GET `/api/v1/invoices` - List invoices
- POST `/api/v1/invoices` - Create invoice
- PUT `/api/v1/invoices/:id` - Update invoice
- PATCH `/api/v1/invoices/:id/mark-paid` - Mark as paid
- DELETE `/api/v1/invoices/:id` - Delete invoice

### Customers
- Created for invoice linking tests

### Platforms
- Created for earnings tests

## Best Practices

1. **Isolate Test Data**: Each test is independent
2. **Clean Between Tests**: Database cleaned in beforeEach
3. **Use Meaningful Names**: Test names describe exact behavior
4. **Test Both Success and Failure**: Positive and negative cases
5. **Verify Database State**: Confirm changes persist
6. **Test Permissions**: Verify cross-user isolation
7. **Comprehensive Coverage**: All major workflows tested

## License

Part of EarnTrack project
