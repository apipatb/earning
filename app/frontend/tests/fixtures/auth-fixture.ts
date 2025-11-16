import { test as base, Page } from '@playwright/test';

/**
 * Test user credentials for E2E tests
 */
export const TEST_USERS = {
  newUser: {
    email: `test-user-${Date.now()}@example.com`,
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

/**
 * Sample data for earnings tests
 */
export const SAMPLE_EARNINGS = {
  valid: {
    title: 'Freelance Project',
    description: 'Web development project',
    amount: 1500,
    currency: 'USD',
    date: '2024-01-15',
    status: 'completed',
  },
  updated: {
    title: 'Updated Freelance Project',
    description: 'Updated web development project',
    amount: 2000,
    currency: 'USD',
    status: 'completed',
  },
};

/**
 * Sample data for invoices tests
 */
export const SAMPLE_INVOICES = {
  valid: {
    clientName: 'Acme Corp',
    clientEmail: 'contact@acme.com',
    invoiceNumber: `INV-${Date.now()}`,
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    lineItems: [
      {
        description: 'Web Development Services',
        quantity: 40,
        rate: 100,
        amount: 4000,
      },
      {
        description: 'UI/UX Design',
        quantity: 20,
        rate: 80,
        amount: 1600,
      },
    ],
    total: 5600,
  },
};

/**
 * Helper function to register a new user
 */
export async function registerUser(page: Page, userDetails: typeof TEST_USERS.newUser) {
  await page.goto('/register');

  await page.fill('input[name="firstName"]', userDetails.firstName);
  await page.fill('input[name="lastName"]', userDetails.lastName);
  await page.fill('input[name="email"]', userDetails.email);
  await page.fill('input[name="password"]', userDetails.password);
  await page.fill('input[name="confirmPassword"]', userDetails.password);

  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or login
  await page.waitForURL(/\/(dashboard|login)/);
}

/**
 * Helper function to login a user
 */
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Helper function to logout a user
 */
export async function logoutUser(page: Page) {
  // Look for logout button or menu
  const userMenuButton = page.locator('[data-testid="user-menu"]');
  if (await userMenuButton.isVisible()) {
    await userMenuButton.click();
    await page.click('text=Logout');
  }

  await page.waitForURL('/login');
}

/**
 * Helper function to check if user is authenticated
 */
export async function isUserAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    return !page.url().includes('/login');
  } catch {
    return false;
  }
}

export { expect } from '@playwright/test';
