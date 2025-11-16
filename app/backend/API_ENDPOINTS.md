# API Endpoints Documentation

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication
All endpoints require a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

---

## Pagination

List endpoints support the following query parameters:
- `limit`: Number of records to return (default: 10-50 depending on endpoint)
- `offset`: Number of records to skip (default: 0)

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Endpoints

### Authentication

#### Register
- **POST** `/auth/register`
- **Body:** `{ email: string, password: string, name?: string }`
- **Response:** `{ user: User, token: string }`

#### Login
- **POST** `/auth/login`
- **Body:** `{ email: string, password: string }`
- **Response:** `{ user: User, token: string }`

---

### Platforms

#### List Platforms
- **GET** `/platforms?limit=50&offset=0`
- **Query Params:**
  - `limit`: Number of platforms (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "platforms": [
      {
        "id": "uuid",
        "name": "string",
        "category": "freelance|delivery|services|other",
        "color": "#RRGGBB",
        "expectedRate": number,
        "isActive": boolean,
        "stats": {
          "total_earnings": number,
          "total_hours": number,
          "avg_hourly_rate": number
        }
      }
    ],
    "pagination": { ... }
  }
  ```

#### Create Platform
- **POST** `/platforms`
- **Body:**
  ```json
  {
    "name": "string (required, max 100)",
    "category": "freelance|delivery|services|other (required)",
    "color": "#RRGGBB (optional, must be valid hex)",
    "expectedRate": number (optional, must be positive)
  }
  ```
- **Response:** `{ platform: Platform }`

#### Update Platform
- **PUT** `/platforms/:id`
- **Body:** Same as create (all fields optional)
- **Response:** `{ platform: Platform }`

#### Delete Platform
- **DELETE** `/platforms/:id`
- **Response:** `{ message: "Platform deleted successfully" }`

---

### Earnings

#### List Earnings
- **GET** `/earnings?period=month&limit=50&offset=0`
- **Query Params:**
  - `period`: "today|week|month|year|all" (default: "month")
  - `limit`: Number of records (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "earnings": [
      {
        "id": "uuid",
        "platformId": "uuid",
        "amount": number,
        "date": "YYYY-MM-DD",
        "hours": number | null,
        "notes": "string | null",
        "createdAt": "ISO datetime",
        "updatedAt": "ISO datetime"
      }
    ],
    "pagination": { ... }
  }
  ```

#### Create Earning
- **POST** `/earnings`
- **Body:**
  ```json
  {
    "platformId": "uuid (required)",
    "amount": number (required, must be positive),
    "date": "YYYY-MM-DD (optional, defaults to today)",
    "hours": number (optional),
    "notes": "string (optional)"
  }
  ```
- **Response:** `{ earning: Earning }`

#### Update Earning
- **PUT** `/earnings/:id`
- **Body:** Same as create (all fields optional)
- **Response:** `{ earning: Earning }`

#### Delete Earning
- **DELETE** `/earnings/:id`
- **Response:** `{ message: "Earning deleted successfully" }`

---

### Products

#### List Products
- **GET** `/products?isActive=true&limit=50&offset=0`
- **Query Params:**
  - `isActive`: "true|false" (optional)
  - `limit`: Number of products (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "products": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string | null",
        "price": number,
        "category": "string | null",
        "sku": "string | null",
        "quantity": number,
        "isActive": boolean,
        "stats": {
          "total_sales": number,
          "total_revenue": number,
          "total_quantity": number
        }
      }
    ],
    "pagination": { ... }
  }
  ```

#### Create Product
- **POST** `/products`
- **Body:**
  ```json
  {
    "name": "string (required, max 255)",
    "description": "string (optional, max 1000)",
    "price": number (required, must be positive),
    "category": "string (optional, max 100)",
    "sku": "string (optional, max 100)",
    "quantity": number (required, min 0)
  }
  ```
- **Response:** `{ product: Product }`

#### Update Product
- **PUT** `/products/:id`
- **Body:** Same as create (all fields optional)
- **Response:** `{ product: Product }`

#### Delete Product
- **DELETE** `/products/:id`
- **Response:** `{ message: "Product deleted successfully" }`

---

### Sales

#### List Sales
- **GET** `/sales?status=completed&limit=50&offset=0`
- **Query Params:**
  - `status`: "completed|pending|cancelled" (optional)
  - `productId`: "uuid" (optional)
  - `startDate`: "YYYY-MM-DD" (optional)
  - `endDate`: "YYYY-MM-DD" (optional)
  - `limit`: Number of records (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "sales": [
      {
        "id": "uuid",
        "productId": "uuid",
        "quantity": number,
        "unitPrice": number,
        "saleDate": "YYYY-MM-DD",
        "customer": "string | null",
        "notes": "string | null",
        "status": "completed|pending|cancelled"
      }
    ],
    "pagination": { ... }
  }
  ```

#### Create Sale
- **POST** `/sales`
- **Body:**
  ```json
  {
    "productId": "uuid (required)",
    "quantity": number (required, must be positive),
    "unitPrice": number (required, must be positive),
    "saleDate": "YYYY-MM-DD (optional)",
    "customer": "string (optional)",
    "notes": "string (optional)",
    "status": "completed|pending|cancelled (default: completed)"
  }
  ```
- **Response:** `{ sale: Sale }`

#### Get Sales Summary
- **GET** `/sales/summary?period=month`
- **Query Params:**
  - `period`: "week|month|year" (default: "month")
- **Response:**
  ```json
  {
    "summary": {
      "total_sales": number,
      "total_quantity": number,
      "total_revenue": number,
      "avg_sale": number
    }
  }
  ```

---

### Invoices

#### List Invoices
- **GET** `/invoices?status=paid&limit=50&offset=0`
- **Query Params:**
  - `status`: "draft|sent|viewed|paid|overdue|cancelled" (optional)
  - `customerId`: "uuid" (optional)
  - `startDate`: "YYYY-MM-DD" (optional)
  - `endDate`: "YYYY-MM-DD" (optional)
  - `limit`: Number of records (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "invoices": [
      {
        "id": "uuid",
        "invoiceNumber": "string",
        "customerId": "uuid | null",
        "subtotal": number,
        "taxAmount": number,
        "discountAmount": number,
        "totalAmount": number,
        "status": "draft|sent|viewed|paid|overdue|cancelled",
        "invoiceDate": "YYYY-MM-DD",
        "dueDate": "YYYY-MM-DD",
        "paidDate": "YYYY-MM-DD | null"
      }
    ],
    "pagination": { ... }
  }
  ```

#### Create Invoice
- **POST** `/invoices`
- **Body:**
  ```json
  {
    "customerId": "uuid (optional)",
    "invoiceNumber": "string (required, max 100)",
    "subtotal": number (required, must be positive),
    "taxAmount": number (optional, default 0, min 0),
    "discountAmount": number (optional, default 0, min 0),
    "totalAmount": number (required, must be positive),
    "invoiceDate": "YYYY-MM-DD (optional)",
    "dueDate": "YYYY-MM-DD (required)",
    "status": "draft|sent|viewed|paid|overdue|cancelled (default: draft)",
    "paymentMethod": "string (optional, max 50)",
    "notes": "string (optional)",
    "terms": "string (optional)",
    "lineItems": [
      {
        "description": "string (required, max 1000)",
        "quantity": number (required, must be positive),
        "unitPrice": number (required, must be positive)",
        "totalPrice": number (required, must be positive)"
      }
    ]
  }
  ```
- **Response:** `{ invoice: Invoice }`

#### Mark Invoice as Paid
- **PATCH** `/invoices/:id/mark-paid`
- **Body:**
  ```json
  {
    "paymentMethod": "string (optional)"
  }
  ```
- **Response:** `{ invoice: Invoice }`

#### Get Invoice Summary
- **GET** `/invoices/summary`
- **Response:**
  ```json
  {
    "total_invoices": number,
    "total_amount": number,
    "paid_amount": number,
    "outstanding_amount": number,
    "overdue_amount": number
  }
  ```

#### Get Overdue Invoices
- **GET** `/invoices/overdue`
- **Response:** `{ invoices: Invoice[] }`

---

### Expenses

#### List Expenses
- **GET** `/expenses?isTaxDeductible=true&limit=50&offset=0`
- **Query Params:**
  - `category`: "string" (optional)
  - `isTaxDeductible`: "true|false" (optional)
  - `startDate`: "YYYY-MM-DD" (optional)
  - `endDate`: "YYYY-MM-DD" (optional)
  - `limit`: Number of records (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "expenses": [
      {
        "id": "uuid",
        "category": "string",
        "description": "string",
        "amount": number,
        "expenseDate": "YYYY-MM-DD",
        "vendor": "string | null",
        "isTaxDeductible": boolean,
        "notes": "string | null"
      }
    ],
    "pagination": { ... }
  }
  ```

#### Create Expense
- **POST** `/expenses`
- **Body:**
  ```json
  {
    "category": "string (required, max 100)",
    "description": "string (required, max 1000)",
    "amount": number (required, must be positive)",
    "expenseDate": "YYYY-MM-DD (optional, defaults to today)",
    "vendor": "string (optional, max 255)",
    "isTaxDeductible": boolean (optional, default false)",
    "receiptUrl": "url (optional)",
    "notes": "string (optional)"
  }
  ```
- **Response:** `{ expense: Expense }`

#### Get Expense Summary
- **GET** `/expenses/summary?period=month`
- **Query Params:**
  - `period`: "week|month|year" (default: "month")
- **Response:**
  ```json
  {
    "summary": {
      "total_expenses": number,
      "expense_count": number,
      "tax_deductible": number,
      "non_deductible": number
    }
  }
  ```

#### Get Profit Margin
- **GET** `/expenses/profit/margin?period=month`
- **Query Params:**
  - `period`: "week|month|year" (default: "month")
- **Response:**
  ```json
  {
    "financials": {
      "revenue": number,
      "expenses": number,
      "profit": number,
      "profit_margin_percent": string
    }
  }
  ```

---

### Customers

#### List Customers
- **GET** `/customers?sortBy=name&limit=50&offset=0`
- **Query Params:**
  - `search`: "string" (optional, searches name/email/phone)
  - `isActive`: "true|false" (optional)
  - `sortBy`: "name|ltv|purchases|recent" (default: "name")
  - `limit`: Number of records (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:** See Customers section in schemas

#### Create Customer
- **POST** `/customers`
- **Body:**
  ```json
  {
    "name": "string (required, max 255)",
    "email": "email (optional, max 255)",
    "phone": "string (optional, max 20)",
    "company": "string (optional, max 255)",
    "address": "string (optional)",
    "city": "string (optional, max 100)",
    "country": "string (optional, max 100)"
  }
  ```
- **Response:** `{ customer: Customer }`

---

### Inventory

#### List Inventory
- **GET** `/inventory?showLowStock=false&limit=50&offset=0`
- **Query Params:**
  - `showLowStock`: "true|false" (default: false)
  - `limit`: Number of products (default: 50)
  - `offset`: Pagination offset (default: 0)
- **Response:**
  ```json
  {
    "inventory": [
      {
        "id": "uuid",
        "name": "string",
        "sku": "string | null",
        "quantity": number,
        "reorderPoint": number,
        "price": number,
        "isLowStock": boolean,
        "recentActivity": [
          {
            "quantityChange": number,
            "type": "purchase|sale|adjustment|damage|return",
            "createdAt": "ISO datetime"
          }
        ]
      }
    ],
    "summary": {
      "total_items": number,
      "low_stock_count": number,
      "total_inventory_value": number
    },
    "pagination": { ... }
  }
  ```

#### Update Stock
- **PUT** `/inventory/:id/stock`
- **Body:**
  ```json
  {
    "quantity": number (required, min 0),
    "reorderPoint": number (optional, min 0),
    "supplierName": "string (optional, max 255)",
    "supplierCost": number (optional, must be positive)"
  }
  ```
- **Response:** `{ inventory: InventoryItem }`

#### Log Inventory Change
- **POST** `/inventory/log`
- **Body:**
  ```json
  {
    "productId": "uuid (required)",
    "quantityChange": number (required, must be non-zero)",
    "type": "purchase|sale|adjustment|damage|return (required)",
    "notes": "string (optional, max 1000)"
  }
  ```
- **Response:** `{ log: InventoryLog }`

---

## Error Responses

All errors return a JSON object with status code 4xx or 5xx:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message"
}
```

**Common Status Codes:**
- `400`: Bad Request (validation error)
- `401`: Unauthorized (invalid token)
- `403`: Forbidden (no permission)
- `404`: Not Found
- `500`: Internal Server Error

---

## Rate Limiting

API rate limiting may be implemented in the future. No current limits.

---

## Changelog

### Version 1.0.0
- Initial API release
- Pagination support on all list endpoints
- Token-based authentication
