import { Page, expect } from '@playwright/test';

/**
 * Base page object with common functionality
 */
export class BasePage {
  constructor(readonly page: Page) {}

  async goto(path: string) {
    await this.page.goto(path);
  }

  async waitForSelector(selector: string) {
    await this.page.waitForSelector(selector);
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }
}

/**
 * Login page object
 */
export class LoginPage extends BasePage {
  private emailInput = 'input[name="email"]';
  private passwordInput = 'input[name="password"]';
  private submitButton = 'button[type="submit"]';
  private errorMessage = '[data-testid="error-message"]';

  async navigate() {
    await this.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.submitButton);
  }

  async getErrorMessage(): Promise<string> {
    return this.page.locator(this.errorMessage).textContent() || '';
  }

  async isErrorMessageVisible(): Promise<boolean> {
    return this.isVisible(this.errorMessage);
  }

  async waitForDashboardRedirect() {
    await this.page.waitForURL('/dashboard', { timeout: 10000 });
  }
}

/**
 * Register page object
 */
export class RegisterPage extends BasePage {
  private firstNameInput = 'input[name="firstName"]';
  private lastNameInput = 'input[name="lastName"]';
  private emailInput = 'input[name="email"]';
  private passwordInput = 'input[name="password"]';
  private confirmPasswordInput = 'input[name="confirmPassword"]';
  private submitButton = 'button[type="submit"]';
  private errorMessage = '[data-testid="error-message"]';

  async navigate() {
    await this.goto('/register');
  }

  async fillRegistrationForm(firstName: string, lastName: string, email: string, password: string) {
    await this.page.fill(this.firstNameInput, firstName);
    await this.page.fill(this.lastNameInput, lastName);
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.fill(this.confirmPasswordInput, password);
  }

  async submit() {
    await this.page.click(this.submitButton);
  }

  async register(firstName: string, lastName: string, email: string, password: string) {
    await this.fillRegistrationForm(firstName, lastName, email, password);
    await this.submit();
  }

  async getErrorMessage(): Promise<string> {
    return this.page.locator(this.errorMessage).textContent() || '';
  }

  async isErrorMessageVisible(): Promise<boolean> {
    return this.isVisible(this.errorMessage);
  }

  async waitForLoginRedirect() {
    await this.page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
  }
}

/**
 * Dashboard page object
 */
export class DashboardPage extends BasePage {
  private earningsCard = '[data-testid="earnings-card"]';
  private invoicesCard = '[data-testid="invoices-card"]';
  private revenueChart = '[data-testid="revenue-chart"]';
  private summaryData = '[data-testid="summary-data"]';
  private createEarningButton = '[data-testid="create-earning-btn"]';
  private createInvoiceButton = '[data-testid="create-invoice-btn"]';
  private userMenu = '[data-testid="user-menu"]';
  private logoutButton = 'button:has-text("Logout")';

  async navigate() {
    await this.goto('/dashboard');
  }

  async isEarningsCardVisible(): Promise<boolean> {
    return this.isVisible(this.earningsCard);
  }

  async isInvoicesCardVisible(): Promise<boolean> {
    return this.isVisible(this.invoicesCard);
  }

  async isRevenueChartVisible(): Promise<boolean> {
    return this.isVisible(this.revenueChart);
  }

  async isSummaryDataVisible(): Promise<boolean> {
    return this.isVisible(this.summaryData);
  }

  async getEarningsAmount(): Promise<string> {
    return this.page.locator(`${this.earningsCard} [data-testid="total-amount"]`).textContent() || '';
  }

  async getInvoicesCount(): Promise<string> {
    return this.page.locator(`${this.invoicesCard} [data-testid="total-count"]`).textContent() || '';
  }

  async clickCreateEarning() {
    await this.page.click(this.createEarningButton);
  }

  async clickCreateInvoice() {
    await this.page.click(this.createInvoiceButton);
  }

  async logout() {
    await this.page.click(this.userMenu);
    await this.page.click(this.logoutButton);
    await this.page.waitForURL('/login');
  }

  async waitForChartToLoad() {
    await this.page.waitForSelector(`${this.revenueChart} canvas`, { timeout: 5000 });
  }

  async applyDateFilter(startDate: string, endDate: string) {
    await this.page.fill('[data-testid="start-date"]', startDate);
    await this.page.fill('[data-testid="end-date"]', endDate);
    await this.page.click('[data-testid="apply-filter"]');
    await this.page.waitForLoadState('networkidle');
  }
}

/**
 * Earnings page object
 */
export class EarningsPage extends BasePage {
  private createButton = '[data-testid="create-earning-btn"]';
  private titleInput = 'input[name="title"]';
  private descriptionInput = 'textarea[name="description"]';
  private amountInput = 'input[name="amount"]';
  private dateInput = 'input[name="date"]';
  private currencySelect = 'select[name="currency"]';
  private submitButton = 'button[type="submit"]';
  private earningsTable = '[data-testid="earnings-table"]';
  private searchInput = 'input[data-testid="search-earnings"]';
  private filterButton = '[data-testid="filter-btn"]';
  private editButton = '[data-testid="edit-earning-btn"]';
  private deleteButton = '[data-testid="delete-earning-btn"]';

  async navigate() {
    await this.goto('/earnings');
  }

  async clickCreate() {
    await this.page.click(this.createButton);
  }

  async fillEarningForm(title: string, description: string, amount: string, date: string) {
    await this.page.fill(this.titleInput, title);
    await this.page.fill(this.descriptionInput, description);
    await this.page.fill(this.amountInput, amount);
    await this.page.fill(this.dateInput, date);
  }

  async selectCurrency(currency: string) {
    await this.page.locator(this.currencySelect).selectOption(currency);
  }

  async submit() {
    await this.page.click(this.submitButton);
    await this.page.waitForLoadState('networkidle');
  }

  async createEarning(title: string, description: string, amount: string, date: string, currency: string = 'USD') {
    await this.clickCreate();
    await this.fillEarningForm(title, description, amount, date);
    await this.selectCurrency(currency);
    await this.submit();
  }

  async searchEarnings(query: string) {
    await this.page.fill(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async getEarningsCount(): Promise<number> {
    return this.page.locator('[data-testid="earning-row"]').count();
  }

  async clickEditFirstEarning() {
    await this.page.click(this.editButton);
  }

  async clickDeleteFirstEarning() {
    await this.page.click(this.deleteButton);
  }

  async confirmDelete() {
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForLoadState('networkidle');
  }

  async isEarningsTableVisible(): Promise<boolean> {
    return this.isVisible(this.earningsTable);
  }
}

/**
 * Invoices page object
 */
export class InvoicesPage extends BasePage {
  private createButton = '[data-testid="create-invoice-btn"]';
  private clientNameInput = 'input[name="clientName"]';
  private clientEmailInput = 'input[name="clientEmail"]';
  private invoiceNumberInput = 'input[name="invoiceNumber"]';
  private issueDateInput = 'input[name="issueDate"]';
  private dueDateInput = 'input[name="dueDate"]';
  private submitButton = 'button[type="submit"]';
  private invoicesTable = '[data-testid="invoices-table"]';
  private searchInput = 'input[data-testid="search-invoices"]';
  private downloadButton = '[data-testid="download-invoice-btn"]';
  private markPaidButton = '[data-testid="mark-paid-btn"]';
  private deleteButton = '[data-testid="delete-invoice-btn"]';

  async navigate() {
    await this.goto('/invoices');
  }

  async clickCreate() {
    await this.page.click(this.createButton);
  }

  async fillInvoiceForm(clientName: string, clientEmail: string, invoiceNumber: string, issueDate: string, dueDate: string) {
    await this.page.fill(this.clientNameInput, clientName);
    await this.page.fill(this.clientEmailInput, clientEmail);
    await this.page.fill(this.invoiceNumberInput, invoiceNumber);
    await this.page.fill(this.issueDateInput, issueDate);
    await this.page.fill(this.dueDateInput, dueDate);
  }

  async addLineItem(description: string, quantity: string, rate: string) {
    await this.page.click('[data-testid="add-line-item"]');
    await this.page.fill('[data-testid="line-item-description"]', description);
    await this.page.fill('[data-testid="line-item-quantity"]', quantity);
    await this.page.fill('[data-testid="line-item-rate"]', rate);
  }

  async submit() {
    await this.page.click(this.submitButton);
    await this.page.waitForLoadState('networkidle');
  }

  async searchInvoices(query: string) {
    await this.page.fill(this.searchInput, query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async getInvoicesCount(): Promise<number> {
    return this.page.locator('[data-testid="invoice-row"]').count();
  }

  async clickDownloadFirstInvoice() {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(this.downloadButton);
    return downloadPromise;
  }

  async clickMarkPaidFirstInvoice() {
    await this.page.click(this.markPaidButton);
  }

  async clickDeleteFirstInvoice() {
    await this.page.click(this.deleteButton);
  }

  async confirmDelete() {
    await this.page.click('[data-testid="confirm-delete"]');
    await this.page.waitForLoadState('networkidle');
  }

  async isInvoicesTableVisible(): Promise<boolean> {
    return this.isVisible(this.invoicesTable);
  }

  async getInvoiceStatus(index: number = 0): Promise<string> {
    return this.page.locator('[data-testid="invoice-status"]').nth(index).textContent() || '';
  }
}
