# EarnTrack API Documentation

Complete REST API documentation for EarnTrack backend.

**Base URL**: `https://your-backend-url.com/api/v1`

---

## Authentication

All API endpoints except `/auth/register` and `/auth/login` require authentication via JWT token.

### Headers

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

---

## Endpoints

### Authentication

#### Register
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepass123",
  "name": "John Doe" // optional
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

#### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepass123"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt-token-here"
}
```

---

### User Profile

#### Get Profile
```http
GET /user/profile
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "timezone": "UTC",
  "currency": "USD",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### Update Profile
```http
PUT /user/profile
```

**Request Body:**
```json
{
  "name": "John Smith", // optional
  "timezone": "America/New_York", // optional
  "currency": "USD" // optional
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Smith",
  "timezone": "America/New_York",
  "currency": "USD"
}
```

#### Change Password
```http
POST /user/change-password
```

**Request Body:**
```json
{
  "currentPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

#### Delete Account
```http
DELETE /user/account
```

**Response:** `204 No Content`

---

### Platforms

#### Get All Platforms
```http
GET /platforms
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Upwork",
    "category": "freelance",
    "color": "#14A800",
    "expectedRate": 50.00,
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

#### Create Platform
```http
POST /platforms
```

**Request Body:**
```json
{
  "name": "Upwork",
  "category": "freelance", // freelance, delivery, services, other
  "color": "#14A800", // optional
  "expectedRate": 50.00 // optional
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Upwork",
  "category": "freelance",
  "color": "#14A800",
  "expectedRate": 50.00,
  "isActive": true
}
```

#### Update Platform
```http
PUT /platforms/:id
```

**Request Body:**
```json
{
  "name": "Upwork Pro", // optional
  "expectedRate": 60.00, // optional
  "isActive": true // optional
}
```

**Response:** `200 OK`

#### Delete Platform
```http
DELETE /platforms/:id
```

**Response:** `204 No Content`

---

### Earnings

#### Get Earnings
```http
GET /earnings?period=month
```

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `all`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "date": "2025-01-15",
    "hours": 8.5,
    "amount": 425.00,
    "notes": "Web development project",
    "platform": {
      "id": "uuid",
      "name": "Upwork",
      "category": "freelance",
      "color": "#14A800"
    },
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

#### Create Earning
```http
POST /earnings
```

**Request Body:**
```json
{
  "platformId": "platform-uuid",
  "date": "2025-01-15",
  "hours": 8.5, // optional
  "amount": 425.00,
  "notes": "Web development project" // optional
}
```

**Response:** `201 Created`

#### Update Earning
```http
PUT /earnings/:id
```

**Request Body:**
```json
{
  "hours": 9.0, // optional
  "amount": 450.00, // optional
  "notes": "Updated notes" // optional
}
```

**Response:** `200 OK`

#### Delete Earning
```http
DELETE /earnings/:id
```

**Response:** `204 No Content`

---

### Goals

#### Get Goals
```http
GET /goals?status=active
```

**Query Parameters:**
- `status` (optional): `active`, `completed`, `cancelled`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Earn $5000 this month",
    "description": "Focus on high-paying clients",
    "targetAmount": 5000.00,
    "currentAmount": 3200.00,
    "deadline": "2025-01-31T23:59:59.000Z",
    "status": "active",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
]
```

#### Create Goal
```http
POST /goals
```

**Request Body:**
```json
{
  "title": "Earn $5000 this month",
  "description": "Focus on high-paying clients", // optional
  "targetAmount": 5000.00,
  "deadline": "2025-01-31T23:59:59.000Z" // optional
}
```

**Response:** `201 Created`

#### Update Goal
```http
PUT /goals/:id
```

**Request Body:**
```json
{
  "title": "Earn $6000 this month", // optional
  "targetAmount": 6000.00, // optional
  "currentAmount": 3500.00, // optional
  "status": "completed" // optional: active, completed, cancelled
}
```

**Response:** `200 OK`

#### Delete Goal
```http
DELETE /goals/:id
```

**Response:** `204 No Content`

#### Update Goal Progress
```http
POST /goals/:id/update-progress
```

Automatically calculates current amount from earnings since goal creation.

**Response:** `200 OK`

---

### Analytics

#### Get Analytics
```http
GET /analytics?period=month
```

**Query Parameters:**
- `period` (optional): `week`, `month`, `year`

**Response:** `200 OK`
```json
{
  "totalEarnings": 12500.00,
  "totalHours": 320.5,
  "avgHourlyRate": 39.01,
  "earningsByPlatform": [
    {
      "platform": "Upwork",
      "amount": 7500.00,
      "percentage": 60.0,
      "color": "#14A800"
    }
  ],
  "earningsByDate": [
    {
      "date": "2025-01-15",
      "amount": 425.00,
      "hours": 8.5
    }
  ],
  "earningsByCategory": [
    {
      "category": "freelance",
      "amount": 10000.00,
      "count": 25
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

---

## Rate Limiting

- **Window**: 15 minutes
- **Max Requests**: 100 per window per IP
- **Response**: `429 Too Many Requests`

---

## Examples

### Using cURL

```bash
# Register
curl -X POST https://api.earntrack.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Login
curl -X POST https://api.earntrack.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Get Platforms (with auth)
curl -X GET https://api.earntrack.com/api/v1/platforms \
  -H "Authorization: Bearer your-jwt-token"

# Create Earning
curl -X POST https://api.earntrack.com/api/v1/earnings \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "platformId":"uuid",
    "date":"2025-01-15",
    "amount":425.00,
    "hours":8.5
  }'
```

### Using JavaScript/Fetch

```javascript
// Register
const response = await fetch('https://api.earntrack.com/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'pass123'
  })
});
const data = await response.json();
const token = data.token;

// Get earnings
const earnings = await fetch('https://api.earntrack.com/api/v1/earnings?period=month', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const earningsData = await earnings.json();
```

---

## Webhooks (Coming Soon)

Future feature: Subscribe to events like:
- `earning.created`
- `goal.completed`
- `platform.added`

---

## Support

For API support:
- Email: api@earntrack.com
- Docs: https://docs.earntrack.com
- Status: https://status.earntrack.com
