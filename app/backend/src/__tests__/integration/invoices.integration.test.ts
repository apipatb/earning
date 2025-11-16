import request from 'supertest';
import { TestSetup, setupIntegrationTests, teardownIntegrationTests } from './test-setup';

// Lazy load prisma to avoid initialization issues
const getPrisma = () => require('../../lib/prisma').default;

describe('Invoices Integration Tests', () => {
  let app: any;
  let userToken: string;
  let userId: string;
  let customerId: string;

  beforeAll(async () => {
    await setupIntegrationTests();
    app = TestSetup.app;
  });

  beforeEach(async () => {
    await TestSetup.cleanDatabase();

    // Create test user and customer
    const { user, token } = await TestSetup.createTestUser();
    const customer = await TestSetup.createTestCustomer(user.id);

    userToken = token;
    userId = user.id;
    customerId = customer.id;
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('Invoice Creation with Line Items', () => {
    test('1. Create invoice with line items successfully', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-001',
        customerId,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 1000,
        taxAmount: 100,
        discountAmount: 50,
        totalAmount: 1050,
        status: 'draft',
        notes: 'Test invoice',
        lineItems: [
          {
            description: 'Web Development Services',
            quantity: 5,
            unitPrice: 200,
            totalPrice: 1000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.invoice).toBeDefined();
      expect(response.body.invoice.invoiceNumber).toBe('INV-001');
      expect(response.body.invoice.totalAmount).toBe(1050);
      expect(response.body.invoice.lineItems).toBeInstanceOf(Array);
      expect(response.body.invoice.lineItems.length).toBe(1);
      expect(response.body.invoice.lineItems[0].description).toBe('Web Development Services');

      // Verify in database (skipped in mock mode)
      if (!TestSetup.useMockDatabase) {
        const dbInvoice = await getPrisma().invoice.findUnique({
          where: { id: response.body.invoice.id },
          include: { lineItems: true },
        });
        expect(dbInvoice).toBeDefined();
        expect(dbInvoice?.lineItems.length).toBe(1);
      }
    });

    test('2. Create invoice with multiple line items', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-002',
        customerId,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 3000,
        taxAmount: 300,
        discountAmount: 0,
        totalAmount: 3300,
        lineItems: [
          {
            description: 'UI Design',
            quantity: 2,
            unitPrice: 500,
            totalPrice: 1000,
          },
          {
            description: 'API Development',
            quantity: 4,
            unitPrice: 500,
            totalPrice: 2000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.invoice.lineItems.length).toBe(2);
      expect(response.body.invoice.totalAmount).toBe(3300);
    });

    test('3. Create invoice without customer (optional field)', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-003',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 500,
        taxAmount: 50,
        discountAmount: 0,
        totalAmount: 550,
        lineItems: [
          {
            description: 'Consulting Services',
            quantity: 1,
            unitPrice: 500,
            totalPrice: 500,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.invoice.invoiceNumber).toBe('INV-003');
    });
  });

  describe('Customer Linking', () => {
    test('4. Link invoice to existing customer', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-004',
        customerId,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 1000,
        taxAmount: 100,
        discountAmount: 0,
        totalAmount: 1100,
        lineItems: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.invoice.customer).toBeDefined();
      expect(response.body.invoice.customer.id).toBe(customerId);
    });

    test('5. Reject invoice with non-existent customer', async () => {
      const fakeCustomerId = '00000000-0000-0000-0000-000000000000';

      const invoiceData = {
        invoiceNumber: 'INV-005',
        customerId: fakeCustomerId,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 1000,
        taxAmount: 100,
        discountAmount: 0,
        totalAmount: 1100,
        lineItems: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('6. Cannot link to another user\'s customer', async () => {
      // Create another user
      const { user: otherUser, token: otherToken } = await TestSetup.createTestUser(
        'other@example.com'
      );

      // Try to create invoice with first user's customer as second user
      const invoiceData = {
        invoiceNumber: 'INV-006',
        customerId,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 1000,
        taxAmount: 100,
        discountAmount: 0,
        totalAmount: 1100,
        lineItems: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(invoiceData);

      expect(response.status).toBe(404);
    });
  });

  describe('Invoice Status Updates', () => {
    test('7. Update invoice status successfully', async () => {
      // Create invoice
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceNumber: 'INV-007',
          customerId,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 1000,
          taxAmount: 100,
          discountAmount: 0,
          totalAmount: 1100,
          status: 'draft',
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        });

      const invoiceId = createResponse.body.invoice.id;

      // Update status to sent
      const updateResponse = await request(app)
        .put(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'sent',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.invoice.status).toBe('sent');
    });

    test('8. Mark invoice as paid', async () => {
      // Create invoice
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceNumber: 'INV-008',
          customerId,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 1000,
          taxAmount: 100,
          discountAmount: 0,
          totalAmount: 1100,
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        });

      const invoiceId = createResponse.body.invoice.id;

      // Mark as paid
      const response = await request(app)
        .patch(`/api/v1/invoices/${invoiceId}/mark-paid`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'credit_card',
        });

      expect(response.status).toBe(200);
      expect(response.body.invoice.status).toBe('paid');
      expect(response.body.invoice.paidDate).toBeDefined();
    });

    test('9. Update invoice details (amount, line items, etc)', async () => {
      // Create invoice
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceNumber: 'INV-009',
          customerId,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 1000,
          taxAmount: 100,
          discountAmount: 0,
          totalAmount: 1100,
          lineItems: [
            {
              description: 'Original Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        });

      const invoiceId = createResponse.body.invoice.id;

      // Update with new amounts and line items
      const updateResponse = await request(app)
        .put(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          subtotal: 2000,
          taxAmount: 200,
          discountAmount: 100,
          totalAmount: 2100,
          lineItems: [
            {
              description: 'Updated Service',
              quantity: 2,
              unitPrice: 1000,
              totalPrice: 2000,
            },
          ],
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.invoice.totalAmount).toBe(2100);
      expect(updateResponse.body.invoice.lineItems.length).toBe(1);
      expect(updateResponse.body.invoice.lineItems[0].description).toBe('Updated Service');
    });
  });

  describe('Complete Invoice Workflow', () => {
    test('10. Complete workflow: Create → View → Update → Mark Paid', async () => {
      // Step 1: Create
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceNumber: 'INV-010',
          customerId,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 1000,
          taxAmount: 100,
          discountAmount: 0,
          totalAmount: 1100,
          status: 'draft',
          lineItems: [
            {
              description: 'Web Development',
              quantity: 5,
              unitPrice: 200,
              totalPrice: 1000,
            },
          ],
        });

      expect(createResponse.status).toBe(201);
      const invoiceId = createResponse.body.invoice.id;

      // Step 2: View/Read
      const listResponse = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`);

      expect(listResponse.status).toBe(200);
      const foundInvoice = listResponse.body.invoices.find((i: any) => i.id === invoiceId);
      expect(foundInvoice).toBeDefined();

      // Step 3: Update status to sent
      const updateResponse = await request(app)
        .put(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'sent',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.invoice.status).toBe('sent');

      // Step 4: Mark as paid
      const paidResponse = await request(app)
        .patch(`/api/v1/invoices/${invoiceId}/mark-paid`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: 'bank_transfer',
        });

      expect(paidResponse.status).toBe(200);
      expect(paidResponse.body.invoice.status).toBe('paid');
    });
  });

  describe('Invoice Deletion', () => {
    test('11. Delete invoice successfully', async () => {
      // Create invoice
      const createResponse = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          invoiceNumber: 'INV-011',
          customerId,
          invoiceDate: '2024-01-15',
          dueDate: '2024-02-15',
          subtotal: 1000,
          taxAmount: 100,
          discountAmount: 0,
          totalAmount: 1100,
          lineItems: [
            {
              description: 'Service',
              quantity: 1,
              unitPrice: 1000,
              totalPrice: 1000,
            },
          ],
        });

      const invoiceId = createResponse.body.invoice.id;

      // Delete it
      const deleteResponse = await request(app)
        .delete(`/api/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toContain('deleted');

      // Verify deletion
      const verifyResponse = await request(app)
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`);

      const stillExists = verifyResponse.body.invoices.find((i: any) => i.id === invoiceId);
      expect(stillExists).toBeUndefined();
    });

    test('12. Reject deletion of non-existent invoice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/v1/invoices/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });

  describe('Invoice Filtering and Pagination', () => {
    beforeEach(async () => {
      // Create multiple invoices
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post('/api/v1/invoices')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            invoiceNumber: `INV-${String(i).padStart(3, '0')}`,
            customerId: i % 2 === 0 ? customerId : undefined,
            invoiceDate: `2024-01-${String(i).padStart(2, '0')}`,
            dueDate: `2024-02-${String(i).padStart(2, '0')}`,
            subtotal: 1000 + i * 100,
            taxAmount: 100 + i * 10,
            discountAmount: 0,
            totalAmount: 1100 + i * 110,
            status: i % 3 === 0 ? 'paid' : 'draft',
            lineItems: [
              {
                description: `Service ${i}`,
                quantity: 1,
                unitPrice: 1000 + i * 100,
                totalPrice: 1000 + i * 100,
              },
            ],
          });
      }
    });

    test('13. List invoices with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/invoices?limit=5&offset=0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.invoices.length).toBeLessThanOrEqual(5);
      expect(response.body.total).toBe(10);
    });

    test('14. Filter invoices by status', async () => {
      const response = await request(app)
        .get('/api/v1/invoices?status=paid')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.invoices.forEach((invoice: any) => {
        expect(invoice.status).toBe('paid');
      });
    });

    test('15. Filter invoices by date range', async () => {
      const response = await request(app)
        .get('/api/v1/invoices?startDate=2024-01-05&endDate=2024-01-10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.invoices.forEach((invoice: any) => {
        const invoiceDate = new Date(invoice.invoiceDate);
        expect(invoiceDate >= new Date('2024-01-05')).toBe(true);
        expect(invoiceDate <= new Date('2024-01-10')).toBe(true);
      });
    });
  });

  describe('Invoice Validation', () => {
    test('16. Reject invoice with invalid line items', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-016',
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: 1000,
        taxAmount: 100,
        discountAmount: 0,
        totalAmount: 1100,
        lineItems: [
          {
            // Missing required fields
            quantity: 1,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    test('17. Reject invoice with negative amounts', async () => {
      const invoiceData = {
        invoiceNumber: 'INV-017',
        customerId,
        invoiceDate: '2024-01-15',
        dueDate: '2024-02-15',
        subtotal: -1000, // Invalid
        taxAmount: 100,
        discountAmount: 0,
        totalAmount: 1100,
        lineItems: [
          {
            description: 'Service',
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      };

      const response = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invoiceData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });
  });
});
