# Quick Start Guide: Using API Interceptors

## For the Impatient Developer

Get up and running with the new response system in 5 minutes.

---

## Step 1: Import ResponseUtil (30 seconds)

In your controller file, add this import at the top:

```typescript
import { ResponseUtil } from '../utils/response.util';
```

---

## Step 2: Replace Response Calls (2 minutes)

### Pattern 1: Success Response

**Before:**
```typescript
res.json(user);
```

**After:**
```typescript
return ResponseUtil.success(res, user);
```

### Pattern 2: Created Resource

**Before:**
```typescript
res.status(201).json(newUser);
```

**After:**
```typescript
return ResponseUtil.created(res, newUser);
```

### Pattern 3: Not Found

**Before:**
```typescript
res.status(404).json({ error: 'Not found' });
```

**After:**
```typescript
return ResponseUtil.notFound(res, 'User not found');
```

### Pattern 4: Validation Error

**Before:**
```typescript
res.status(400).json({ error: 'Invalid data', details: errors });
```

**After:**
```typescript
return ResponseUtil.validationError(res, 'Invalid data', errors);
```

### Pattern 5: Unauthorized

**Before:**
```typescript
res.status(401).json({ error: 'Unauthorized' });
```

**After:**
```typescript
return ResponseUtil.unauthorized(res, 'Invalid credentials');
```

### Pattern 6: Server Error

**Before:**
```typescript
res.status(500).json({ error: 'Server error' });
```

**After:**
```typescript
return ResponseUtil.internalError(res, error);
```

### Pattern 7: Paginated List

**Before:**
```typescript
res.json({
  data: users,
  total: 100,
  limit: 10,
  offset: 0,
});
```

**After:**
```typescript
return ResponseUtil.paginated(res, users, total, limit, offset);
```

---

## Step 3: Test Your Endpoint (1 minute)

```bash
curl http://localhost:3001/api/v1/users
```

You'll see:
```json
{
  "success": true,
  "data": [...],
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "abc123-def456"
}
```

Done! ✅

---

## All Response Methods

```typescript
// Success responses
ResponseUtil.success(res, data)           // 200 OK
ResponseUtil.created(res, data)           // 201 Created
ResponseUtil.paginated(res, data, total, limit, offset)  // 200 with pagination

// Error responses
ResponseUtil.notFound(res)                // 404
ResponseUtil.unauthorized(res)            // 401
ResponseUtil.forbidden(res)               // 403
ResponseUtil.badRequest(res)              // 400
ResponseUtil.conflict(res)                // 409
ResponseUtil.validationError(res, msg, details)  // 400
ResponseUtil.rateLimitExceeded(res)       // 429
ResponseUtil.internalError(res, error)    // 500
```

---

## Common Examples

### GET Single Item
```typescript
export const getUser = async (req: Request, res: Response) => {
  try {
    const user = await db.user.findUnique({
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

### GET List with Pagination
```typescript
export const listUsers = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const [users, total] = await Promise.all([
      db.user.findMany({ skip: offset, take: limit }),
      db.user.count(),
    ]);

    return ResponseUtil.paginated(res, users, total, limit, offset);
  } catch (error) {
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### POST Create Item
```typescript
export const createUser = async (req: Request, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);

    const user = await db.user.create({ data });

    return ResponseUtil.created(res, user);
  } catch (error) {
    if (error instanceof ZodError) {
      return ResponseUtil.validationError(
        res,
        'Invalid data',
        error.errors
      );
    }
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

### PUT Update Item
```typescript
export const updateUser = async (req: Request, res: Response) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await db.user.update({
      where: { id: req.params.id },
      data,
    });

    return ResponseUtil.success(res, user);
  } catch (error) {
    if (error instanceof ZodError) {
      return ResponseUtil.validationError(res, 'Invalid data', error.errors);
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

### DELETE Item
```typescript
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await db.user.delete({
      where: { id: req.params.id },
    });

    return ResponseUtil.success(res, { message: 'User deleted' });
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

### Validate & Create (Handle Duplicates)
```typescript
export const createEmail = async (req: Request, res: Response) => {
  try {
    const data = emailSchema.parse(req.body);

    const existing = await db.email.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return ResponseUtil.conflict(res, 'Email already exists');
    }

    const email = await db.email.create({ data });

    return ResponseUtil.created(res, email);
  } catch (error) {
    if (error instanceof ZodError) {
      return ResponseUtil.validationError(res, 'Invalid input', error.errors);
    }
    return ResponseUtil.internalError(res, error as Error);
  }
};
```

---

## What Gets Included Automatically

Every response includes:

1. **`success` field** - `true` or `false`
2. **`data` field** (on success) - Your actual data
3. **`error` field** (on error) - Error object with code & message
4. **`timestamp`** - When the response was sent
5. **`requestId`** - Unique ID to trace this request

You don't need to add these - ResponseUtil does it automatically!

---

## Error Format

All errors follow the same format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional, for validation errors */ }
  },
  "timestamp": "2024-01-01T12:00:00.000Z",
  "requestId": "abc123"
}
```

---

## Frontend Gets All This Automatically

No changes needed to frontend! The interceptors automatically:

- ✅ Extract `data` from response
- ✅ Handle 401 → redirect to login
- ✅ Handle 403 → show "access denied" notification
- ✅ Handle 429 → show rate limit notification
- ✅ Handle 400 → show validation error
- ✅ Handle 500 → show "server error" notification
- ✅ Log all requests with request ID
- ✅ Include request ID in error messages

---

## Troubleshooting

### "ResponseUtil is not exported"
- Check import: `import { ResponseUtil } from '../utils/response.util';`
- Make sure you're in a backend file, not frontend

### "Type 'Response' is not assignable to type 'void'"
- This is pre-existing in the codebase. You can:
  1. Add `return` before ResponseUtil calls
  2. Or update the controller type signature

### "Function doesn't return anything"
- Make sure to add `return` before ResponseUtil calls

### "No requestId in logs"
- Verify request-response middleware is enabled in server.ts
- Check that middleware is placed after logging middleware

---

## Status Codes Quick Reference

```typescript
// 2xx Success
200 - ResponseUtil.success()
201 - ResponseUtil.created()

// 4xx Client Error
400 - ResponseUtil.badRequest() or validationError()
401 - ResponseUtil.unauthorized()
403 - ResponseUtil.forbidden()
404 - ResponseUtil.notFound()
409 - ResponseUtil.conflict()
429 - ResponseUtil.rateLimitExceeded()

// 5xx Server Error
500 - ResponseUtil.internalError()
```

---

## Request ID Usage

Get request ID in your controller:

```typescript
const requestId = (req as any).requestId;

logInfo('Something happened', {
  requestId,
  userId: req.user?.id,
  // ... other data
});

// Log output will include requestId automatically
// Users can report issues with this ID for debugging
```

---

## That's It!

Now go update those controllers!

Each one takes about 2-5 minutes to update. Start with the critical ones.

Questions? Check:
- `/backend/INTERCEPTOR_SETUP_GUIDE.md` - Detailed guide
- `/backend/src/middleware/README.md` - Middleware documentation
- `/backend/src/__tests__/response.util.test.ts` - Usage examples

---

## Next Steps

1. **Pick a controller** - Start with something simple like user profile
2. **Update responses** - Replace `res.json()` with ResponseUtil
3. **Add imports** - Import ResponseUtil at the top
4. **Test endpoint** - Make sure response format is correct
5. **Check logs** - Verify requestId is being tracked
6. **Move to next** - Pick another controller and repeat

That's the workflow! Pretty straightforward.

---

Good luck! 🚀
