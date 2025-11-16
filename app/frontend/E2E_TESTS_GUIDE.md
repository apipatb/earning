# End-to-End Tests Guide

This document provides comprehensive guidance on the E2E test suite for the EarnTrack application using Playwright.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Configuration](#configuration)
4. [Test Structure](#test-structure)
5. [Running Tests](#running-tests)
6. [Writing Tests](#writing-tests)
7. [Page Objects](#page-objects)
8. [Fixtures](#fixtures)
9. [Debugging](#debugging)
10. [CI/CD Integration](#cicd-integration)
11. [Best Practices](#best-practices)

## Overview

The E2E test suite provides comprehensive coverage of critical user workflows in the EarnTrack application:

- **Authentication**: User registration, login, logout, and session management
- **Earnings Management**: Create, read, update, and delete earnings records
- **Invoice Management**: Create, manage, and track invoices
- **Dashboard**: View summaries, charts, and analytics

### Test Coverage

- **Authentication Tests**: 8 tests covering registration, login, session persistence, and logout
- **Earnings Tests**: 8 tests covering CRUD operations, search, and filtering
- **Invoices Tests**: 9 tests covering invoice creation, management, and PDF generation
- **Dashboard Tests**: 10 tests covering widgets, charts, and data updates

**Total: 35+ comprehensive E2E tests**

## Setup

### Prerequisites

- Node.js 14+ installed
- npm or yarn package manager
- Backend API running (if not using mocked responses)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Configuration

Create a `.env.local` file in the frontend directory:

```env
BASE_URL=http://localhost:3001
PLAYWRIGHT_TIMEOUT=30000
PLAYWRIGHT_HEADLESS=true
```

## Configuration

### Playwright Config

The `playwright.config.ts` file contains the main configuration:

```typescript
{
  testDir: './tests/e2e',                    // Test file directory
  fullyParallel: true,                       // Run tests in parallel
  forbidOnly: !!process.env.CI,              // Fail on test.only in CI
  retries: process.env.CI ? 2 : 0,           // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined,   // Single worker in CI
  reporter: [
    ['html', { outputFolder: 'test-results' }],
    ['json'],
    ['junit']
  ],
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI
  }
}
```

### Key Configuration Features

- **Multiple Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Mobile Testing**: Includes mobile Chrome and Safari viewports
- **Auto Server Start**: Automatically starts dev server for tests
- **CI Optimizations**: Retries, screenshots, and videos on failure
- **Reporting**: HTML, JSON, and JUnit formats for CI integration

## Test Structure

### Directory Layout

```
frontend/
├── playwright.config.ts           # Playwright configuration
├── tests/
│   ├── e2e/                       # End-to-end tests
│   │   ├── auth.spec.ts          # Authentication workflows
│   │   ├── earnings.spec.ts      # Earnings CRUD operations
│   │   ├── invoices.spec.ts      # Invoice management
│   │   └── dashboard.spec.ts     # Dashboard functionality
│   └── fixtures/
│       ├── auth-fixture.ts        # Test users and helpers
│       └── page-objects.ts        # Page object models
└── test-results/                  # Test reports (generated)
```

### Test File Structure

Each test file follows this pattern:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from '../fixtures/page-objects';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    expect(actual).toBe(expected);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
  });
});
```

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run specific browser
npm run test:e2e:chrome
npm run test:e2e:firefox
npm run test:e2e:webkit

# View test results
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run single test file
npx playwright test tests/e2e/auth.spec.ts

# Run tests matching pattern
npx playwright test --grep "Login"

# Run specific test
npx playwright test -t "Login with valid credentials"

# Run with specific project
npx playwright test --project=chromium

# Headed mode (show browser)
npx playwright test --headed

# Single worker (no parallel)
npx playwright test --workers=1
```

### Test Output

Successful test run:
```
✓ 35 passed (2m 15s)
```

With failures:
```
✓ 32 passed
✗ 3 failed
- Authentication > Login with invalid credentials
```

## Writing Tests

### Test Template

```typescript
test('should complete a workflow', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Navigate
  await loginPage.navigate();

  // Interact
  await loginPage.login('user@example.com', 'password');

  // Assert
  expect(page.url()).toContain('/dashboard');
  expect(await loginPage.isErrorMessageVisible()).toBe(false);
});
```

### Assertions

Common assertions used in tests:

```typescript
// URL checks
expect(page.url()).toContain('/dashboard');
expect(page.url()).toMatch(/\/earnings/);

// Visibility
expect(await element.isVisible()).toBe(true);
expect(await page.locator('.selector').count()).toBeGreaterThan(0);

// Content
expect(await element.textContent()).toContain('Expected Text');
expect(await input.inputValue()).toBe('text');

// State changes
expect(countAfter).toBeGreaterThan(countBefore);
expect(status).toMatch(/paid/i);
```

### Wait Strategies

```typescript
// Wait for URL change
await page.waitForURL('/dashboard', { timeout: 10000 });

// Wait for selector
await page.waitForSelector('[data-testid="modal"]');

// Wait for function
await page.waitForFunction(() => document.querySelectorAll('.item').length > 5);

// Wait for network
await page.waitForLoadState('networkidle');
```

## Page Objects

Page objects encapsulate UI interactions and make tests more maintainable.

### Example: LoginPage

```typescript
export class LoginPage extends BasePage {
  private emailInput = 'input[name="email"]';
  private passwordInput = 'input[name="password"]';
  private submitButton = 'button[type="submit"]';

  async navigate() {
    await this.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
  }

  async waitForDashboardRedirect() {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }
}
```

### Usage in Tests

```typescript
const loginPage = new LoginPage(page);
await loginPage.navigate();
await loginPage.login('user@example.com', 'password');
await loginPage.waitForDashboardRedirect();
```

### Benefits

- **Maintainability**: Update selectors in one place
- **Readability**: Tests read like business logic
- **Reusability**: Share methods across tests
- **Robustness**: Encapsulate wait logic

## Fixtures

Fixtures provide reusable test data and setup functions.

### Available Fixtures

#### Test Users

```typescript
const TEST_USERS = {
  newUser: {
    email: 'test-user-{timestamp}@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  },
  existingUser: {
    email: 'existing@example.com',
    password: 'ExistingPassword123!',
  },
  invalidUser: {
    email: 'invalid@example.com',
    password: 'WrongPassword123!',
  },
};
```

#### Sample Data

```typescript
const SAMPLE_EARNINGS = {
  valid: {
    title: 'Freelance Project',
    description: 'Web development project',
    amount: 1500,
    currency: 'USD',
    date: '2024-01-15',
    status: 'completed',
  },
};

const SAMPLE_INVOICES = {
  valid: {
    clientName: 'Acme Corp',
    clientEmail: 'contact@acme.com',
    invoiceNumber: `INV-${Date.now()}`,
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    lineItems: [...],
    total: 5600,
  },
};
```

#### Helper Functions

```typescript
// Registration
await registerUser(page, TEST_USERS.newUser);

// Login
await loginUser(page, email, password);

// Logout
await logoutUser(page);

// Authentication check
const isAuth = await isUserAuthenticated(page);
```

## Debugging

### Debug Mode

```bash
npm run test:e2e:debug
```

Features:
- Step through tests line by line
- Inspect page state
- Execute commands in console
- Set breakpoints

### UI Mode

```bash
npm run test:e2e:ui
```

Benefits:
- Visual test execution
- Timeline of actions
- Network inspector
- DOM snapshots

### Logging

Add debug output in tests:

```typescript
test('should login', async ({ page }) => {
  console.log('Navigating to login...');
  await loginPage.navigate();

  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  // Your test code...
});
```

Run with debug logs:
```bash
DEBUG=pw:api npm run test:e2e
```

### Screenshots and Videos

Automatically captured on failure:
- Screenshots: `test-results/` directory
- Videos: `test-results/videos/` directory
- Traces: `test-results/traces/` directory

View in HTML report:
```bash
npm run test:e2e:report
```

### Common Issues

#### Tests Timeout

```typescript
// Increase timeout for specific test
test('slow test', async ({ page }) => {
  // ...
}, { timeout: 60000 });

// Or globally in config
use: {
  timeout: 30000
}
```

#### Element Not Found

```typescript
// Use explicit waits
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });
await page.locator('[data-testid="element"]').waitFor({ state: 'visible' });
```

#### Flaky Tests

```typescript
// Use network idle waits
await page.waitForLoadState('networkidle');

// Retry mechanism
test.extend({
  page: async ({ page }, use) => {
    await use(page);
  },
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

### Jenkins Pipeline Example

```groovy
stage('E2E Tests') {
  steps {
    sh 'npm run test:e2e'
  }
  post {
    always {
      junit 'test-results/junit.xml'
      publishHTML([
        reportDir: 'test-results',
        reportFiles: 'index.html',
        reportName: 'Playwright Report'
      ])
    }
  }
}
```

### Test Results

Access results after test run:
```bash
npm run test:e2e:report
```

Reports include:
- Passed/failed test breakdown
- Execution times
- Screenshots on failure
- Video recordings
- Detailed error messages

## Best Practices

### 1. Use Data Attributes for Selectors

```typescript
// Good
await page.click('[data-testid="submit-button"]');

// Avoid
await page.click('button.btn.btn-primary:nth-child(3)');
```

### 2. Wait for Network Activity

```typescript
// Good
await page.waitForLoadState('networkidle');
await page.waitForLoadState('domcontentloaded');

// Less reliable
await page.wait(1000); // Fixed wait
```

### 3. Use Page Objects

```typescript
// Good
const loginPage = new LoginPage(page);
await loginPage.login(email, password);

// Avoid
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', password);
```

### 4. Test User Workflows, Not Implementation

```typescript
// Good - Tests complete workflow
test('user can create and view earnings', async () => {
  await createEarning(...);
  await viewEarningsList();
  expect(earningVisible).toBe(true);
});

// Avoid - Tests internal details
test('api call is made with correct payload', async () => {
  // Tests implementation details
});
```

### 5. Keep Tests Independent

```typescript
// Good - Each test sets up its own data
test('search earnings', async ({ page }) => {
  await createTestEarning();
  await searchEarnings('query');
  expect(found).toBe(true);
});

// Avoid - Depends on previous test
test('search earnings', async ({ page }) => {
  // Assumes earnings created in previous test
});
```

### 6. Use Descriptive Test Names

```typescript
// Good
test('user can create an earning with valid data and see it in the list', async () => {

// Avoid
test('create test', async () => {
```

### 7. Handle Async Operations Properly

```typescript
// Good
await page.waitForURL('/dashboard');
await page.waitForLoadState('networkidle');

// Avoid
await new Promise(resolve => setTimeout(resolve, 1000)); // Magic number
```

### 8. Clean Up Test Data

```typescript
test.afterEach(async ({ page }) => {
  // Delete any test data created
  await page.goto('/dashboard');
  // Clean up logic...
});
```

## Test Maintenance

### Updating Selectors

When UI changes, update selectors in page objects:

```typescript
// Before
private emailInput = 'input#email';

// After
private emailInput = 'input[data-testid="email-input"]';
```

### Adding New Tests

1. Identify the user workflow
2. Choose the appropriate test file
3. Create test using page objects
4. Add to the test suite

Example:
```typescript
test('new workflow step', async ({ page }) => {
  const page = new FeaturePage(page);
  await page.navigate();
  await page.performAction();
  expect(result).toBe(expected);
});
```

### Test Review Checklist

- [ ] Test is independent and can run alone
- [ ] Test uses data attributes for selectors
- [ ] Test has descriptive name
- [ ] Test properly waits for elements
- [ ] Test cleans up after itself
- [ ] Test passes consistently (not flaky)
- [ ] Page objects used where applicable

## Troubleshooting

### Browser Crashes

```bash
# Run with verbose output
DEBUG=pw:api npm run test:e2e

# Use specific browser
npm run test:e2e:chrome
```

### Authentication Issues

```typescript
// Ensure cookies/storage persists
test.use({
  storageState: './auth.json', // Save auth state
});
```

### Slow Tests

```typescript
# Profile with trace
npx playwright test --trace on

# Analyze trace
npx playwright show-trace trace.zip
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## Support

For issues or questions:
1. Check test output and error messages
2. Review Playwright documentation
3. Run in debug mode: `npm run test:e2e:debug`
4. Check HTML report: `npm run test:e2e:report`
