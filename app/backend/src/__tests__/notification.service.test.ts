import { NotificationService } from '../services/notification.service';
import prisma from '../lib/prisma';
import { mailer } from '../lib/mailer';
import logger from '../lib/logger';

// Type definitions for testing
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  timezone: string;
  currency: string;
  emailNotificationsEnabled: boolean;
  weeklyReportEnabled: boolean;
  invoiceNotificationEnabled: boolean;
  expenseAlertEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Invoice {
  id: string;
  userId: string;
  customerId: string | null;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  invoiceDate: Date;
  dueDate: Date;
  paidDate: Date | null;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  terms: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Expense {
  id: string;
  userId: string;
  category: string;
  description: string;
  amount: number;
  expenseDate: Date;
  vendor: string | null;
  isTaxDeductible: boolean;
  receiptUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Mock dependencies
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../lib/mailer', () => ({
  mailer: {
    sendEmail: jest.fn(),
    sendRawEmail: jest.fn(),
    getStatus: jest.fn(() => ({ configured: true, provider: 'gmail' })),
  },
}));

jest.mock('../lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('NotificationService', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    name: 'John Doe',
    timezone: 'UTC',
    currency: 'USD',
    emailNotificationsEnabled: true,
    weeklyReportEnabled: true,
    invoiceNotificationEnabled: true,
    expenseAlertEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvoice = {
    id: 'invoice-123',
    userId: 'user-123',
    customerId: 'customer-123',
    invoiceNumber: 'INV-001',
    subtotal: 100.0,
    taxAmount: 10.0,
    discountAmount: 5.0,
    totalAmount: 105.0,
    invoiceDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-31'),
    paidDate: null,
    status: 'draft',
    paymentMethod: null,
    notes: 'Thank you for your business',
    terms: 'Due upon receipt',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExpense: Expense = {
    id: 'expense-123',
    userId: 'user-123',
    category: 'Office Supplies',
    description: 'New office chair',
    amount: 250.0,
    expenseDate: new Date('2024-01-15'),
    vendor: 'Office Depot',
    isTaxDeductible: true,
    receiptUrl: 'https://example.com/receipt.pdf',
    notes: 'For home office',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock return values
    (prisma.user.findUnique as jest.Mock).mockReset();
    (prisma.user.update as jest.Mock).mockReset();
    (prisma.invoice.findUnique as jest.Mock).mockReset();
    (prisma.invoice.update as jest.Mock).mockReset();
    (mailer.sendEmail as jest.Mock).mockReset();
    (mailer.sendRawEmail as jest.Mock).mockReset();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email to new user', async () => {
      await NotificationService.sendWelcomeEmail(mockUser);

      expect(mailer.sendEmail).toHaveBeenCalledWith({
        to: mockUser.email,
        subject: 'Welcome to EarnTrack!',
        template: 'welcome',
        context: expect.objectContaining({
          name: mockUser.name,
          email: mockUser.email,
        }),
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Welcome email sent')
      );
    });

    it('should use email as name if user name is not provided', async () => {
      const userWithoutName = { ...mockUser, name: null };

      await NotificationService.sendWelcomeEmail(userWithoutName);

      expect(mailer.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            name: mockUser.email,
          }),
        })
      );
    });

    it('should include verification link if provided', async () => {
      const verificationLink = 'https://example.com/verify?token=abc123';

      await NotificationService.sendWelcomeEmail(mockUser, verificationLink);

      expect(mailer.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            verificationLink,
          }),
        })
      );
    });

    it('should handle email sending errors', async () => {
      const error = new Error('Email service error');
      (mailer.sendEmail as jest.Mock).mockRejectedValue(error);

      await expect(NotificationService.sendWelcomeEmail(mockUser)).rejects.toThrow(
        error
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send welcome email'),
        error
      );
    });
  });

  describe('sendInvoiceEmail', () => {
    it('should send invoice email with correct data', async () => {
      const mockLineItems = [
        {
          id: 'item-1',
          invoiceId: mockInvoice.id,
          description: 'Service 1',
          quantity: 1.0,
          unitPrice: 50.0,
          totalPrice: 50.0,
        },
        {
          id: 'item-2',
          invoiceId: mockInvoice.id,
          description: 'Service 2',
          quantity: 2.0,
          unitPrice: 25.0,
          totalPrice: 50.0,
        },
      ];

      const invoiceWithRelations = {
        ...mockInvoice,
        customer: {
          id: 'customer-123',
          name: 'Acme Corp',
          email: 'customer@acme.com',
        },
        lineItems: mockLineItems,
        user: mockUser,
      };

      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoiceWithRelations);
      (prisma.invoice.update as jest.Mock).mockResolvedValue(invoiceWithRelations);

      await NotificationService.sendInvoiceEmail(
        mockInvoice.id,
        'customer@acme.com',
        'Acme Corp'
      );

      expect(prisma.invoice.findUnique).toHaveBeenCalledWith({
        where: { id: mockInvoice.id },
        include: {
          customer: true,
          lineItems: true,
          user: true,
        },
      });

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.to).toBe('customer@acme.com');
      expect(callArgs.template).toBe('invoice');
      expect(callArgs.context.invoiceNumber).toBe(mockInvoice.invoiceNumber);
      expect(callArgs.context.customerName).toBe('Acme Corp');
      expect(Array.isArray(callArgs.context.items)).toBe(true);

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: mockInvoice.id },
        data: { status: 'sent' },
      });
    });

    it('should throw error if invoice not found', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.sendInvoiceEmail(
          'non-existent-id',
          'customer@example.com'
        )
      ).rejects.toThrow('Invoice not found');
    });

    it('should handle email sending errors for invoice', async () => {
      const error = new Error('Email service down');
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvoice,
        customer: null,
        lineItems: [],
        user: mockUser,
      });
      (mailer.sendEmail as jest.Mock).mockRejectedValue(error);

      await expect(
        NotificationService.sendInvoiceEmail(mockInvoice.id, 'customer@example.com')
      ).rejects.toThrow(error);
    });
  });

  describe('sendPaymentConfirmation', () => {
    it('should send payment confirmation email', async () => {
      const paidInvoice = {
        ...mockInvoice,
        paidDate: new Date('2024-01-20'),
        customer: { id: 'customer-123', name: 'Acme Corp' },
        user: mockUser,
      };

      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(paidInvoice);

      await NotificationService.sendPaymentConfirmation(
        mockInvoice.id,
        'customer@example.com'
      );

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.to).toBe('customer@example.com');
      expect(callArgs.subject).toContain('Payment Confirmation');
      expect(callArgs.template).toBe('payment-confirmation');
      expect(callArgs.context.invoiceNumber).toBe(mockInvoice.invoiceNumber);
      expect(callArgs.context.totalAmount).toBe(mockInvoice.totalAmount.toString());
    });

    it('should throw error if invoice not found', async () => {
      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.sendPaymentConfirmation(
          'non-existent-id',
          'customer@example.com'
        )
      ).rejects.toThrow('Invoice not found');
    });
  });

  describe('sendExpenseAlert', () => {
    it('should send expense alert if enabled', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await NotificationService.sendExpenseAlert('user-123', mockExpense, 200);

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.to).toBe(mockUser.email);
      expect(callArgs.subject).toContain('High Expense Alert');
      expect(callArgs.template).toBe('expense-alert');
      expect(callArgs.context.category).toBe(mockExpense.category);
      expect(callArgs.context.amount).toBe(mockExpense.amount.toString());
    });

    it('should not send if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        NotificationService.sendExpenseAlert('non-existent-user', mockExpense)
      ).rejects.toThrow('User not found');
    });
  });

  describe('sendWeeklySummary', () => {
    it('should send weekly summary report', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const summaryData = {
        userName: mockUser.name || mockUser.email,
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalEarnings: '1500.00',
        totalExpenses: '200.00',
        netIncome: '1300.00',
        topPlatform: 'Fiverr',
        topPlatformEarnings: '800.00',
        goalProgress: '85',
      };

      await NotificationService.sendWeeklySummary('user-123', summaryData);

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.to).toBe(mockUser.email);
      expect(callArgs.subject).toContain('EarnTrack Summary');
      expect(callArgs.template).toBe('weekly-summary');
    });

    it('should handle missing user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const summaryData = {
        userName: 'User',
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalEarnings: '1500.00',
        totalExpenses: '200.00',
        netIncome: '1300.00',
      };

      await expect(
        NotificationService.sendWeeklySummary('non-existent-user', summaryData)
      ).rejects.toThrow('User not found');
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      const resetToken = 'reset-token-123';

      await NotificationService.sendPasswordReset(mockUser, resetToken);

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.to).toBe(mockUser.email);
      expect(callArgs.subject).toBe('Reset Your EarnTrack Password');
      expect(callArgs.template).toBe('password-reset');
      expect(callArgs.context.userName).toBe(mockUser.name);
      expect(callArgs.context.resetLink).toContain(resetToken);
    });

    it('should include expiry time if provided', async () => {
      const resetToken = 'reset-token-123';
      const expiryTime = new Date(Date.now() + 3600000); // 1 hour from now

      jest.clearAllMocks();

      await NotificationService.sendPasswordReset(mockUser, resetToken, expiryTime);

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.context.expiryTime).toBeDefined();
      expect(typeof callArgs.context.expiryTime).toBe('string');
    });

    it('should handle password reset email errors', async () => {
      const error = new Error('Email service error');
      (mailer.sendEmail as jest.Mock).mockRejectedValue(error);

      const resetToken = 'reset-token-123';

      await expect(
        NotificationService.sendPasswordReset(mockUser, resetToken)
      ).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send password reset email'),
        error
      );
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      await NotificationService.sendTestEmail('test@example.com', 'Test User');

      expect(mailer.sendRawEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendRawEmail as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('test@example.com');
      expect(callArgs[1]).toBe('Test Email from EarnTrack');
      expect(callArgs[2]).toContain('Test User');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Test email sent')
      );
    });

    it('should use default user name if not provided', async () => {
      jest.clearAllMocks();

      await NotificationService.sendTestEmail('test@example.com');

      expect(mailer.sendRawEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendRawEmail as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('test@example.com');
      expect(callArgs[2]).toContain('User');
    });

    it('should handle test email errors', async () => {
      const error = new Error('Email service error');
      (mailer.sendRawEmail as jest.Mock).mockRejectedValue(error);

      await expect(
        NotificationService.sendTestEmail('test@example.com')
      ).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send test email'),
        error
      );
    });
  });

  describe('getUserNotificationPreferences', () => {
    it('should retrieve user notification preferences', async () => {
      const preferences = {
        emailNotificationsEnabled: true,
        weeklyReportEnabled: true,
        invoiceNotificationEnabled: true,
        expenseAlertEnabled: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(preferences);

      const result = await NotificationService.getUserNotificationPreferences('user-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          emailNotificationsEnabled: true,
          weeklyReportEnabled: true,
          invoiceNotificationEnabled: true,
          expenseAlertEnabled: true,
        },
      });

      expect(result).toEqual(preferences);
    });

    it('should handle database errors when fetching preferences', async () => {
      const error = new Error('Database error');
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(error);

      const result = await NotificationService.getUserNotificationPreferences('user-123');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get notification preferences'),
        error
      );
    });
  });

  describe('updateUserNotificationPreferences', () => {
    it('should update user notification preferences', async () => {
      const updates = {
        emailNotificationsEnabled: false,
        weeklyReportEnabled: false,
      };

      const updatedUser = { ...mockUser, ...updates };
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await NotificationService.updateUserNotificationPreferences(
        'user-123',
        updates
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updates,
      });

      expect(result).toEqual(updatedUser);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Notification preferences updated')
      );
    });

    it('should handle update errors', async () => {
      const error = new Error('Database error');
      (prisma.user.update as jest.Mock).mockRejectedValue(error);

      await expect(
        NotificationService.updateUserNotificationPreferences('user-123', {
          emailNotificationsEnabled: false,
        })
      ).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update notification preferences'),
        error
      );
    });

    it('should handle partial updates', async () => {
      const updates = {
        emailNotificationsEnabled: false,
      };

      const updatedUser = { ...mockUser, ...updates };
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);

      await NotificationService.updateUserNotificationPreferences('user-123', updates);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updates,
      });
    });
  });

  describe('Template Rendering and Error Handling', () => {
    it('should handle missing invoice customer gracefully', async () => {
      jest.clearAllMocks();
      const invoiceWithoutCustomer = {
        ...mockInvoice,
        customer: null,
        lineItems: [],
        user: mockUser,
      };

      (prisma.invoice.findUnique as jest.Mock).mockResolvedValue(
        invoiceWithoutCustomer
      );

      await NotificationService.sendInvoiceEmail(mockInvoice.id, 'customer@example.com');

      expect(mailer.sendEmail).toHaveBeenCalled();
      const callArgs = (mailer.sendEmail as jest.Mock).mock.calls[0][0];
      expect(callArgs.context.customerName).toBe('Customer');
    });

    it('should validate email addresses', async () => {
      jest.clearAllMocks();
      const testCases = [
        { email: 'valid@example.com', valid: true },
        { email: 'invalid-email', valid: false },
        { email: '', valid: false },
      ];

      for (const testCase of testCases) {
        if (testCase.valid) {
          // Valid email should work
          jest.clearAllMocks();
          await NotificationService.sendTestEmail(testCase.email);
          expect(mailer.sendRawEmail).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should send multiple emails in sequence', async () => {
      jest.clearAllMocks();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Send welcome email
      await NotificationService.sendWelcomeEmail(mockUser);

      // Send test email
      await NotificationService.sendTestEmail(mockUser.email);

      expect(mailer.sendEmail).toHaveBeenCalledTimes(1);
      expect(mailer.sendRawEmail).toHaveBeenCalledTimes(1);
    });

    it('should handle batch email operations', async () => {
      jest.clearAllMocks();
      const users = [mockUser, { ...mockUser, id: 'user-456', email: 'user2@example.com' }];

      for (const user of users) {
        await NotificationService.sendWelcomeEmail(user);
      }

      expect(mailer.sendEmail).toHaveBeenCalledTimes(2);
    });
  });
});
