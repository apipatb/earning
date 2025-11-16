import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EarnTrack API',
      description:
        'Business earnings and management platform API. Track earnings, invoices, sales, products, customers, and expenses all in one place.',
      version: '1.0.0',
      contact: {
        name: 'EarnTrack Support',
        email: 'support@earntrack.com',
        url: 'https://earntrack.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Local development server (alternative)',
      },
      {
        url: 'https://api.earntrack.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT Bearer token for authentication. Include in the Authorization header: Authorization: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'number',
              example: 400,
            },
            message: {
              type: 'string',
              example: 'Bad request',
            },
            error: {
              type: 'string',
              example: 'Invalid input parameters',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
        },
        AuthToken: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              example:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJpYXQiOjE2NzMxNzIyMDB9...',
            },
            user: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        Earning: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            platformId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440002',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 150.50,
              description: 'Amount earned in USD',
            },
            date: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            description: {
              type: 'string',
              example: 'Completed freelance project',
            },
            category: {
              type: 'string',
              example: 'freelance',
              enum: ['freelance', 'gig', 'affiliate', 'other'],
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: ['userId', 'amount', 'date'],
        },
        Invoice: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440003',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            customerId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440004',
            },
            invoiceNumber: {
              type: 'string',
              example: 'INV-2024-001',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 5000.00,
            },
            tax: {
              type: 'number',
              format: 'decimal',
              example: 500.00,
            },
            total: {
              type: 'number',
              format: 'decimal',
              example: 5500.00,
            },
            issueDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-15',
            },
            dueDate: {
              type: 'string',
              format: 'date',
              example: '2024-02-15',
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'viewed', 'paid', 'overdue'],
              example: 'sent',
            },
            description: {
              type: 'string',
              example: 'Professional services for website redesign',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: ['userId', 'customerId', 'amount', 'issueDate', 'dueDate'],
        },
        Sale: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440005',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            customerId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440004',
            },
            productId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440006',
            },
            quantity: {
              type: 'number',
              example: 5,
            },
            unitPrice: {
              type: 'number',
              format: 'decimal',
              example: 99.99,
            },
            totalPrice: {
              type: 'number',
              format: 'decimal',
              example: 499.95,
            },
            saleDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'cancelled'],
              example: 'completed',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: ['userId', 'customerId', 'quantity', 'unitPrice'],
        },
        Customer: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440004',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              example: 'Acme Corporation',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'contact@acme.com',
            },
            phone: {
              type: 'string',
              example: '+1-555-123-4567',
            },
            address: {
              type: 'string',
              example: '123 Business St, Suite 100',
            },
            city: {
              type: 'string',
              example: 'New York',
            },
            state: {
              type: 'string',
              example: 'NY',
            },
            zipCode: {
              type: 'string',
              example: '10001',
            },
            country: {
              type: 'string',
              example: 'USA',
            },
            totalSales: {
              type: 'number',
              format: 'decimal',
              example: 15000.00,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: ['userId', 'name', 'email'],
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440006',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            name: {
              type: 'string',
              example: 'Professional Consulting Hour',
            },
            description: {
              type: 'string',
              example: 'One hour of professional business consulting',
            },
            price: {
              type: 'number',
              format: 'decimal',
              example: 199.99,
            },
            sku: {
              type: 'string',
              example: 'CONS-001',
            },
            category: {
              type: 'string',
              example: 'Services',
            },
            quantity: {
              type: 'number',
              example: 100,
              description: 'Stock quantity',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: ['userId', 'name', 'price'],
        },
        Expense: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440007',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            description: {
              type: 'string',
              example: 'Office supplies purchase',
            },
            amount: {
              type: 'number',
              format: 'decimal',
              example: 250.00,
            },
            category: {
              type: 'string',
              example: 'supplies',
              enum: [
                'supplies',
                'equipment',
                'software',
                'marketing',
                'travel',
                'meals',
                'utilities',
                'other',
              ],
            },
            date: {
              type: 'string',
              format: 'date',
              example: '2024-01-15',
            },
            receipt: {
              type: 'string',
              example: 'https://example.com/receipt.pdf',
              description: 'URL to receipt document',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00Z',
            },
          },
          required: ['userId', 'description', 'amount', 'date'],
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  example: 1,
                },
                limit: {
                  type: 'number',
                  example: 10,
                },
                total: {
                  type: 'number',
                  example: 100,
                },
                pages: {
                  type: 'number',
                  example: 10,
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/lib/swagger-routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
