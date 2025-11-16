# Playwright E2E Tests - Quick Start

## Installation

```bash
cd /home/user/earning/app/frontend

# Install Playwright browsers (one time)
npx playwright install
```

## Running Tests

### All Tests (All Browsers)
```bash
npm run test:e2e
```

### Single Browser
```bash
npm run test:e2e:chrome      # Chromium only
npm run test:e2e:firefox     # Firefox only
npm run test:e2e:webkit      # WebKit only
```

### Interactive Mode
```bash
npm run test:e2e:ui          # Visual test runner with timeline
```

### Debug Mode
```bash
npm run test:e2e:debug       # Step through tests line by line
```

### View Report
```bash
npm run test:e2e:report      # Open HTML report with results
```

## Advanced Commands

### Run Specific Test File
```bash
npx playwright test tests/e2e/auth.spec.ts
```

### Run Tests Matching Pattern
```bash
npx playwright test --grep "Login"
```

### Run Single Test
```bash
npx playwright test -t "Login with valid credentials"
```

### Run With Headed Browser (See What Happens)
```bash
npx playwright test --headed
```

### Single-Threaded (No Parallelization)
```bash
npx playwright test --workers=1
```

## Test Structure

```
tests/
├── e2e/                              # E2E test specifications
│   ├── auth.spec.ts                 # Authentication (9 tests)
│   ├── earnings.spec.ts             # Earnings CRUD (8 tests)
│   ├── invoices.spec.ts             # Invoice management (9 tests)
│   └── dashboard.spec.ts            # Dashboard widgets (9 tests)
└── fixtures/
    ├── auth-fixture.ts              # Test data and helpers
    └── page-objects.ts              # Page Object Models
```

## Test Coverage

### Authentication (9 core scenarios)
- User registration
- Login
- Logout
- Session persistence
- Protected routes
- Form validation
- Error handling

### Earnings (8 core scenarios)
- Create earnings
- View earnings list
- Search/filter earnings
- Edit earnings
- Delete earnings
- Dashboard integration

### Invoices (9 core scenarios)
- Create invoices with line items
- View invoice list
- Search invoices
- Mark as paid
- Download PDF
- Delete invoices
- Total calculations

### Dashboard (9 core scenarios)
- Load widgets
- Display charts
- Show summaries
- Apply filters
- Navigate to sub-pages
- Real-time updates

## Test Statistics

- **Total Tests**: 175 (35 scenarios × 5 browsers)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- **Code**: ~1,327 lines of test code
- **Page Objects**: 6 reusable page classes

## Typical Workflow

### 1. Write New Test
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../fixtures/page-objects';

test('user can login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login('user@example.com', 'password');
  expect(page.url()).toContain('/dashboard');
});
```

### 2. Run Single Test
```bash
npx playwright test -t "user can login"
```

### 3. Debug If Needed
```bash
npm run test:e2e:debug
```

### 4. View Results
```bash
npm run test:e2e:report
```

## Key Files

| File | Purpose |
|------|---------|
| `playwright.config.ts` | Main configuration |
| `tests/e2e/auth.spec.ts` | Authentication tests |
| `tests/e2e/earnings.spec.ts` | Earnings tests |
| `tests/e2e/invoices.spec.ts` | Invoice tests |
| `tests/e2e/dashboard.spec.ts` | Dashboard tests |
| `tests/fixtures/auth-fixture.ts` | Test data and helpers |
| `tests/fixtures/page-objects.ts` | Page Object Models |
| `E2E_TESTS_GUIDE.md` | Comprehensive guide |
| `PLAYWRIGHT_SETUP_SUMMARY.md` | Setup details |

## Troubleshooting

### Tests Won't Run
```bash
# Check Node version
node --version  # Should be 14+

# Verify Playwright
npx playwright --version

# Install browsers if missing
npx playwright install
```

### Timeout Issues
```bash
# Increase timeout globally in playwright.config.ts
# Or per test:
test('slow test', async ({ page }) => {
  // test code
}, { timeout: 60000 }); // 60 seconds
```

### Element Not Found
```bash
# Run in debug mode to inspect
npm run test:e2e:debug

# Or check selectors in page objects
# Most use data-testid attributes
```

### Flaky Tests
```bash
# Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="element"]');
```

## CI/CD Integration

### GitHub Actions
```yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npm run test:e2e
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: test-results/
```

### Environment Variables
```env
CI=true              # Run in CI mode
BASE_URL=http://your-url.com  # Custom URL
```

## Test Results

### Output Locations
- **HTML Report**: `test-results/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit XML**: `test-results/junit.xml`
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)
- **Traces**: `test-results/` (for debugging)

### View Report
```bash
npm run test:e2e:report
```

## Performance Tips

### Run Tests in Parallel (Default)
```bash
npm run test:e2e
# Runs multiple tests simultaneously
```

### Run Tests Sequentially
```bash
npx playwright test --workers=1
# Slower but useful for debugging
```

### Run Only Chromium (Faster)
```bash
npm run test:e2e:chrome
# Much faster than all browsers
```

## Documentation

For detailed information, see:
- **E2E_TESTS_GUIDE.md** - Complete testing guide
- **PLAYWRIGHT_SETUP_SUMMARY.md** - Setup and statistics
- **playwright.config.ts** - Configuration details

## Quick Links

- [Playwright Docs](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Support

### Debugging Commands
```bash
npm run test:e2e:debug          # Step through
npm run test:e2e:ui             # Visual runner
npm run test:e2e:report         # View results
npx playwright test --trace on  # Enable traces
```

### Useful Environment Variables
```bash
DEBUG=pw:api npm run test:e2e   # Verbose logging
BASE_URL=... npm run test:e2e    # Custom URL
PLAYWRIGHT_TIMEOUT=... npm test  # Custom timeout
```

## Summary

- **175 tests** ready to run
- **5 browsers** automatically tested
- **Page Objects** for easy maintenance
- **Rich reports** with screenshots/videos
- **CI/CD ready** with multiple reporters
- **Well documented** with guides
- **Best practices** throughout

Start testing: `npm run test:e2e`
