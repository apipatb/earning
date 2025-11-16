# EarnTrack API - Quick Reference Guide

## Start Here

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open Swagger UI:**
   - http://localhost:3001/api/docs
   - or http://localhost:5000/api/docs

3. **View OpenAPI JSON:**
   - http://localhost:3001/api/openapi.json

## Files Location

| File | Location | Purpose |
|------|----------|---------|
| OpenAPI Spec | `/home/user/earning/app/backend/src/lib/swagger.ts` | Main configuration |
| Endpoints Doc | `/home/user/earning/app/backend/src/lib/swagger-routes.ts` | All endpoints |
| Server Changes | `/home/user/earning/app/backend/src/server.ts` | Swagger integration |
| Full Documentation | `/home/user/earning/app/backend/SWAGGER_DOCUMENTATION.md` | Complete reference |
| Quick Start | `/home/user/earning/app/backend/API_DOCUMENTATION_GUIDE.md` | Usage guide |
| Summary | `/home/user/earning/app/backend/IMPLEMENTATION_SUMMARY.txt` | What was done |

## All 20 Documented Endpoints

### Authentication (3)
```
POST   /api/v1/auth/register      Register new user
POST   /api/v1/auth/login         Login and get JWT
GET    /api/v1/user/profile       Get user profile
```

### Earnings (4)
```
GET    /api/v1/earnings           List earnings
POST   /api/v1/earnings           Create earning
PUT    /api/v1/earnings/{id}      Update earning
DELETE /api/v1/earnings/{id}      Delete earning
```

### Invoices (5)
```
GET    /api/v1/invoices           List invoices
POST   /api/v1/invoices           Create invoice
GET    /api/v1/invoices/{id}      Get invoice
PUT    /api/v1/invoices/{id}      Update invoice
DELETE /api/v1/invoices/{id}      Delete invoice
```

### Sales (2)
```
GET    /api/v1/sales              List sales
POST   /api/v1/sales              Create sale
```

### Customers (2)
```
GET    /api/v1/customers          List customers
POST   /api/v1/customers          Create customer
```

### Products (2)
```
GET    /api/v1/products           List products
POST   /api/v1/products           Create product
```

### Expenses (2)
```
GET    /api/v1/expenses           List expenses
POST   /api/v1/expenses           Create expense
```

## Authentication

1. Register or login to get JWT token
2. Copy token from response
3. In Swagger UI, click "Authorize" button
4. Enter: `Bearer YOUR_TOKEN_HERE`
5. All authenticated endpoints now work

## Curl Examples

### Register
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

### Create Earning (with token)
```bash
curl -X POST http://localhost:3001/api/v1/earnings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 150.50,
    "date": "2024-01-15T10:30:00Z",
    "description": "Freelance project",
    "category": "freelance"
  }'
```

## API Features

- **Interactive Testing**: Try endpoints directly in Swagger UI
- **Request/Response Examples**: See exactly what data is expected
- **Status Codes**: 200, 201, 400, 401, 404, 500 documented
- **Pagination**: Supported on list endpoints (page, limit)
- **Filtering**: Filter by status, category, date, etc.
- **Search**: Search by name, email, etc.
- **JWT Authentication**: Bearer token security

## Response Schemas

All documented with examples:
- User, AuthToken, Earning, Invoice, Sale
- Customer, Product, Expense, Error
- PaginatedResponse with metadata

## Support

- Full documentation: `SWAGGER_DOCUMENTATION.md`
- Quick start guide: `API_DOCUMENTATION_GUIDE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.txt`
- Contact: support@earntrack.com

## Ready to Go!

The API is fully documented and ready for:
- Frontend development
- Mobile app development
- Third-party integrations
- Code generation
- Testing and QA
