# API Request/Response Interceptor System

## Overview

This directory contains the middleware that handles request/response interception, logging, and standardization. The system provides consistent error handling, request tracing, and response formatting across the entire API.

## Key Components

### 1. Request/Response Middleware (`request-response.middleware.ts`)

Handles:
- Unique request ID generation for tracing
- Request/response timing
- Request/response logging
- Response headers (X-Request-ID, X-Response-Time)

**Features:**
- Generates unique request IDs for tracking across logs
- Captures request start time and calculates duration
- Logs all requests and responses with appropriate log levels
- Adds request ID to response headers for client-side tracing

### 2. Error Handler Middleware (`error.middleware.ts`)

Handles:
- Centralized error handling
- Error response standardization
- Rate limit errors
- Validation errors
- Database errors
- Server errors

**Uses ResponseUtil for consistent error responses**

### 3. Not Found Middleware (`notFound.middleware.ts`)

Handles:
- 404 Not Found responses
- Uses ResponseUtil for consistency

## Response Utility (`../utils/response.util.ts`)

Provides standardized response methods:

### Success Responses

```typescript
// Standard success response
ResponseUtil.success(res, data, message?, statusCode?)

// Created response (201)
ResponseUtil.created(res, data)

// Paginated response
ResponseUtil.paginated(res, data, total, limit, offset)
```

### Error Responses

```typescript
// Generic error
ResponseUtil.error(res, error, code, statusCode, details?)

// Specific error types
ResponseUtil.notFound(res, message?)
ResponseUtil.unauthorized(res, message?)
ResponseUtil.forbidden(res, message?)
ResponseUtil.badRequest(res, message?)
ResponseUtil.conflict(res, message?)
ResponseUtil.validationError(res, message?, details?)
ResponseUtil.rateLimitExceeded(res, retryAfter?, details?)
ResponseUtil.internalError(res, error?)
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { /* data */ },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123-def456"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { /* optional error details */ }
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123-def456"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* array of items */ ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "pages": 10
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123-def456"
}
```

## Request ID Tracking

Every request gets a unique ID that is:
- Generated in `request-response.middleware`
- Available in all controllers via `(req as any).requestId`
- Included in all response headers as `X-Request-ID`
- Logged with every log entry
- Useful for distributed tracing and debugging

## Using in Controllers

### Example: Success Response

```typescript
import { ResponseUtil } from '../utils/response.util';

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      return ResponseUtil.notFound(res, 'User not found');
    }

    return ResponseUtil.success(res, user);
  } catch (error) {
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### Example: Created Response

```typescript
export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.create({
      data: req.body,
    });

    return ResponseUtil.created(res, user);
  } catch (error) {
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### Example: Validation Error

```typescript
export const updateUser = async (req: Request, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
    });

    return ResponseUtil.success(res, user);
  } catch (error) {
    if (error instanceof ZodError) {
      return ResponseUtil.validationError(
        res,
        'Invalid request data',
        error.errors
      );
    }
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### Example: Paginated Response

```typescript
export const listUsers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip: offset, take: limit }),
      prisma.user.count(),
    ]);

    return ResponseUtil.paginated(res, users, total, limit, offset);
  } catch (error) {
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

## Middleware Stack Order

The middleware is applied in the following order in `server.ts`:

1. Helmet - Security headers
2. Security Headers Middleware
3. CORS
4. Body Parsing
5. **Logging Middleware** - Request logging
6. **Request/Response Middleware** - Request ID & tracing
7. Metrics Middleware
8. Cache Middleware
9. Sanitization Middleware
10. Input Validation Middleware
11. Rate Limiting
12. Routes
13. Not Found Middleware
14. **Error Handler Middleware** - Error handling

## Testing

Tests are provided in `src/__tests__/response.util.test.ts`:

```bash
npm test -- response.util.test
```

Tests cover:
- All response methods
- Correct status codes
- Data structure validation
- Error handling
- Pagination calculations
- Header management

## Integration with Frontend

The frontend interceptors (`src/lib/api-interceptors.ts`) automatically:
- Add request IDs for tracing
- Handle request/response logging
- Transform responses using the standard format
- Handle specific HTTP errors (401, 403, 429, 400, 500)
- Show user-friendly notifications

## Best Practices

1. **Always use ResponseUtil** for consistent responses
2. **Include request ID** in logs via middleware
3. **Use specific error types** (notFound, unauthorized, etc.)
4. **Include error details** when helpful for debugging
5. **Handle 401/403** gracefully on the frontend
6. **Log important operations** with request context
7. **Test error scenarios** with different status codes

## Monitoring

Request/response data is logged with the following information:
- Request ID
- HTTP method and URL
- Status code
- Response duration
- User ID (if authenticated)
- IP address
- Error code and message (for errors)

This data can be aggregated for:
- Performance monitoring
- Error tracking
- User behavior analysis
- Security auditing
- Distributed tracing
