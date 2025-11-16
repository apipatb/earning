# EarnTrack API Documentation Index

Welcome to the EarnTrack API documentation! This guide will help you navigate all available API documentation resources.

## Quick Links

### 📚 Getting Started
- **[Complete API Documentation](./API.md)** - Comprehensive guide to all API endpoints with examples
- **[OpenAPI Specification](./openapi.yaml)** - Machine-readable OpenAPI 3.0 specification

### 🎯 Interactive Documentation
**While the API is running:**
- **[Swagger UI](http://localhost:3001/api-docs)** - Interactive API explorer
- **[API Specification (JSON)](http://localhost:3001/api-spec)** - Raw OpenAPI spec in JSON
- **[API Specification (YAML)](http://localhost:3001/api-spec.yaml)** - Raw OpenAPI spec in YAML

### 🏥 Health Check
- **[GET /health](http://localhost:3001/health)** - API health status

---

## Documentation Overview

### What's in This Directory

```
docs/
├── INDEX.md           ← You are here
├── API.md             ← Detailed endpoint documentation
└── openapi.yaml       ← OpenAPI 3.0 specification
```

### What's Available at Runtime

When you start the API server, these endpoints become available:

| Endpoint | Type | Purpose |
|----------|------|---------|
| `/api-docs` | HTML | Interactive Swagger UI documentation |
| `/api-spec` | JSON | OpenAPI specification in JSON format |
| `/api-spec.yaml` | YAML | OpenAPI specification in YAML format |
| `/docs` | Redirect | Redirects to `/api-docs` |
| `/health` | JSON | API health check |

---

## API Endpoints by Category

### Authentication (No Auth Required)
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### User Management
- `GET /api/v1/user/profile` - Get profile
- `PUT /api/v1/user/profile` - Update profile
- `POST /api/v1/user/change-password` - Change password
- `DELETE /api/v1/user/account` - Delete account

### Financial Management
- `GET /api/v1/analytics/summary` - Analytics summary
- `GET /api/v1/earnings` - List earnings
- `POST /api/v1/earnings` - Create earning
- `GET /api/v1/expenses` - List expenses
- `POST /api/v1/expenses` - Create expense
- `GET /api/v1/invoices` - List invoices
- `POST /api/v1/invoices` - Create invoice

### Business Management
- `GET /api/v1/customers` - List customers
- `POST /api/v1/customers` - Create customer
- `GET /api/v1/products` - List products
- `POST /api/v1/products` - Create product
- `GET /api/v1/sales` - List sales
- `POST /api/v1/sales` - Create sale

### Platform Management
- `GET /api/v1/platforms` - List platforms
- `POST /api/v1/platforms` - Create platform

### Inventory Management
- `GET /api/v1/inventory` - List inventory
- `PUT /api/v1/inventory/{id}/stock` - Update stock
- `POST /api/v1/inventory/log` - Log inventory change

### Goals
- `GET /api/v1/goals` - List goals
- `POST /api/v1/goals` - Create goal

---

## Documentation Structure

### API.md (Detailed Documentation)
Comprehensive documentation including:
- **Quick Start** - Base URLs, authentication, rate limiting
- **Authentication** - Register and login endpoints
- **User Management** - Profile, password, account operations
- **Platform Management** - Create and manage earning platforms
- **Earnings** - Track income records
- **Expenses** - Track business expenses
- **Invoices** - Create and manage invoices
- **Customers** - Manage client information
- **Products** - Product management
- **Sales** - Track sales records
- **Inventory** - Stock and inventory management
- **Goals** - Financial goal tracking
- **Analytics** - Financial analytics and reporting
- **Error Handling** - HTTP status codes and error responses
- **Best Practices** - Security, caching, pagination recommendations
- **Example Workflow** - Complete curl examples

### openapi.yaml (OpenAPI 3.0 Specification)
Machine-readable specification including:
- **Info** - API title, version, contact
- **Servers** - Development and production base URLs
- **Components** - All data schemas and security schemes
- **Paths** - All 80+ endpoints with request/response schemas
- **Security** - JWT Bearer token authentication

---

## Getting Started

### 1. Read the Documentation
Start with [API.md](./API.md) to understand:
- Available endpoints
- Request/response formats
- Validation rules
- Authentication requirements

### 2. Interactive Exploration
Once the API is running, visit `/api-docs` (Swagger UI) to:
- See all endpoints visually
- Read detailed descriptions
- Try requests directly in the browser
- View request/response examples

### 3. Integrate with Your App
Use the OpenAPI spec to:
- Generate client libraries (openapi-generator)
- Validate requests before sending
- Generate documentation in other formats
- Set up API monitoring

---

## Authentication

All endpoints except `/auth/register` and `/auth/login` require authentication.

**Method:** JWT Bearer Token

**Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

**Getting a Token:**
1. Register: `POST /api/v1/auth/register`
2. Login: `POST /api/v1/auth/login`
3. Use returned `token` in Authorization header

---

## Rate Limiting

**Production:** 50 requests per 15 minutes
**Development:** 100 requests per 15 minutes

Header: `RateLimit-Remaining` shows remaining requests

---

## Response Format

### Success Response (2xx)
```json
{
  "data": {},
  "message": "Operation successful"
}
```

### Error Response (4xx, 5xx)
```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 429 | Rate Limited |
| 500 | Server Error |

---

## Tools & Integration

### OpenAPI Generator
Generate client libraries in multiple languages:
```bash
# JavaScript/TypeScript
openapi-generator-cli generate \
  -i /api-spec.yaml \
  -g typescript-fetch \
  -o ./generated-client

# Python
openapi-generator-cli generate \
  -i /api-spec.yaml \
  -g python \
  -o ./generated-client
```

### Postman Import
1. Copy the OpenAPI spec from `/api-spec.yaml`
2. Open Postman
3. File → Import
4. Paste the YAML content
5. Collections will be automatically created

### Insomnia Import
1. Create new request collection
2. Design → Import → OpenAPI 3
3. Paste `/api-spec.yaml` URL or content
4. Collections will be automatically created

---

## Development

### Running the API Server

```bash
cd app/backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run development server
npm run dev
```

The API will be available at `http://localhost:3001`

### Swagger UI During Development
Once the server is running:
- Visit `http://localhost:3001/api-docs`
- All endpoints are interactive
- Try requests directly in the browser

### API Specification Files
View the specifications:
- JSON: `http://localhost:3001/api-spec`
- YAML: `http://localhost:3001/api-spec.yaml`

---

## Deployment

### Docker
The API comes with Docker support:

```bash
# Build image
docker build -t earntrack-api .

# Run container
docker run -p 3001:3001 earntrack-api
```

See `DOCKER_README.md` for complete Docker setup.

### Environment Variables
Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `NODE_ENV` - Set to "production"
- `SENTRY_DSN` - Error tracking (optional)

---

## Monitoring & Debugging

### Sentry Integration
The API includes Sentry error tracking:
- Automatic error capturing
- Performance monitoring
- Request tracking
- User context tracking

Configure with `SENTRY_DSN` environment variable.

### Health Check
Check API status:
```bash
curl http://localhost:3001/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Security

### Best Practices
1. **Never expose JWT tokens** in logs or URLs
2. **Store tokens securely** (HttpOnly cookies)
3. **Use HTTPS in production** (enforced via Helmet.js)
4. **Validate all inputs** on server side
5. **Implement rate limiting** (already enabled)
6. **Log security events** (Sentry integration)

### CORS Configuration
Configured to accept requests from:
- `http://localhost:5173` (Frontend dev)
- `http://localhost:3000` (Alternative dev)

Modify `ALLOWED_ORIGINS` for production.

---

## Support & Troubleshooting

### Common Issues

**"Invalid token" error:**
- Ensure token is included in Authorization header
- Check token hasn't expired
- Verify token format: `Bearer <token>`

**"Too many requests" error:**
- Rate limit exceeded
- Wait for rate limit window to reset
- Implement exponential backoff in client

**"Validation error" response:**
- Check request body format
- Verify all required fields are present
- Match expected data types

### Getting Help
- Check [API.md](./API.md) for endpoint details
- Review OpenAPI spec for request/response schemas
- Check server logs for detailed error messages
- Enable Sentry for error tracking

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2024 | Initial release with comprehensive OpenAPI docs |

---

## Related Documentation

- **[Docker Setup](../../../DOCKER_README.md)** - Containerization guide
- **[Database Optimization](../../../DATABASE_OPTIMIZATION.md)** - Query optimization
- **[Backend Guide](../../../DEVELOPMENT.md)** - Development guide

---

**Last Updated:** January 2024
**API Status:** Active ✓
