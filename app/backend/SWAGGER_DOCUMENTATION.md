# EarnTrack API - Swagger/OpenAPI Documentation

## Overview

Complete OpenAPI 3.0.0 specification and Swagger UI documentation have been successfully generated for the EarnTrack backend API.

## Installation & Setup

### Dependencies Installed
- `swagger-ui-express` - Express middleware for serving Swagger UI
- `swagger-jsdoc` - JSDoc to OpenAPI/Swagger conversion tool

### Files Created

1. **`/home/user/earning/app/backend/src/lib/swagger.ts`**
   - Main OpenAPI 3.0.0 specification configuration
   - Defines API metadata, servers, security schemes, and reusable schemas
   - API Title: "EarnTrack API"
   - Description: "Business earnings and management platform API"
   - Version: 1.0.0
   - Contact: support@earntrack.com

2. **`/home/user/earning/app/backend/src/lib/swagger-routes.ts`**
   - Comprehensive endpoint documentation in JSDoc format
   - Parsed by swagger-jsdoc to generate OpenAPI spec
   - Includes request/response schemas, parameters, and examples for all endpoints

3. **Updated `/home/user/earning/app/backend/src/server.ts`**
   - Added Swagger UI middleware
   - Configured `/api/docs` endpoint for Swagger UI
   - Configured `/api/openapi.json` endpoint for raw OpenAPI JSON

## Accessing the Documentation

### Interactive Swagger UI
Once the server is running, visit:
- **Development**: http://localhost:5000/api/docs
- **Alternative**: http://localhost:3001/api/docs

### Raw OpenAPI JSON Specification
- http://localhost:5000/api/openapi.json
- http://localhost:3001/api/openapi.json

## Security Configuration

All endpoints (except `/auth/register` and `/auth/login`) require JWT Bearer token authentication:

```
Authorization: Bearer <JWT_TOKEN>
```

The security scheme is defined as:
- Type: HTTP
- Scheme: bearer
- Format: JWT

## API Endpoints Documented

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user and receive JWT token
- `GET /user/profile` - Get authenticated user's profile

### Earnings
- `GET /earnings` - Get all earnings (with pagination and filtering)
- `POST /earnings` - Create a new earning
- `PUT /earnings/{id}` - Update an earning
- `DELETE /earnings/{id}` - Delete an earning

### Invoices
- `GET /invoices` - Get all invoices (with status filtering)
- `GET /invoices/{id}` - Get invoice details
- `POST /invoices` - Create a new invoice
- `PUT /invoices/{id}` - Update an invoice
- `DELETE /invoices/{id}` - Delete an invoice

### Sales
- `GET /sales` - Get all sales (with status filtering)
- `GET /sales/summary` - Get sales summary
- `POST /sales` - Create a new sale
- `PUT /sales/{id}` - Update a sale
- `DELETE /sales/{id}` - Delete a sale

### Customers
- `GET /customers` - Get all customers (with search and pagination)
- `GET /customers/{id}` - Get customer details
- `GET /customers/top` - Get top customers
- `POST /customers` - Create a new customer
- `PUT /customers/{id}` - Update a customer
- `DELETE /customers/{id}` - Delete a customer

### Products
- `GET /products` - Get all products (with category filtering)
- `POST /products` - Create a new product
- `PUT /products/{id}` - Update a product
- `DELETE /products/{id}` - Delete a product

### Expenses
- `GET /expenses` - Get all expenses (with category and date filtering)
- `GET /expenses/summary` - Get expense summary
- `GET /expenses/profit/margin` - Get profit margin calculation
- `POST /expenses` - Create a new expense
- `PUT /expenses/{id}` - Update an expense
- `DELETE /expenses/{id}` - Delete an expense

## Request/Response Schemas

All endpoints are documented with complete request and response schemas, including:

### Common Schemas
- **User** - User profile information
- **AuthToken** - JWT authentication response
- **Error** - Standard error response
- **PaginatedResponse** - Pagination metadata

### Domain Schemas
- **Earning** - Earnings entry with amount, date, category
- **Invoice** - Invoice with customer, dates, amounts, status
- **Sale** - Sales transaction with customer, product, quantity
- **Customer** - Customer information and contact details
- **Product** - Product with pricing and inventory
- **Expense** - Business expense with category and receipt

## Parameters & Response Codes

Each endpoint includes:

### Query Parameters
- Pagination (page, limit)
- Filtering (status, category, date ranges)
- Search fields

### Path Parameters
- Resource IDs in UUID format

### Response Codes
- **200** - Success (GET requests)
- **201** - Created (POST requests)
- **400** - Bad request (validation errors)
- **401** - Unauthorized (missing/invalid token)
- **404** - Not found (resource doesn't exist)
- **500** - Server error

## Server Configuration

The OpenAPI specification includes server configurations:

```yaml
servers:
  - url: http://localhost:5000/api/v1
    description: Development server
  - url: http://localhost:3001/api/v1
    description: Local development server (alternative)
  - url: https://api.earntrack.com/api/v1
    description: Production server
```

## Running the Server

To start the backend and access Swagger documentation:

```bash
npm run dev
```

Then navigate to:
- Swagger UI: http://localhost:5000/api/docs
- OpenAPI JSON: http://localhost:5000/api/openapi.json

## Testing Endpoints in Swagger UI

1. Visit http://localhost:5000/api/docs
2. Endpoints are organized by tags (Authentication, Earnings, Invoices, etc.)
3. Click any endpoint to expand and see:
   - Description and parameters
   - Request body schema
   - Response examples and schemas
   - Try it out button to test directly

## Example Usage

### Register User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

### Create Earning (with JWT token)
```bash
curl -X POST http://localhost:5000/api/v1/earnings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 150.50,
    "date": "2024-01-15T10:30:00Z",
    "description": "Completed freelance project",
    "category": "freelance"
  }'
```

## Integration

The Swagger documentation is fully integrated into the Express server and:
- Automatically serves UI at `/api/docs`
- Provides machine-readable spec at `/api/openapi.json`
- Supports all authentication methods
- Documents all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Includes rate limiting and CORS policies

## Additional Features

- JWT Bearer token authentication scheme
- Complete error response documentation
- Pagination metadata in responses
- Category/status enumerations
- Date/datetime format specifications
- UUID identifiers
- Decimal number formatting for monetary values

## Notes

- All documentation is generated automatically from `swagger-jsdoc` using JSDoc comments
- OpenAPI spec conforms to OpenAPI 3.0.0 standard
- Swagger UI provides interactive testing capabilities
- Documentation can be exported/imported into other tools (Postman, Insomnia, etc.)
