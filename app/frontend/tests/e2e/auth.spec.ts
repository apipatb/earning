import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage, DashboardPage } from '../fixtures/page-objects';
import { TEST_USERS, loginUser, logoutUser } from '../fixtures/auth-fixture';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app before each test
    await page.goto('/');
  });

  test('User registration with valid data', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const newUser = {
      firstName: 'John',
      lastName: 'Doe',
      email: `john-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    };

    await registerPage.navigate();
    expect(page.url()).toContain('/register');

    await registerPage.register(newUser.firstName, newUser.lastName, newUser.email, newUser.password);

    // Should redirect after successful registration
    await registerPage.waitForLoginRedirect();
    expect(page.url()).toMatch(/\/(dashboard|login)/);
  });

  test('Registration with mismatched passwords shows error', async ({ page }) => {
    const registerPage = new RegisterPage(page);
    const newUser = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: `jane-${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'DifferentPassword123!',
    };

    await registerPage.navigate();
    await page.fill('input[name="firstName"]', newUser.firstName);
    await page.fill('input[name="lastName"]', newUser.lastName);
    await page.fill('input[name="email"]', newUser.email);
    await page.fill('input[name="password"]', newUser.password);
    await page.fill('input[name="confirmPassword"]', newUser.confirmPassword);

    await page.click('button[type="submit"]');

    // Should show error message
    const errorVisible = await registerPage.isErrorMessageVisible();
    expect(errorVisible).toBe(true);
  });

  test('Login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = TEST_USERS.existingUser.email;
    const password = TEST_USERS.existingUser.password;

    await loginPage.navigate();
    expect(page.url()).toContain('/login');

    await loginPage.login(email, password);

    // Should redirect to dashboard
    await loginPage.waitForDashboardRedirect();
    expect(page.url()).toContain('/dashboard');
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = TEST_USERS.invalidUser.email;
    const password = TEST_USERS.invalidUser.password;

    await loginPage.navigate();
    expect(page.url()).toContain('/login');

    await loginPage.login(email, password);

    // Should show error message and stay on login page
    const errorVisible = await loginPage.isErrorMessageVisible();
    expect(errorVisible).toBe(true);
    expect(page.url()).toContain('/login');
  });

  test('Session persistence after page refresh', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // Login first
    await loginUser(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);
    await dashboardPage.navigate();

    // Verify dashboard is accessible
    expect(await dashboardPage.isEarningsCardVisible()).toBe(true);

    // Refresh page
    await page.reload();

    // Should still be on dashboard (session persisted)
    expect(page.url()).toContain('/dashboard');
    expect(await dashboardPage.isEarningsCardVisible()).toBe(true);
  });

  test('Logout clears session and redirects to login', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    // Login first
    await loginUser(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);
    await dashboardPage.navigate();

    expect(page.url()).toContain('/dashboard');

    // Logout
    await dashboardPage.logout();

    // Should be on login page
    expect(page.url()).toContain('/login');

    // Should not be able to access dashboard
    await page.goto('/dashboard');
    expect(page.url()).toContain('/login');
  });

  test('Protected routes redirect to login when not authenticated', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Should redirect to login
    expect(page.url()).toContain('/login');

    // Try to access earnings
    await page.goto('/earnings', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/login');

    // Try to access invoices
    await page.goto('/invoices', { waitUntil: 'networkidle' });
    expect(page.url()).toContain('/login');
  });

  test('Registration form validates required fields', async ({ page }) => {
    const registerPage = new RegisterPage(page);

    await registerPage.navigate();

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should not redirect and form should show validation
    expect(page.url()).toContain('/register');
  });

  test('Login form validates email format', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.navigate();

    // Fill with invalid email
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should show validation error
    expect(page.url()).toContain('/login');
  });
});
