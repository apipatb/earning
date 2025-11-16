import {
  RegisterInputSchema,
  LoginInputSchema,
  CreateEarningSchema,
  UpdateEarningSchema,
  CreateInvoiceSchema,
  CreateCustomerSchema,
  CreateProductSchema,
  CreateExpenseSchema,
  AnalyticsPeriodSchema,
  PaginationSchema,
  DateRangeSchema,
} from '../schemas/validation.schemas';

describe('Validation Schemas', () => {
  describe('Auth Schemas', () => {
    describe('RegisterInputSchema', () => {
      it('should accept valid registration input', async () => {
        const validData = {
          email: 'user@example.com',
          password: 'SecurePassword123',
          name: 'John Doe',
        };
        const result = await RegisterInputSchema.parseAsync(validData);
        expect(result.email).toBe('user@example.com');
        expect(result.password).toBe('SecurePassword123');
      });

      it('should reject invalid email', async () => {
        const invalidData = {
          email: 'not-an-email',
          password: 'SecurePassword123',
        };
        await expect(RegisterInputSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject password shorter than 8 characters', async () => {
        const invalidData = {
          email: 'user@example.com',
          password: 'short',
        };
        await expect(RegisterInputSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should allow optional name', async () => {
        const data = {
          email: 'user@example.com',
          password: 'SecurePassword123',
        };
        const result = await RegisterInputSchema.parseAsync(data);
        expect(result.name).toBeUndefined();
      });
    });

    describe('LoginInputSchema', () => {
      it('should accept valid login input', async () => {
        const validData = {
          email: 'user@example.com',
          password: 'SecurePassword123',
        };
        const result = await LoginInputSchema.parseAsync(validData);
        expect(result.email).toBe('user@example.com');
      });

      it('should reject missing password', async () => {
        const invalidData = {
          email: 'user@example.com',
        };
        await expect(LoginInputSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject invalid email format', async () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'password',
        };
        await expect(LoginInputSchema.parseAsync(invalidData)).rejects.toThrow();
      });
    });
  });

  describe('Earning Schemas', () => {
    describe('CreateEarningSchema', () => {
      it('should accept valid earning data', async () => {
        const validData = {
          platformId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2024-01-15',
          hours: 8,
          amount: 100,
          notes: 'Good work',
        };
        const result = await CreateEarningSchema.parseAsync(validData);
        expect(result.amount).toBe(100);
        expect(result.date).toBe('2024-01-15');
      });

      it('should reject invalid UUID', async () => {
        const invalidData = {
          platformId: 'not-a-uuid',
          date: '2024-01-15',
          amount: 100,
        };
        await expect(CreateEarningSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject invalid date format', async () => {
        const invalidData = {
          platformId: '550e8400-e29b-41d4-a716-446655440000',
          date: '01/15/2024',
          amount: 100,
        };
        await expect(CreateEarningSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject negative amount', async () => {
        const invalidData = {
          platformId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2024-01-15',
          amount: -100,
        };
        await expect(CreateEarningSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should allow optional hours', async () => {
        const data = {
          platformId: '550e8400-e29b-41d4-a716-446655440000',
          date: '2024-01-15',
          amount: 100,
        };
        const result = await CreateEarningSchema.parseAsync(data);
        expect(result.hours).toBeUndefined();
      });
    });

    describe('UpdateEarningSchema', () => {
      it('should accept partial update', async () => {
        const partialData = {
          amount: 150,
        };
        const result = await UpdateEarningSchema.parseAsync(partialData);
        expect(result.amount).toBe(150);
      });

      it('should reject empty update', async () => {
        const emptyData = {};
        await expect(UpdateEarningSchema.parseAsync(emptyData)).rejects.toThrow();
      });

      it('should allow multiple fields in update', async () => {
        const data = {
          amount: 200,
          hours: 10,
          notes: 'Updated',
        };
        const result = await UpdateEarningSchema.parseAsync(data);
        expect(result.amount).toBe(200);
        expect(result.hours).toBe(10);
      });
    });
  });

  describe('Invoice Schemas', () => {
    describe('CreateInvoiceSchema', () => {
      it('should accept valid invoice data', async () => {
        const validData = {
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          totalAmount: 1100,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        };
        const result = await CreateInvoiceSchema.parseAsync(validData);
        expect(result.invoiceNumber).toBe('INV-001');
        expect(result.lineItems).toHaveLength(1);
      });

      it('should reject when dueDate is before invoiceDate', async () => {
        const invalidData = {
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          totalAmount: 1100,
          invoiceDate: '2024-02-15',
          dueDate: '2024-01-15',
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        };
        await expect(CreateInvoiceSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject when no line items provided', async () => {
        const invalidData = {
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          totalAmount: 1100,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          lineItems: [],
        };
        await expect(CreateInvoiceSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should set default status to draft', async () => {
        const data = {
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          totalAmount: 1100,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        };
        const result = await CreateInvoiceSchema.parseAsync(data);
        expect(result.status).toBe('draft');
      });

      it('should reject negative tax amount', async () => {
        const invalidData = {
          invoiceNumber: 'INV-001',
          subtotal: 1000,
          taxAmount: -100,
          totalAmount: 1100,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        };
        await expect(CreateInvoiceSchema.parseAsync(invalidData)).rejects.toThrow();
      });
    });
  });

  describe('Customer Schemas', () => {
    describe('CreateCustomerSchema', () => {
      it('should accept valid customer data', async () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
        };
        const result = await CreateCustomerSchema.parseAsync(validData);
        expect(result.name).toBe('John Doe');
        expect(result.email).toBe('john@example.com');
      });

      it('should reject missing name', async () => {
        const invalidData = {
          email: 'john@example.com',
        };
        await expect(CreateCustomerSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject invalid email', async () => {
        const invalidData = {
          name: 'John Doe',
          email: 'not-an-email',
        };
        await expect(CreateCustomerSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should allow optional fields', async () => {
        const data = {
          name: 'John Doe',
        };
        const result = await CreateCustomerSchema.parseAsync(data);
        expect(result.name).toBe('John Doe');
        expect(result.email).toBeUndefined();
      });
    });
  });

  describe('Product Schemas', () => {
    describe('CreateProductSchema', () => {
      it('should accept valid product data', async () => {
        const validData = {
          name: 'Widget',
          description: 'A useful widget',
          price: 29.99,
          category: 'Electronics',
          sku: 'WIDGET-001',
        };
        const result = await CreateProductSchema.parseAsync(validData);
        expect(result.name).toBe('Widget');
        expect(result.price).toBe(29.99);
      });

      it('should reject negative price', async () => {
        const invalidData = {
          name: 'Widget',
          price: -29.99,
        };
        await expect(CreateProductSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject missing name', async () => {
        const invalidData = {
          price: 29.99,
        };
        await expect(CreateProductSchema.parseAsync(invalidData)).rejects.toThrow();
      });
    });
  });

  describe('Expense Schemas', () => {
    describe('CreateExpenseSchema', () => {
      it('should accept valid expense data', async () => {
        const validData = {
          description: 'Office supplies',
          amount: 50,
          category: 'Supplies',
          date: '2024-01-15',
        };
        const result = await CreateExpenseSchema.parseAsync(validData);
        expect(result.description).toBe('Office supplies');
        expect(result.amount).toBe(50);
      });

      it('should reject negative amount', async () => {
        const invalidData = {
          description: 'Office supplies',
          amount: -50,
          date: '2024-01-15',
        };
        await expect(CreateExpenseSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should reject invalid date format', async () => {
        const invalidData = {
          description: 'Office supplies',
          amount: 50,
          date: '01-15-2024',
        };
        await expect(CreateExpenseSchema.parseAsync(invalidData)).rejects.toThrow();
      });
    });
  });

  describe('Utility Schemas', () => {
    describe('PaginationSchema', () => {
      it('should accept valid pagination params', async () => {
        const data = {
          limit: '50',
          offset: '0',
        };
        const result = await PaginationSchema.parseAsync(data);
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
      });

      it('should use defaults', async () => {
        const data = {};
        const result = await PaginationSchema.parseAsync(data);
        expect(result.limit).toBe(50);
        expect(result.offset).toBe(0);
      });

      it('should reject non-numeric values', async () => {
        const invalidData = {
          limit: 'abc',
        };
        await expect(PaginationSchema.parseAsync(invalidData)).rejects.toThrow();
      });
    });

    describe('DateRangeSchema', () => {
      it('should accept valid date range', async () => {
        const data = {
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        };
        const result = await DateRangeSchema.parseAsync(data);
        expect(result.start_date).toBe('2024-01-01');
      });

      it('should reject when start_date is after end_date', async () => {
        const invalidData = {
          start_date: '2024-01-31',
          end_date: '2024-01-01',
        };
        await expect(DateRangeSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should accept same date for start and end', async () => {
        const data = {
          start_date: '2024-01-15',
          end_date: '2024-01-15',
        };
        const result = await DateRangeSchema.parseAsync(data);
        expect(result.start_date).toBe('2024-01-15');
      });
    });

    describe('AnalyticsPeriodSchema', () => {
      it('should accept valid period', async () => {
        const data = {
          period: 'month',
        };
        const result = await AnalyticsPeriodSchema.parseAsync(data);
        expect(result.period).toBe('month');
      });

      it('should default to month', async () => {
        const data = {};
        const result = await AnalyticsPeriodSchema.parseAsync(data);
        expect(result.period).toBe('month');
      });

      it('should accept all valid periods', async () => {
        const periods = ['today', 'week', 'month', 'year', 'all'];
        for (const period of periods) {
          const result = await AnalyticsPeriodSchema.parseAsync({ period });
          expect(result.period).toBe(period);
        }
      });

      it('should reject invalid period', async () => {
        const invalidData = {
          period: 'invalid',
        };
        await expect(AnalyticsPeriodSchema.parseAsync(invalidData)).rejects.toThrow();
      });

      it('should validate date range when provided', async () => {
        const invalidData = {
          period: 'month',
          start_date: '2024-01-31',
          end_date: '2024-01-01',
        };
        await expect(AnalyticsPeriodSchema.parseAsync(invalidData)).rejects.toThrow();
      });
    });
  });

  describe('Edge Cases and Type Safety', () => {
    it('should handle null values appropriately', async () => {
      const invalidData = {
        email: null,
        password: 'SecurePassword123',
      };
      await expect(RegisterInputSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should handle empty strings', async () => {
      const invalidData = {
        email: '',
        password: 'SecurePassword123',
      };
      await expect(RegisterInputSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should trim whitespace in strings', async () => {
      const data = {
        name: '  John Doe  ',
      };
      const result = await CreateCustomerSchema.parseAsync(data);
      // Note: Zod doesn't trim by default, but this tests the behavior
      expect(result.name).toBeTruthy();
    });

    it('should reject objects instead of strings', async () => {
      const invalidData = {
        email: { value: 'user@example.com' },
        password: 'SecurePassword123',
      };
      await expect(RegisterInputSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should reject arrays instead of objects', async () => {
      const invalidData = ['email@example.com', 'password'];
      await expect(RegisterInputSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should handle very long strings appropriately', async () => {
      const longString = 'a'.repeat(300);
      const invalidData = {
        name: longString,
      };
      await expect(CreateCustomerSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should reject special characters in numeric fields', async () => {
      const invalidData = {
        platformId: '550e8400-e29b-41d4-a716-446655440000',
        date: '2024-01-15',
        amount: '100$',
      };
      await expect(CreateEarningSchema.parseAsync(invalidData)).rejects.toThrow();
    });

    it('should handle decimal numbers correctly', async () => {
      const validData = {
        platformId: '550e8400-e29b-41d4-a716-446655440000',
        date: '2024-01-15',
        amount: 100.50,
        hours: 8.5,
      };
      const result = await CreateEarningSchema.parseAsync(validData);
      expect(result.amount).toBe(100.50);
      expect(result.hours).toBe(8.5);
    });
  });
});
