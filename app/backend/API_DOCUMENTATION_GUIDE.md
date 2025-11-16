# EarnTrack API Documentation - Quick Start Guide

## Files Created/Modified

### New Files
1. **`src/lib/swagger.ts`** (508 lines)
   - OpenAPI 3.0.0 specification configuration
   - Defines all schemas, security schemes, servers
   - Uses swagger-jsdoc to parse documentation

2. **`src/lib/swagger-routes.ts`** (858 lines)
   - Comprehensive JSDoc-based endpoint documentation
   - Covers all 20+ endpoints across 7 API domains
   - Includes request/response examples and schemas

3. **`SWAGGER_DOCUMENTATION.md`**
   - Complete documentation reference guide
   - Lists all endpoints and their features
   - Provides usage examples

4. **`API_DOCUMENTATION_GUIDE.md`** (this file)
   - Quick start guide
   - File references and status

### Modified Files
1. **`src/server.ts`**
   - Added swagger-ui-express import
   - Added Swagger UI middleware at `/api/docs`
   - Added OpenAPI JSON endpoint at `/api/openapi.json`

## Installation

Dependencies have been installed:
```bash
npm install swagger-ui-express swagger-jsdoc
```

## Verification Status

All verification checks passed:

```
✓ Swagger.ts file found and readable
✓ Swagger JSDoc package imported
✓ API title configured ("EarnTrack API")
✓ JWT Bearer authentication scheme configured
✓ Swagger-routes.ts file found and readable
✓ Auth endpoints documented (3)
✓ Earnings endpoints documented (4)
✓ Invoice endpoints documented (5)
✓ Sales endpoints documented (2)
✓ Customer endpoints documented (2)
✓ Product endpoints documented (2)
✓ Expense endpoints documented (2)
✓ Swagger UI endpoint (/api/docs) configured
✓ OpenAPI JSON endpoint configured
✓ All 20 endpoints documented
✓ All 10 response schemas configured
```

## How to Use

### 1. Start the Backend Server
```bash
npm run dev
```

The server starts at: `http://localhost:3001` or `http://localhost:5000`

### 2. Access Swagger UI
Open your browser and visit:
```
http://localhost:3001/api/docs
http://localhost:5000/api/docs
```

### 3. View OpenAPI Specification
Raw JSON specification available at:
```
http://localhost:3001/api/openapi.json
http://localhost:5000/api/openapi.json
```

### 4. Test Endpoints
In Swagger UI:
1. Find the endpoint you want to test
2. Click "Try it out" button
3. Fill in parameters/request body
4. Click "Execute"
5. See the response

### 5. Get JWT Token
1. First, register or login:
   - POST `/auth/register` - Create new account
   - POST `/auth/login` - Get JWT token
2. Copy the token from response
3. Click "Authorize" button in Swagger UI
4. Enter: `Bearer <your_token_here>`
5. All authenticated endpoints now work

## Endpoint Organization

Endpoints are organized by tags:

### 1. Authentication (3 endpoints)
- Register new user
- Login and get JWT token
- Get user profile

### 2. Earnings (4 endpoints)
- List all earnings
- Create earning
- Update earning
- Delete earning

### 3. Invoices (5 endpoints)
- List invoices
- Get invoice details
- Create invoice
- Update invoice
- Delete invoice

### 4. Sales (2 endpoints)
- List sales
- Create sale

### 5. Customers (2 endpoints)
- List customers
- Create customer

### 6. Products (2 endpoints)
- List products
- Create product

### 7. Expenses (2 endpoints)
- List expenses
- Create expense

## Features Documented

### For Every Endpoint:
- Description and purpose
- Required authentication
- Query parameters (with types)
- Path parameters
- Request body schema
- Response schemas
- HTTP status codes
- Error responses
- Example requests and responses

### Request/Response Examples
Each endpoint includes examples like:

```json
{
  "amount": 150.50,
  "date": "2024-01-15T10:30:00Z",
  "description": "Completed freelance project",
  "category": "freelance"
}
```

### Status Codes Documented
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Server Error

## Authentication

All endpoints except `/auth/register` and `/auth/login` require JWT Bearer token:

1. Login to get token:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com", "password":"password"}'
```

2. Use token in requests:
```bash
curl -X GET http://localhost:3001/api/v1/earnings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. In Swagger UI:
   - Click "Authorize" button
   - Paste: `Bearer YOUR_TOKEN`

## Data Schemas

All documented with full details:

- **User** - Profile info
- **AuthToken** - JWT response
- **Earning** - Income entry
- **Invoice** - Bill/payment request
- **Sale** - Transaction record
- **Customer** - Client info
- **Product** - Item for sale
- **Expense** - Cost entry
- **Error** - Standard error
- **PaginatedResponse** - List pagination

## Filtering & Pagination

Supported on list endpoints:

```bash
# Get page 2 with 20 items per page
GET /earnings?page=2&limit=20

# Filter by category
GET /earnings?category=freelance

# Filter by date range
GET /earnings?startDate=2024-01-01&endDate=2024-12-31

# Search
GET /customers?search=acme
```

## Import into Other Tools

The OpenAPI spec can be imported into:
- Postman
- Insomnia
- VS Code REST Client
- API platforms
- Code generators

URL: `http://localhost:3001/api/openapi.json`

## Troubleshooting

### Swagger UI Not Loading
- Check server is running: `npm run dev`
- Verify URL: `http://localhost:3001/api/docs`
- Check port in `.env` or code

### "Unauthorized" Error
- Make sure you're authenticated
- Click "Authorize" in Swagger UI
- Provide valid JWT token

### Endpoint Not Found
- Check endpoint path matches docs
- Ensure `/api/v1/` prefix is used
- Verify request method (GET/POST/PUT/DELETE)

## API Versioning

All endpoints are under `/api/v1/`:
```
http://localhost:3001/api/v1/earnings
http://localhost:3001/api/v1/invoices
```

## Documentation Format

Uses OpenAPI 3.0.0 standard format:
- YAML/JSON compatible
- Tool agnostic
- Industry standard
- Widely supported

## Maintenance

To update documentation:
1. Edit endpoint docs in `src/lib/swagger-routes.ts`
2. Or edit schemas in `src/lib/swagger.ts`
3. Changes reflected immediately on `http://localhost:3001/api/docs`
4. No build required

## Next Steps

1. Start the server: `npm run dev`
2. Visit: `http://localhost:3001/api/docs`
3. Explore endpoints
4. Test with "Try it out"
5. Generate code from spec if needed

---

**API Version**: 1.0.0
**OpenAPI Version**: 3.0.0
**Documentation Tool**: Swagger UI + swagger-jsdoc
**Authentication**: JWT Bearer Token
**Contact**: support@earntrack.com
