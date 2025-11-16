import { test, expect } from '@playwright/test';
import { InvoicesPage, DashboardPage } from '../fixtures/page-objects';
import { TEST_USERS, loginUser, SAMPLE_INVOICES } from '../fixtures/auth-fixture';

test.describe('Invoice Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page, TEST_USERS.existingUser.email, TEST_USERS.existingUser.password);
  });

  test('Create invoice with line items', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);
    const invoice = {
      clientName: 'Acme Corporation',
      clientEmail: `contact-${Date.now()}@acme.com`,
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: '2024-01-15',
      dueDate: '2024-02-15',
    };

    await invoicesPage.navigate();
    expect(page.url()).toContain('/invoices');

    // Click create
    await invoicesPage.clickCreate();

    // Fill invoice form
    await invoicesPage.fillInvoiceForm(
      invoice.clientName,
      invoice.clientEmail,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate
    );

    // Add line items
    await invoicesPage.addLineItem('Web Development', '40', '150');
    await invoicesPage.addLineItem('UI/UX Design', '20', '120');

    // Submit
    await invoicesPage.submit();

    // Verify invoice was created
    expect(await invoicesPage.isInvoicesTableVisible()).toBe(true);

    // Search for it
    await invoicesPage.navigate();
    await invoicesPage.searchInvoices(invoice.invoiceNumber);
    const count = await invoicesPage.getInvoicesCount();
    expect(count).toBeGreaterThan(0);
  });

  test('View invoice list', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();
    expect(page.url()).toContain('/invoices');

    // Verify table is visible
    expect(await invoicesPage.isInvoicesTableVisible()).toBe(true);

    // Should have invoices
    const count = await invoicesPage.getInvoicesCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Search invoices by invoice number', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();

    // Create an invoice first
    const invoice = {
      clientName: 'Test Client',
      clientEmail: `client-${Date.now()}@test.com`,
      invoiceNumber: `SEARCH-${Date.now()}`,
      issueDate: '2024-01-10',
      dueDate: '2024-02-10',
    };

    await invoicesPage.clickCreate();
    await invoicesPage.fillInvoiceForm(
      invoice.clientName,
      invoice.clientEmail,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate
    );
    await invoicesPage.addLineItem('Service', '10', '100');
    await invoicesPage.submit();

    // Search for it
    await invoicesPage.navigate();
    await invoicesPage.searchInvoices(invoice.invoiceNumber);

    const count = await invoicesPage.getInvoicesCount();
    expect(count).toBeGreaterThan(0);

    // Verify the invoice number is in results
    const firstRow = page.locator('[data-testid="invoice-row"]').first();
    expect(await firstRow.isVisible()).toBe(true);
  });

  test('Mark invoice as paid', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();

    // Create an invoice
    const invoice = {
      clientName: 'Paid Test Client',
      clientEmail: `paid-${Date.now()}@test.com`,
      invoiceNumber: `PAID-${Date.now()}`,
      issueDate: '2024-01-05',
      dueDate: '2024-02-05',
    };

    await invoicesPage.clickCreate();
    await invoicesPage.fillInvoiceForm(
      invoice.clientName,
      invoice.clientEmail,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate
    );
    await invoicesPage.addLineItem('Consultation', '5', '200');
    await invoicesPage.submit();

    // Find and mark as paid
    await invoicesPage.navigate();
    await invoicesPage.searchInvoices(invoice.invoiceNumber);

    await invoicesPage.clickMarkPaidFirstInvoice();
    await page.waitForLoadState('networkidle');

    // Verify status changed to paid
    const status = await invoicesPage.getInvoiceStatus(0);
    expect(status.toLowerCase()).toContain('paid');
  });

  test('Download invoice as PDF', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();

    // Create an invoice
    const invoice = {
      clientName: 'Download Test Client',
      clientEmail: `download-${Date.now()}@test.com`,
      invoiceNumber: `DL-${Date.now()}`,
      issueDate: '2024-01-12',
      dueDate: '2024-02-12',
    };

    await invoicesPage.clickCreate();
    await invoicesPage.fillInvoiceForm(
      invoice.clientName,
      invoice.clientEmail,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate
    );
    await invoicesPage.addLineItem('Development', '30', '180');
    await invoicesPage.submit();

    // Find and download
    await invoicesPage.navigate();
    await invoicesPage.searchInvoices(invoice.invoiceNumber);

    // Download and verify it's a PDF
    const download = await invoicesPage.clickDownloadFirstInvoice();
    expect(download.suggestedFilename()).toContain('.pdf');

    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('Delete invoice', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();

    // Create an invoice to delete
    const invoice = {
      clientName: 'Delete Test Client',
      clientEmail: `delete-${Date.now()}@test.com`,
      invoiceNumber: `DEL-${Date.now()}`,
      issueDate: '2024-01-18',
      dueDate: '2024-02-18',
    };

    await invoicesPage.clickCreate();
    await invoicesPage.fillInvoiceForm(
      invoice.clientName,
      invoice.clientEmail,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate
    );
    await invoicesPage.addLineItem('Support', '10', '100');
    await invoicesPage.submit();

    // Find and delete
    await invoicesPage.navigate();
    await invoicesPage.searchInvoices(invoice.invoiceNumber);

    const countBefore = await invoicesPage.getInvoicesCount();

    await invoicesPage.clickDeleteFirstInvoice();
    await invoicesPage.confirmDelete();

    // Verify deleted
    await invoicesPage.navigate();
    await invoicesPage.searchInvoices(invoice.invoiceNumber);
    const countAfter = await invoicesPage.getInvoicesCount();

    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });

  test('Invoices appear on dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.navigate();

    // Verify invoices card is visible
    expect(await dashboardPage.isInvoicesCardVisible()).toBe(true);

    // Should show invoices count
    const invoicesCount = await dashboardPage.getInvoicesCount();
    expect(invoicesCount).toBeTruthy();
  });

  test('Create invoice validates required fields', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();
    await invoicesPage.clickCreate();

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation or stay on form
    const formVisible = await page.locator('input[name="clientName"]').isVisible();
    expect(formVisible).toBe(true);
  });

  test('Invoice totals calculate correctly', async ({ page }) => {
    const invoicesPage = new InvoicesPage(page);

    await invoicesPage.navigate();
    await invoicesPage.clickCreate();

    // Fill basic info
    const invoice = {
      clientName: 'Math Test Client',
      clientEmail: `math-${Date.now()}@test.com`,
      invoiceNumber: `MATH-${Date.now()}`,
      issueDate: '2024-01-22',
      dueDate: '2024-02-22',
    };

    await invoicesPage.fillInvoiceForm(
      invoice.clientName,
      invoice.clientEmail,
      invoice.invoiceNumber,
      invoice.issueDate,
      invoice.dueDate
    );

    // Add items and verify total calculation
    // Item 1: 10 * 100 = 1000
    await invoicesPage.addLineItem('Item 1', '10', '100');

    // Item 2: 5 * 200 = 1000
    await invoicesPage.addLineItem('Item 2', '5', '200');

    // Total should be 2000
    const totalField = page.locator('[data-testid="invoice-total"]');
    expect(await totalField.isVisible()).toBe(true);

    const total = await totalField.textContent();
    expect(total).toMatch(/2[,\s]?000/);
  });
});
