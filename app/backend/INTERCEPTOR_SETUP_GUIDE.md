# API Request/Response Interceptor Implementation Guide

## Overview

This guide explains the new API interceptor system for request/response handling and standardized error responses. The system ensures:
- Consistent API response format across all endpoints
- Request tracing with unique IDs
- Comprehensive request/response logging
- Centralized error handling

## What Was Implemented

### 1. Backend Response Utility (`src/utils/response.util.ts`)

A centralized utility class that standardizes all API responses with consistent formats.

**Key Methods:**
```typescript
ResponseUtil.success(res, data)          // 200 OK
ResponseUtil.created(res, data)          // 201 Created
ResponseUtil.paginated(...)              // Paginated list
ResponseUtil.notFound(res)               // 404 Not Found
ResponseUtil.unauthorized(res)           // 401 Unauthorized
ResponseUtil.forbidden(res)              // 403 Forbidden
ResponseUtil.badRequest(res)             // 400 Bad Request
ResponseUtil.conflict(res)               // 409 Conflict
ResponseUtil.validationError(res)        // 400 Validation Error
ResponseUtil.rateLimitExceeded(res)      // 429 Rate Limited
ResponseUtil.internalError(res)          // 500 Server Error
```

### 2. Request/Response Middleware (`src/middleware/request-response.middleware.ts`)

Intercepts all requests and responses to:
- Generate unique request IDs for tracing
- Log request metadata (IP, user agent, etc.)
- Measure request/response duration
- Add trace headers to responses

**Headers Added:**
- `X-Request-ID`: Unique request identifier
- `X-Response-Time`: Request duration in milliseconds

### 3. Updated Error Handler (`src/middleware/error.middleware.ts`)

Now uses `ResponseUtil` for consistent error responses:
- Validation errors
- Rate limit errors
- Database errors
- Server errors

### 4. Frontend API Interceptors (`frontend/src/lib/api-interceptors.ts`)

Comprehensive request/response handling:
- Automatic token injection
- Request ID generation and tracking
- Response transformation
- Error handling (401, 403, 429, 400, 500)
- User notifications

## Standard Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* your data here */ },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "abc123-def456"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional details */ }
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

## Migration Guide: Updating Controllers

### Before (Old Format)
```typescript
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
```

### After (New Format with ResponseUtil)
```typescript
import { ResponseUtil } from '../utils/response.util';

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

## Controller Update Patterns

### Pattern 1: Simple GET (List)
```typescript
export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    return ResponseUtil.success(res, users);
  } catch (error) {
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### Pattern 2: GET with Pagination
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

### Pattern 3: GET by ID
```typescript
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
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

### Pattern 4: POST (Create)
```typescript
export const createUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    const user = await prisma.user.create({
      data,
    });

    return ResponseUtil.created(res, user);
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

### Pattern 5: PUT (Update)
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return ResponseUtil.notFound(res, 'User not found');
      }
    }
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### Pattern 6: DELETE
```typescript
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.delete({
      where: { id: req.params.id },
    });

    return ResponseUtil.success(res, { message: 'User deleted successfully' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return ResponseUtil.notFound(res, 'User not found');
      }
    }
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### Pattern 7: Handle Conflicts
```typescript
export const createUniqueUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return ResponseUtil.conflict(res, 'Email already registered');
    }

    const user = await prisma.user.create({ data });
    return ResponseUtil.created(res, user);
  } catch (error) {
    if (error instanceof ZodError) {
      return ResponseUtil.validationError(res, 'Invalid data', error.errors);
    }
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

## Frontend Integration

### API Interceptor Features

The frontend API interceptors automatically:

1. **Add Authorization Token**
   ```typescript
   // Automatically adds Bearer token from auth store
   config.headers.Authorization = `Bearer ${token}`;
   ```

2. **Generate Request IDs**
   ```typescript
   const requestId = generateRequestId();
   config.headers['X-Request-ID'] = requestId;
   ```

3. **Log Requests/Responses**
   ```typescript
   // Automatically logs:
   // - Request method, URL, duration
   // - Response status, duration, error details
   ```

4. **Handle Errors**
   ```typescript
   if (error.response?.status === 401) handleUnauthorized();
   if (error.response?.status === 403) handleForbidden();
   if (error.response?.status === 429) handleRateLimit();
   ```

5. **Transform Responses**
   ```typescript
   // Automatically extracts data from success response
   // Converts backend response format to usable data
   ```

### Using in Frontend Components

```typescript
import { earningsAPI } from '../lib/api';

// Simple GET
const earnings = await earningsAPI.getEarnings();

// GET with error handling
try {
  const user = await userAPI.getProfile();
} catch (error) {
  // Error is automatically logged and transformed
  console.error(error);
}

// Create
const newSale = await salesAPI.create({ amount: 100 });

// With pagination (extracted automatically)
const response = await customersAPI.getAll({ limit: 20, offset: 0 });
```

## Request ID Tracking

### Backend
- Generated in `request-response.middleware`
- Available as `(req as any).requestId`
- Included in logs automatically
- Sent to client in `X-Request-ID` header

### Frontend
- Generated in request interceptor
- Sent to backend in `X-Request-ID` header
- Can be used for client-side request tracking
- Received in response for request-response correlation

### Usage in Logs
```typescript
const requestId = (req as any).requestId;
logInfo('Operation completed', {
  requestId,
  userId: req.user?.id,
  // ... other data
});
```

## Testing

### Run Response Utility Tests
```bash
npm test -- response.util.test
```

### Test Coverage
- Success responses
- Error responses
- Paginated responses
- Status codes
- Header management
- Data transformation

## Monitoring & Debugging

### View Request Logs
```
[API Request] requestId: abc123 method: GET url: /api/v1/users
[API Response] requestId: abc123 status: 200 duration: 45ms
```

### Trace Requests
1. Look for `X-Request-ID` in response headers
2. Search logs for that request ID
3. Track the request through all systems

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - Authentication failed
- `FORBIDDEN` - Permission denied
- `CONFLICT` - Resource conflict (e.g., duplicate)
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_ERROR` - Server error

## Performance Considerations

- Request IDs are lightweight (short alphanumeric strings)
- Response wrapping adds minimal overhead (~200 bytes)
- Middleware runs for all requests but has minimal impact
- Logging is asynchronous and non-blocking

## Files Modified/Created

### Created
- `/backend/src/utils/response.util.ts` - Response utility class
- `/backend/src/middleware/request-response.middleware.ts` - Request/response interceptor
- `/backend/src/__tests__/response.util.test.ts` - Tests
- `/frontend/src/lib/api-interceptors.ts` - Frontend interceptors
- `/backend/src/middleware/README.md` - Middleware documentation

### Modified
- `/backend/src/server.ts` - Added middleware
- `/backend/src/middleware/error.middleware.ts` - Uses ResponseUtil
- `/backend/src/middleware/notFound.middleware.ts` - Uses ResponseUtil
- `/backend/src/controllers/auth.controller.ts` - Example implementation
- `/frontend/src/lib/api.ts` - Integrated interceptors

## Next Steps

1. **Update Controllers**: Migrate all controllers to use ResponseUtil (see patterns above)
2. **Test**: Run test suite to ensure everything works
3. **Monitor**: Check logs to ensure request IDs are being tracked
4. **Document**: Add request examples to API docs/Swagger

## Support

For questions or issues:
1. Check the middleware README
2. Review example controllers
3. Check test file for usage examples
4. Look at error handler middleware for error handling patterns
