# EarnTrack API Documentation

Welcome to the **EarnTrack API** - a comprehensive financial tracking platform for managing earnings, expenses, invoices, customers, and more.

## Quick Start

### Base URL
- **Development**: `http://localhost:3001/api/v1`
- **Production**: `https://api.example.com/api/v1`

### Authentication
All endpoints (except `/auth/register` and `/auth/login`) require JWT Bearer token authentication.

```
Header: Authorization: Bearer <your_jwt_token>
```

### Rate Limiting
- **Production**: 50 requests per 15 minutes
- **Development**: 100 requests per 15 minutes

### Response Format
All responses follow a consistent format:

**Success Response (2xx)**
```json
{
  "data": {},
  "message": "Operation successful"
}
```

**Error Response (4xx, 5xx)**
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

---

## API Documentation Endpoints

### View Interactive Documentation
- **Swagger UI**: `/api-docs`
- **OpenAPI Spec (YAML)**: `/api-spec.yaml`
- **OpenAPI Spec (JSON)**: `/api-spec`

### Health Check
- **GET** `/health` - Check API health status

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "timezone": "UTC",
    "currency": "USD",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Validation Rules:**
- Email: Valid email format, unique
- Password: Minimum 8 characters, must include uppercase, lowercase, numbers, and special characters
- Name: Optional

---

### Login User
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## User Management Endpoints

### Get User Profile
**GET** `/user/profile`

Retrieve authenticated user's profile.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "timezone": "America/New_York",
  "currency": "USD",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### Update User Profile
**PUT** `/user/profile`

Update user profile information.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "timezone": "Europe/London",
  "currency": "GBP"
}
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Jane Doe",
  "timezone": "Europe/London",
  "currency": "GBP",
  "updated_at": "2024-01-02T00:00:00Z"
}
```

---

### Change Password
**POST** `/user/change-password`

Change user password with verification.

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

---

### Delete Account
**DELETE** `/user/account`

Delete user account and all associated data.

**Response (204 No Content)**

---

## Platforms Endpoints

Platforms represent earning sources (e.g., Upwork, Fiverr, Delivery services).

### Get All Platforms
**GET** `/platforms`

Retrieve all platforms with earnings statistics.

**Query Parameters:**
- `limit` (integer, default: 20, max: 100) - Results per page
- `offset` (integer, default: 0) - Pagination offset

**Response (200 OK):**
```json
{
  "platforms": [
    {
      "id": "uuid",
      "name": "Upwork",
      "category": "freelance",
      "color": "#0066FF",
      "expected_rate": 50.00,
      "stats": {
        "total_earnings": 5000.00,
        "total_hours": 100,
        "avg_hourly_rate": 50.00
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 5
  }
}
```

---

### Create Platform
**POST** `/platforms`

Create a new earning platform.

**Request Body:**
```json
{
  "name": "Upwork",
  "category": "freelance",
  "color": "#0066FF",
  "expected_rate": 50.00
}
```

**Validation:**
- `name`: Required, string
- `category`: Optional, enum: freelance | delivery | services | other
- `color`: Optional, hex color code (e.g., #0066FF)
- `expected_rate`: Optional, positive number

**Response (201 Created):**
```json
{
  "platform": { ... }
}
```

---

### Update Platform
**PUT** `/platforms/{id}`

Update platform details.

**Response (200 OK):**
```json
{
  "platform": { ... }
}
```

---

### Delete Platform
**DELETE** `/platforms/{id}`

Delete platform.

**Response (200 OK):**
```json
{
  "message": "Platform deleted successfully"
}
```

---

## Earnings Endpoints

Track income from all your platforms.

### Get Earnings
**GET** `/earnings`

Retrieve earnings with filtering and pagination.

**Query Parameters:**
- `start_date` (YYYY-MM-DD) - Filter start date
- `end_date` (YYYY-MM-DD) - Filter end date
- `platform_id` (UUID) - Filter by platform
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "earnings": [
    {
      "id": "uuid",
      "platform_id": "uuid",
      "date": "2024-01-01",
      "hours": 5,
      "amount": 250.00,
      "notes": "Web development project",
      "hourly_rate": 50.00,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 15,
  "has_more": true
}
```

---

### Create Earning
**POST** `/earnings`

Record a new earning.

**Request Body:**
```json
{
  "platformId": "uuid",
  "date": "2024-01-01",
  "hours": 5,
  "amount": 250.00,
  "notes": "Web development project"
}
```

**Validation:**
- `platformId`: Required, valid UUID
- `date`: Required, YYYY-MM-DD format
- `amount`: Required, positive decimal
- `hours`: Optional, positive number
- `notes`: Optional, string

**Response (201 Created):**
```json
{
  "earning": { ... }
}
```

---

### Update Earning
**PUT** `/earnings/{id}`

Update earning record.

**Response (200 OK):**
```json
{
  "earning": { ... }
}
```

---

### Delete Earning
**DELETE** `/earnings/{id}`

Delete earning record.

**Response (200 OK):**
```json
{
  "message": "Earning deleted successfully"
}
```

---

## Expense Endpoints

Track business expenses and deductions.

### Get Expenses
**GET** `/expenses`

Retrieve expenses with filtering.

**Query Parameters:**
- `start_date` (YYYY-MM-DD) - Filter start date
- `end_date` (YYYY-MM-DD) - Filter end date
- `category` (string) - Filter by category
- `isTaxDeductible` (boolean) - Filter tax-deductible expenses
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "expenses": [
    {
      "id": "uuid",
      "category": "Software",
      "description": "Monthly subscription",
      "amount": 99.99,
      "expense_date": "2024-01-01",
      "vendor": "Adobe Creative Cloud",
      "is_tax_deductible": true,
      "receipt_url": "https://example.com/receipt.pdf",
      "notes": "Annual renewal",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 8
}
```

---

### Create Expense
**POST** `/expenses`

Record a new expense.

**Request Body:**
```json
{
  "category": "Software",
  "description": "Monthly subscription",
  "amount": 99.99,
  "expenseDate": "2024-01-01",
  "vendor": "Adobe Creative Cloud",
  "isTaxDeductible": true,
  "receiptUrl": "https://example.com/receipt.pdf",
  "notes": "Annual renewal"
}
```

**Validation:**
- `category`: Required, string
- `description`: Required, string
- `amount`: Required, positive decimal
- `expenseDate`: Optional, YYYY-MM-DD format
- `vendor`: Optional, string
- `isTaxDeductible`: Optional, boolean (default: false)
- `receiptUrl`: Optional, valid URL
- `notes`: Optional, string

**Response (201 Created):**
```json
{
  "expense": { ... }
}
```

---

### Get Expense Summary
**GET** `/expenses/summary`

Get expense totals grouped by category.

**Query Parameters:**
- `period` (enum: week | month | year) - Summary period

**Response (200 OK):**
```json
{
  "summary": {
    "total": 5000.00,
    "tax_deductible": 3000.00,
    "personal": 2000.00
  },
  "by_category": [
    {
      "category": "Software",
      "amount": 1000.00,
      "percentage": 20.0,
      "tax_deductible": 1000.00
    }
  ],
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

---

### Calculate Profit Margin
**GET** `/expenses/profit/margin`

Calculate profit margin (revenue - expenses).

**Query Parameters:**
- `period` (enum: week | month | year) - Period for calculation

**Response (200 OK):**
```json
{
  "financials": {
    "revenue": 10000.00,
    "expenses": 3000.00,
    "profit": 7000.00,
    "profit_margin_percent": 70.0
  },
  "start_date": "2024-01-01",
  "end_date": "2024-01-31"
}
```

---

## Invoice Endpoints

Create and manage invoices for clients.

### Get Invoices
**GET** `/invoices`

Retrieve invoices with filtering and pagination.

**Query Parameters:**
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)
- `status` (enum: draft | sent | viewed | paid | overdue | cancelled)
- `customerId` (UUID)
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-001",
      "customer_id": "uuid",
      "subtotal": 1000.00,
      "tax_amount": 100.00,
      "discount_amount": 50.00,
      "total_amount": 1050.00,
      "invoice_date": "2024-01-01",
      "due_date": "2024-02-01",
      "status": "pending",
      "payment_method": null,
      "notes": "Net-30 terms",
      "terms": "Due within 30 days",
      "line_items": [
        {
          "description": "Web Development",
          "quantity": 40,
          "unit_price": 25.00,
          "total_price": 1000.00
        }
      ],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 12
}
```

---

### Create Invoice
**POST** `/invoices`

Create a new invoice.

**Request Body:**
```json
{
  "customerId": "uuid",
  "invoiceNumber": "INV-001",
  "subtotal": 1000.00,
  "taxAmount": 100.00,
  "discountAmount": 50.00,
  "totalAmount": 1050.00,
  "invoiceDate": "2024-01-01",
  "dueDate": "2024-02-01",
  "status": "draft",
  "paymentMethod": null,
  "notes": "Net-30 terms",
  "terms": "Due within 30 days",
  "lineItems": [
    {
      "description": "Web Development",
      "quantity": 40,
      "unitPrice": 25.00,
      "totalPrice": 1000.00
    }
  ]
}
```

**Validation:**
- `invoiceNumber`: Required, unique, string
- `totalAmount`: Required, positive decimal
- All monetary fields: Positive decimals
- Line items: At least one required

**Response (201 Created):**
```json
{
  "invoice": { ... }
}
```

---

### Mark Invoice as Paid
**PATCH** `/invoices/{id}`

Mark invoice as paid and record payment method.

**Request Body:**
```json
{
  "paymentMethod": "bank_transfer"
}
```

**Response (200 OK):**
```json
{
  "invoice": { ... }
}
```

---

### Get Invoice Summary
**GET** `/invoices/summary`

Get overall invoice statistics.

**Response (200 OK):**
```json
{
  "summary": {
    "total_invoices": 50,
    "paid": 40,
    "pending": 8,
    "overdue": 2,
    "total_amount": 50000.00,
    "paid_amount": 40000.00,
    "pending_amount": 10000.00
  }
}
```

---

### Get Overdue Invoices
**GET** `/invoices/overdue`

Retrieve invoices that are overdue.

**Response (200 OK):**
```json
{
  "overdueInvoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-001",
      "total_amount": 1000.00,
      "days_overdue": 15,
      ...
    }
  ],
  "total": 2,
  "totalAmount": 2000.00
}
```

---

## Customer Endpoints

Manage your clients and customer information.

### Get Customers
**GET** `/customers`

Retrieve customers with search and filtering.

**Query Parameters:**
- `isActive` (boolean) - Filter active customers
- `search` (string) - Search by name or email
- `sortBy` (enum: name | ltv | recent | purchases) - Sort customers
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "customers": [
    {
      "id": "uuid",
      "name": "ACME Corp",
      "email": "contact@acme.com",
      "phone": "+1-555-0123",
      "company": "ACME Corporation",
      "address": "123 Main St",
      "city": "New York",
      "country": "USA",
      "notes": "Premium client",
      "is_active": true,
      "last_purchase": "2024-01-15T00:00:00Z",
      "total_purchases": 25000.00,
      "purchase_count": 12,
      "average_order_value": 2083.33,
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45
  }
}
```

---

### Create Customer
**POST** `/customers`

Add a new customer.

**Request Body:**
```json
{
  "name": "ACME Corp",
  "email": "contact@acme.com",
  "phone": "+1-555-0123",
  "company": "ACME Corporation",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA",
  "notes": "Premium client"
}
```

**Validation:**
- `name`: Required, string
- `email`: Optional, valid email format
- All other fields: Optional, string

**Response (201 Created):**
```json
{
  "customer": { ... }
}
```

---

### Get Top Customers
**GET** `/customers/top`

Get top customers by total purchases (Lifetime Value).

**Query Parameters:**
- `limit` (integer, default: 10) - Number of top customers

**Response (200 OK):**
```json
{
  "topCustomers": [
    {
      "id": "uuid",
      "name": "Top Client",
      "total_purchases": 100000.00,
      "purchase_count": 50,
      ...
    }
  ]
}
```

---

## Product Endpoints

Manage your products and inventory.

### Get Products
**GET** `/products`

Retrieve products with filtering.

**Query Parameters:**
- `isActive` (boolean)
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Premium Template",
      "description": "High-quality website template",
      "price": 49.99,
      "category": "Digital Products",
      "sku": "TMPL-001",
      "is_active": true,
      "quantity": 100,
      "stats": {
        "total_sales": 250,
        "total_revenue": 12497.50,
        "total_quantity": 250
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### Create Product
**POST** `/products`

Add a new product.

**Request Body:**
```json
{
  "name": "Premium Template",
  "description": "High-quality website template",
  "price": 49.99,
  "category": "Digital Products",
  "sku": "TMPL-001"
}
```

**Validation:**
- `name`: Required, string
- `price`: Required, positive decimal
- `description`: Optional, string
- `category`: Optional, string
- `sku`: Optional, string

**Response (201 Created):**
```json
{
  "product": { ... }
}
```

---

## Sales Endpoints

Track product sales and revenue.

### Get Sales
**GET** `/sales`

Retrieve sales records with filtering.

**Query Parameters:**
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)
- `productId` (UUID)
- `status` (enum: completed | pending | cancelled)
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "sales": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": 5,
      "unit_price": 49.99,
      "total_amount": 249.95,
      "sale_date": "2024-01-01",
      "customer": "John Doe",
      "notes": "Bulk order",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 28
}
```

---

### Create Sale
**POST** `/sales`

Record a new sale.

**Request Body:**
```json
{
  "productId": "uuid",
  "quantity": 5,
  "unitPrice": 49.99,
  "totalAmount": 249.95,
  "saleDate": "2024-01-01",
  "customer": "John Doe",
  "notes": "Bulk order",
  "status": "completed"
}
```

**Response (201 Created):**
```json
{
  "sale": { ... }
}
```

---

## Inventory Endpoints

Manage product inventory and stock levels.

### Get Inventory
**GET** `/inventory`

Retrieve inventory with low stock filtering.

**Query Parameters:**
- `showLowStock` (boolean) - Show only low-stock items
- `limit` (integer, default: 20)
- `offset` (integer, default: 0)

**Response (200 OK):**
```json
{
  "inventory": [ ... ],
  "summary": {
    "total_items": 150,
    "low_stock_count": 5,
    "out_of_stock_count": 2
  },
  "pagination": { ... }
}
```

---

### Update Stock
**PUT** `/inventory/{id}/stock`

Update product stock levels.

**Request Body:**
```json
{
  "quantity": 100,
  "reorderPoint": 20,
  "supplierName": "Main Supplier",
  "supplierCost": 25.00
}
```

**Response (200 OK):**
```json
{
  "product": { ... }
}
```

---

### Log Inventory Change
**POST** `/inventory/log`

Record inventory change (purchase, sale, adjustment, damage, return).

**Request Body:**
```json
{
  "productId": "uuid",
  "quantityChange": 50,
  "type": "purchase",
  "notes": "Restocking from supplier ABC"
}
```

**Validation:**
- `productId`: Required, UUID
- `quantityChange`: Required, non-zero integer
- `type`: Required, enum: purchase | sale | adjustment | damage | return
- `notes`: Optional, string

**Response (201 Created):**
```json
{
  "log": {
    "id": "uuid",
    "product_id": "uuid",
    "quantity_change": 50,
    "type": "purchase",
    "notes": "Restocking from supplier ABC",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "updatedQuantity": 150
}
```

---

### Get Low Stock Alerts
**GET** `/inventory/alerts/low-stock`

Get products with low stock levels.

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "product_id": "uuid",
      "product_name": "Premium Template",
      "current_quantity": 0,
      "reorder_point": 20,
      "severity": "critical"
    },
    {
      "product_id": "uuid",
      "product_name": "Standard Template",
      "current_quantity": 15,
      "reorder_point": 20,
      "severity": "high"
    }
  ],
  "totalAlerts": 5,
  "criticalCount": 1,
  "highCount": 4
}
```

---

## Goal Endpoints

Set and track financial goals.

### Get Goals
**GET** `/goals`

Retrieve all goals with optional status filtering.

**Query Parameters:**
- `status` (enum: active | completed | cancelled) - Filter by status

**Response (200 OK):**
```json
{
  "goals": [
    {
      "id": "uuid",
      "title": "Save for Conference",
      "target_amount": 5000.00,
      "current_amount": 3200.00,
      "deadline": "2024-06-30",
      "description": "Annual tech conference attendance",
      "status": "active",
      "progress_percentage": 64.0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Create Goal
**POST** `/goals`

Set a new financial goal.

**Request Body:**
```json
{
  "title": "Save for Conference",
  "targetAmount": 5000.00,
  "deadline": "2024-06-30",
  "description": "Annual tech conference attendance"
}
```

**Validation:**
- `title`: Required, string
- `targetAmount`: Required, positive decimal
- `deadline`: Optional, YYYY-MM-DD format
- `description`: Optional, string

**Response (201 Created):**
```json
{
  "goal": { ... }
}
```

---

### Update Goal Progress
**POST** `/goals/{id}/update-progress`

Recalculate goal progress based on recent earnings.

**Response (200 OK):**
```json
{
  "goal": {
    "id": "uuid",
    "title": "Save for Conference",
    "progress_percentage": 68.0,
    ...
  }
}
```

---

## Analytics Endpoints

Get comprehensive financial analytics and insights.

### Get Analytics Summary
**GET** `/analytics/summary`

Retrieve comprehensive analytics for a period.

**Query Parameters:**
- `period` (enum: today | week | month | year | all, default: month)
- `start_date` (YYYY-MM-DD) - Custom start date
- `end_date` (YYYY-MM-DD) - Custom end date

**Response (200 OK):**
```json
{
  "summary": {
    "period": "month",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "total_earnings": 10000.00,
    "total_expenses": 2500.00,
    "total_hours": 100,
    "avg_hourly_rate": 100.00,
    "by_platform": [
      {
        "platform": {
          "id": "uuid",
          "name": "Upwork",
          "color": "#0066FF"
        },
        "earnings": 6000.00,
        "hours": 60,
        "hourly_rate": 100.00,
        "percentage": 60.0
      }
    ],
    "daily_breakdown": [
      {
        "date": "2024-01-01",
        "earnings": 250.00,
        "hours": 5
      }
    ]
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful deletion |
| 400 | Bad Request | Validation error or malformed request |
| 401 | Unauthorized | Missing or invalid JWT token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email already registered) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (check logs via Sentry) |

### Error Response Format

```json
{
  "error": "Validation Error",
  "message": "Email is already registered"
}
```

---

## Best Practices

### Authentication
- Store JWT token securely (HttpOnly cookie or secure storage)
- Include token in Authorization header for all authenticated requests
- Refresh token if expired
- Never expose token in URLs or logs

### Rate Limiting
- Implement exponential backoff for retries
- Cache responses when appropriate
- Use pagination for large datasets

### Data Handling
- Always validate input data on client side
- Use proper timezone handling for date fields
- Store monetary values as strings if using floating-point calculations
- Use ISO 8601 format for dates and timestamps

### Error Handling
- Always handle error responses gracefully
- Log errors for debugging
- Display user-friendly messages
- Implement retry logic for transient failures

### Filtering and Pagination
- Use `limit` and `offset` for pagination
- Filter results server-side when possible
- Always include total count for pagination
- Default reasonable limits to prevent large responses

---

## Example: Complete Workflow

### 1. Register User
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'
```

### 2. Login User
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Create Platform
```bash
curl -X POST http://localhost:3001/api/v1/platforms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Upwork",
    "category": "freelance",
    "color": "#0066FF"
  }'
```

### 4. Record Earning
```bash
curl -X POST http://localhost:3001/api/v1/earnings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "platformId": "platform-uuid",
    "date": "2024-01-01",
    "hours": 5,
    "amount": 250.00
  }'
```

### 5. Get Analytics
```bash
curl -X GET "http://localhost:3001/api/v1/analytics/summary?period=month" \
  -H "Authorization: Bearer <token>"
```

---

## Support & Documentation

- **Interactive API Explorer**: Visit `/api-docs` for the Swagger UI
- **OpenAPI Specification**: Available at `/api-spec.yaml` or `/api-spec`
- **Health Check**: GET `/health`

---

## Version
- **API Version**: 1.0.0
- **Last Updated**: January 2024
