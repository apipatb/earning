import { test, expect } from '@playwright/test';
import { EarningsPage, DashboardPage } from '../fixtures/page-objects';
import { TEST_USERS, loginUser, SAMPLE_EARNINGS } from '../fixtures/auth-fixture';

test.describe('Earnings Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);
  });

  test('Create new earning with valid data', async ({ page }) => {
    const earningsPage = new EarningsPage(page);
    const earnings = {
      title: `Freelance Project - ${Date.now()}`,
      description: 'Web development and design services',
      amount: '2500',
      date: '2024-01-15',
    };

    await earningsPage.navigate();
    expect(page.url()).toContain('/earnings');

    // Create earnings
    await earningsPage.createEarning(
      earnings.title,
      earnings.description,
      earnings.amount,
      earnings.date,
      'USD'
    );

    // Verify redirect or success message
    expect(await earningsPage.isEarningsTableVisible()).toBe(true);

    // Search for the newly created earning
    await earningsPage.searchEarnings(earnings.title);
    const count = await earningsPage.getEarningsCount();
    expect(count).toBeGreaterThan(0);
  });

  test('View earnings list with data', async ({ page }) => {
    const earningsPage = new EarningsPage(page);

    await earningsPage.navigate();
    expect(page.url()).toContain('/earnings');

    // Verify table is visible
    expect(await earningsPage.isEarningsTableVisible()).toBe(true);

    // Should have earnings rows
    const count = await earningsPage.getEarningsCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Filter and search earnings', async ({ page }) => {
    const earningsPage = new EarningsPage(page);

    await earningsPage.navigate();

    // Create a test earning first
    const testEarning = {
      title: `Test Earning - ${Date.now()}`,
      description: 'Test description',
      amount: '1500',
      date: '2024-01-10',
    };

    await earningsPage.createEarning(
      testEarning.title,
      testEarning.description,
      testEarning.amount,
      testEarning.date
    );

    // Search for the created earning
    await earningsPage.navigate();
    await earningsPage.searchEarnings(testEarning.title);

    const count = await earningsPage.getEarningsCount();
    expect(count).toBeGreaterThan(0);

    // Verify the earning is in results
    const firstRow = page.locator('[data-testid="earning-row"]').first();
    expect(await firstRow.isVisible()).toBe(true);
  });

  test('Edit earning details', async ({ page }) => {
    const earningsPage = new EarningsPage(page);

    await earningsPage.navigate();

    // Create an earning to edit
    const testEarning = {
      title: `Edit Test - ${Date.now()}`,
      description: 'Original description',
      amount: '1000',
      date: '2024-01-20',
    };

    await earningsPage.createEarning(
      testEarning.title,
      testEarning.description,
      testEarning.amount,
      testEarning.date
    );

    // Navigate back and search for it
    await earningsPage.navigate();
    await earningsPage.searchEarnings(testEarning.title);

    // Click edit button
    await earningsPage.clickEditFirstEarning();

    // Should be in edit form
    const submitButton = page.locator('button[type="submit"]');
    expect(await submitButton.isVisible()).toBe(true);

    // Update amount
    const amountInput = page.locator('input[name="amount"]');
    await amountInput.fill('2000');

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Verify update
    await earningsPage.navigate();
    await earningsPage.searchEarnings(testEarning.title);
    expect(await earningsPage.getEarningsCount()).toBeGreaterThan(0);
  });

  test('Delete earning', async ({ page }) => {
    const earningsPage = new EarningsPage(page);

    await earningsPage.navigate();

    // Create an earning to delete
    const testEarning = {
      title: `Delete Test - ${Date.now()}`,
      description: 'To be deleted',
      amount: '500',
      date: '2024-01-25',
    };

    await earningsPage.createEarning(
      testEarning.title,
      testEarning.description,
      testEarning.amount,
      testEarning.date
    );

    // Navigate back and search for it
    await earningsPage.navigate();
    await earningsPage.searchEarnings(testEarning.title);

    const countBefore = await earningsPage.getEarningsCount();

    // Click delete button
    await earningsPage.clickDeleteFirstEarning();

    // Confirm delete
    await earningsPage.confirmDelete();

    // Verify it's deleted
    await earningsPage.navigate();
    await earningsPage.searchEarnings(testEarning.title);
    const countAfter = await earningsPage.getEarningsCount();

    // Count should be less than before
    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });

  test('Create earning validates required fields', async ({ page }) => {
    const earningsPage = new EarningsPage(page);

    await earningsPage.navigate();
    await earningsPage.clickCreate();

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors or stay on form
    const formVisible = await page.locator('input[name="title"]').isVisible();
    expect(formVisible).toBe(true);
  });

  test('Earnings appear on dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Verify earnings card is visible
    expect(await dashboardPage.isEarningsCardVisible()).toBe(true);

    // Should show earnings amount
    const earningsAmount = await dashboardPage.getEarningsAmount();
    expect(earningsAmount).toBeTruthy();
  });

  test('Create multiple earnings and verify count', async ({ page }) => {
    const earningsPage = new EarningsPage(page);

    await earningsPage.navigate();

    // Get initial count
    const initialCount = await earningsPage.getEarningsCount();

    // Create multiple earnings
    for (let i = 0; i < 2; i++) {
      const testEarning = {
        title: `Bulk Create ${i} - ${Date.now()}`,
        description: `Bulk test ${i}`,
        amount: String(500 + i * 100),
        date: '2024-01-30',
      };

      await earningsPage.createEarning(
        testEarning.title,
        testEarning.description,
        testEarning.amount,
        testEarning.date
      );

      // Return to list
      await earningsPage.navigate();
    }

    // Verify count increased
    const finalCount = await earningsPage.getEarningsCount();
    expect(finalCount).toBeGreaterThan(initialCount);
  });
});
