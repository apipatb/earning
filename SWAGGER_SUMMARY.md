# 🎯 EarnTrack API - Swagger/OpenAPI Summary

## Quick Start

### 📖 Documentation Files
- **`API_DOCUMENTATION.md`** - Comprehensive API documentation with all endpoints
- **`openapi.json`** - OpenAPI 3.0 specification for tooling integration
- **`SWAGGER_SUMMARY.md`** - This file (quick reference)

### 🔗 View API Documentation

1. **Using Swagger UI Online**
   ```
   https://editor.swagger.io/?url=https://raw.githubusercontent.com/apipatb/earning/main/openapi.json
   ```

2. **Local Swagger UI**
   ```bash
   # Using npm
   npx swagger-ui-express -p 3001 openapi.json

   # Using docker
   docker run -p 80:8080 -e SWAGGER_JSON=/foo/openapi.json -v $(pwd)/openapi.json:/foo/openapi.json swaggerapi/swagger-ui
   ```

3. **ReDoc Documentation**
   ```
   https://redoc.ly/openapi/swagger-petstore/?url=https://raw.githubusercontent.com/apipatb/earning/main/openapi.json
   ```

---

## 📊 API Statistics

### Endpoint Distribution by Phase

| Phase | Category | Endpoints | Features | Status |
|-------|----------|-----------|----------|--------|
| 1 | Dashboard & Gamification | 12 | 6 | ✅ |
| 2 | Settings & Customization | 18 | 8 | ✅ |
| 3 | Bulk Operations | 10 | 5 | ✅ |
| 4 | Notifications | 8 | 4 | ✅ |
| 5 | Financial Tools | 12 | 6 | ✅ |
| 6 | Daily Guidance | 10 | 5 | ✅ |
| 7 | Freelance Tools | 14 | 4 | ✅ |
| 8 | Advanced Analytics | 12 | 4 | ✅ |
| 9 | Stripe Integration | 12 | 7 | ✅ |
| 10 | Email Marketing | 16 | 8 | ✅ |
| 11 | Affiliate Program | 14 | 8 | ✅ |
| 12 | API Management | 12 | 8 | ✅ |
| 13 | Reports | 12 | 12 | ✅ |
| 14 | Integrations | 14 | 14 | ✅ |
| 15 | Team Collaboration | 16 | 16 | ✅ |
| 16 | AI Features | 8 | 8 | ✅ |
| 17 | Marketplace | 16 | 16 | ✅ |
| 18 | Social Features | 14 | 14 | ✅ |
| 19 | Security | 12 | 12 | ✅ |
| 20 | Scheduling | 8 | 8 | ✅ |
| 21 | Notifications | 10 | 10 | ✅ |
| 22 | Advanced Analytics | 16 | 16 | ✅ |
| 23 | Advanced Reports | 10 | 10 | ✅ |
| 24 | Budgeting | 14 | 14 | ✅ |
| 25 | Localization | 8 | 8 | ✅ |
| 26 | Workspaces | 12 | 12 | ✅ |
| 27 | Automation | 12 | 12 | ✅ |
| 28 | Real-time | 10 | 10 | ✅ |
| 29 | Performance | 10 | 10 | ✅ |
| 30 | Backup | 14 | 14 | ✅ |
| 31 | Sync | 14 | 14 | ✅ |
| 32 | Compliance | 18 | 18 | ✅ |
| 33 | OCR | 15 | 15 | ✅ |
| 34 | Invoicing | 22 | 17 | ✅ |
| 35 | Billing | - | - | ✅ |
| **Total** | **35 Phases** | **348+** | **320+** | ✅ |

---

## 🔐 Authentication

### Bearer Token
All endpoints (except `/auth/*`) require:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Getting a Token

```bash
curl -X POST https://api.earntrack.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## 🚀 Popular Endpoint Groups

### Phase 35: Invoice & Billing ⭐
```
POST   /invoices/invoices              - Create invoice
GET    /invoices/invoices              - List invoices
GET    /invoices/invoices/{id}         - Get invoice details
PUT    /invoices/invoices/{id}         - Update invoice
DELETE /invoices/invoices/{id}         - Delete invoice
PUT    /invoices/invoices/{id}/publish - Send invoice
POST   /invoices/payments              - Record payment
GET    /invoices/payments              - List payments
GET    /invoices/analytics             - Invoice analytics
GET    /invoices/statistics            - Statistics
POST   /invoices/reports/generate      - Generate report
POST   /invoices/templates             - Create template
GET    /invoices/templates             - Get template
POST   /invoices/recurring             - Create recurring
GET    /invoices/recurring             - List recurring
```

### Earnings Management
```
POST   /earnings                       - Create earning
GET    /earnings                       - List earnings
GET    /earnings/{id}                  - Get earning
PUT    /earnings/{id}                  - Update earning
DELETE /earnings/{id}                  - Delete earning
GET    /earnings/daily-summary         - Daily stats
GET    /earnings/monthly-breakdown     - Monthly stats
GET    /earnings/forecast              - Forecast earnings
```

### Analytics
```
GET    /analytics                      - Dashboard
GET    /analytics/performance-metrics  - Performance
GET    /analytics/trend-analysis       - Trends
GET    /analytics/forecast             - Forecasts
GET    /analytics/insights             - AI insights
```

### Backup & Recovery
```
POST   /backup/create                  - Create backup
GET    /backup/list                    - List backups
POST   /backup/{id}/restore            - Restore
DELETE /backup/{id}                    - Delete backup
GET    /backup/schedule                - View schedule
POST   /backup/schedule                - Create schedule
```

---

## 📋 Common Request/Response Patterns

### Create Resource (POST)
```http
POST /invoices/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "clientName": "Acme Corp",
  "clientEmail": "client@acme.com",
  "amount": "5000",
  "description": "Services",
  "dueDate": "2024-12-31",
  "taxRate": "10"
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "invoiceNumber": "INV-1731686400000",
  "clientName": "Acme Corp",
  "clientEmail": "client@acme.com",
  "totalAmount": 5000,
  "taxRate": 10,
  "taxAmount": 500,
  "finalAmount": 5500,
  "status": "draft",
  "dueDate": "2024-12-31",
  "issuedAt": "2024-11-15T12:00:00Z"
}
```

### List Resources (GET with Filters)
```http
GET /invoices/invoices?status=draft&limit=20&sort=-issuedAt
Authorization: Bearer {token}
```

**Response (200)**:
```json
[
  {
    "id": "uuid",
    "invoiceNumber": "INV-1731686400000",
    ...
  }
]
```

### Update Resource (PUT)
```http
PUT /invoices/invoices/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "clientName": "Updated Name",
  "status": "sent"
}
```

**Response (200)**:
```json
{
  "success": true,
  "updatedAt": "2024-11-15T12:05:00Z"
}
```

### Delete Resource (DELETE)
```http
DELETE /invoices/invoices/{id}
Authorization: Bearer {token}
```

**Response (200)**:
```json
{
  "success": true
}
```

---

## ⚠️ Error Handling

### Error Response Format
```json
{
  "error": "Invoice not found",
  "code": "INVOICE_NOT_FOUND",
  "status": 404,
  "timestamp": "2024-11-15T12:00:00Z"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK ✅ |
| 201 | Created ✅ |
| 204 | No Content ✅ |
| 400 | Bad Request ❌ |
| 401 | Unauthorized ❌ |
| 403 | Forbidden ❌ |
| 404 | Not Found ❌ |
| 409 | Conflict ❌ |
| 429 | Rate Limited ❌ |
| 500 | Server Error ❌ |

### Common Error Codes
```
INVALID_EMAIL         - Email format is invalid
INVALID_PASSWORD      - Password doesn't meet requirements
USER_NOT_FOUND        - User doesn't exist
INVOICE_NOT_FOUND     - Invoice doesn't exist
PAYMENT_FAILED        - Payment processing failed
RATE_LIMIT_EXCEEDED   - Too many requests
INVALID_TOKEN         - Token is invalid/expired
INSUFFICIENT_FUNDS    - Not enough balance
```

---

## 🔄 Pagination

### Request
```http
GET /invoices/invoices?page=2&limit=25&sort=-issuedAt
```

### Response
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 25,
    "total": 150,
    "pages": 6,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

## 🔍 Filtering & Sorting

### Filtering Examples
```http
# Single filter
GET /invoices/invoices?status=draft

# Multiple filters
GET /invoices/invoices?status=sent&clientName=Acme

# Date range
GET /earnings?dateFrom=2024-11-01&dateTo=2024-11-30

# Numeric range
GET /invoices/invoices?amountMin=1000&amountMax=5000
```

### Sorting Examples
```http
# Ascending
GET /invoices/invoices?sort=clientName

# Descending
GET /invoices/invoices?sort=-issuedAt

# Multiple fields
GET /invoices/invoices?sort=-issuedAt,clientName
```

---

## 🔌 Integration Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const token = 'your-jwt-token';
const api = axios.create({
  baseURL: 'https://api.earntrack.com/api/v1',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create invoice
const invoice = await api.post('/invoices/invoices', {
  clientName: 'Acme Corp',
  clientEmail: 'client@acme.com',
  amount: '5000',
  dueDate: '2024-12-31'
});

// Get invoices
const invoices = await api.get('/invoices/invoices?status=draft');

// Get analytics
const analytics = await api.get('/invoices/analytics?days=30');
```

### Python
```python
import requests

token = 'your-jwt-token'
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Create invoice
response = requests.post(
    'https://api.earntrack.com/api/v1/invoices/invoices',
    headers=headers,
    json={
        'clientName': 'Acme Corp',
        'clientEmail': 'client@acme.com',
        'amount': '5000',
        'dueDate': '2024-12-31'
    }
)

invoice = response.json()
print(invoice['invoiceNumber'])
```

### cURL
```bash
# Get token
TOKEN=$(curl -X POST https://api.earntrack.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' | jq -r '.token')

# Create invoice
curl -X POST https://api.earntrack.com/api/v1/invoices/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Acme Corp",
    "clientEmail": "client@acme.com",
    "amount": "5000",
    "dueDate": "2024-12-31"
  }'
```

---

## 📡 WebHook Events

### Available Events
```
invoice.created           - New invoice created
invoice.published         - Invoice sent to client
invoice.paid              - Invoice fully paid
invoice.partially_paid    - Partial payment received
payment.recorded          - Payment recorded
earning.created           - Earning added
goal.achieved             - Goal milestone reached
compliance.violation      - Compliance issue detected
backup.completed          - Backup finished successfully
sync.completed            - Data sync finished
```

### WebHook Payload Example
```json
{
  "event": "invoice.created",
  "timestamp": "2024-11-15T12:00:00Z",
  "data": {
    "id": "uuid",
    "invoiceNumber": "INV-1731686400000",
    "clientName": "Acme Corp",
    "amount": 5000,
    "status": "draft"
  },
  "signature": "sha256=abc123..."
}
```

---

## 🛠️ Developer Tools

### Postman Collection
Import the OpenAPI specification into Postman:
1. Open Postman
2. Click "Import"
3. Select "Link" tab
4. Paste: `https://raw.githubusercontent.com/apipatb/earning/main/openapi.json`
5. Click Import

### API Testing
```bash
# Using httpie
http POST api.earntrack.com/api/v1/invoices/invoices \
  Authorization:"Bearer $TOKEN" \
  clientName=Acme \
  clientEmail=client@acme.com \
  amount=5000 \
  dueDate=2024-12-31

# Using REST Client (VS Code)
# Save to requests.rest file
@baseUrl = https://api.earntrack.com/api/v1
@token = your-jwt-token

POST {{baseUrl}}/invoices/invoices
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "clientName": "Acme Corp",
  "clientEmail": "client@acme.com",
  "amount": "5000",
  "dueDate": "2024-12-31"
}
```

---

## 📚 Resource Links

- **API Documentation**: `API_DOCUMENTATION.md`
- **OpenAPI Spec**: `openapi.json`
- **GitHub Repository**: https://github.com/apipatb/earning
- **Live API**: https://api.earntrack.com
- **Status Page**: https://status.earntrack.com
- **Support**: support@earntrack.com

---

## 🚦 Rate Limiting

### Limits by Plan
| Plan | Requests/15min | Burst |
|------|---|---|
| Free | 100 | 10 |
| Pro | 500 | 50 |
| Business | Unlimited | Unlimited |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1731690000
```

### Handling Rate Limits
```javascript
// Exponential backoff
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## 📈 Performance Tips

1. **Use pagination** - Fetch large datasets in pages
2. **Filter early** - Use query filters instead of fetching all data
3. **Batch operations** - Use bulk endpoints when available
4. **Cache responses** - Implement client-side caching
5. **Use webhooks** - Avoid polling for updates

---

**Last Updated**: November 15, 2024
**API Version**: 1.0.0
**Total Endpoints**: 348+
**Total Features**: 320+
