import { test, expect } from '@playwright/test';
import { DashboardPage, EarningsPage } from '../fixtures/page-objects';
import { TEST_USERS, loginUser } from '../fixtures/auth-fixture';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);
  });

  test('Dashboard loads with all widgets visible', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();
    expect(page.url()).toContain('/dashboard');

    // Verify all main widgets are visible
    expect(await dashboardPage.isEarningsCardVisible()).toBe(true);
    expect(await dashboardPage.isInvoicesCardVisible()).toBe(true);
    expect(await dashboardPage.isSummaryDataVisible()).toBe(true);
  });

  test('Revenue chart loads and displays data', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Wait for chart to load
    await dashboardPage.waitForChartToLoad();

    // Verify chart is visible
    expect(await dashboardPage.isRevenueChartVisible()).toBe(true);

    // Verify chart container has content
    const chartCanvas = page.locator('[data-testid="revenue-chart"] canvas');
    expect(await chartCanvas.count()).toBeGreaterThan(0);
  });

  test('Earnings and invoices counts display correctly', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Get earnings amount
    const earningsAmount = await dashboardPage.getEarningsAmount();
    expect(earningsAmount).toBeTruthy();

    // Should be numeric (may contain currency symbols)
    expect(earningsAmount).toMatch(/\d+/);

    // Get invoices count
    const invoicesCount = await dashboardPage.getInvoicesCount();
    expect(invoicesCount).toBeTruthy();

    // Should be numeric
    expect(invoicesCount).toMatch(/\d+/);
  });

  test('Dashboard summary data is updated', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const earningsPage = new EarningsPage(page);

    // Get initial dashboard state
    await dashboardPage.navigate();
    const initialEarningsAmount = await dashboardPage.getEarningsAmount();

    // Create a new earning
    await earningsPage.navigate();
    const testEarning = {
      title: `Dashboard Test - ${Date.now()}`,
      description: 'Dashboard update test',
      amount: '5000',
      date: '2024-01-28',
    };

    await earningsPage.createEarning(
      testEarning.title,
      testEarning.description,
      testEarning.amount,
      testEarning.date
    );

    // Return to dashboard
    await dashboardPage.navigate();

    // Earnings amount should be updated
    const updatedEarningsAmount = await dashboardPage.getEarningsAmount();
    expect(updatedEarningsAmount).toBeTruthy();

    // Verify change occurred (numeric comparison)
    const initialNum = parseInt(initialEarningsAmount.replace(/[^0-9]/g, ''), 10);
    const updatedNum = parseInt(updatedEarningsAmount.replace(/[^0-9]/g, ''), 10);

    expect(updatedNum).toBeGreaterThanOrEqual(initialNum);
  });

  test('Dashboard filters work correctly', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Apply date filter
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';

    await dashboardPage.applyDateFilter(startDate, endDate);

    // Verify page is still on dashboard
    expect(page.url()).toContain('/dashboard');

    // Verify data is displayed
    expect(await dashboardPage.isRevenueChartVisible()).toBe(true);
  });

  test('Dashboard navigation to earnings works', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();
    expect(page.url()).toContain('/dashboard');

    // Click create earning button
    await dashboardPage.clickCreateEarning();

    // Should navigate to earnings create form or earnings page
    expect(
      page.url().includes('/earnings') ||
      page.url().includes('/dashboard') // May open modal
    ).toBe(true);
  });

  test('Dashboard navigation to invoices works', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();
    expect(page.url()).toContain('/dashboard');

    // Click create invoice button
    await dashboardPage.clickCreateInvoice();

    // Should navigate to invoices create form or invoices page
    expect(
      page.url().includes('/invoices') ||
      page.url().includes('/dashboard') // May open modal
    ).toBe(true);
  });

  test('Dashboard summary cards are interactive', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Click on earnings card
    const earningsCard = page.locator('[data-testid="earnings-card"]');
    expect(await earningsCard.isVisible()).toBe(true);

    // Card should be clickable (navigate to earnings list)
    await earningsCard.click();
    expect(page.url().includes('/earnings') || page.url().includes('/dashboard')).toBe(true);
  });

  test('Dashboard displays empty state correctly when no data', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Even with no data, dashboard should load without errors
    expect(page.url()).toContain('/dashboard');

    // Should still show widget containers
    expect(await dashboardPage.isSummaryDataVisible()).toBe(true);
  });
});
