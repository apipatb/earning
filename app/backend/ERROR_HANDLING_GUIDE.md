# Error Handling Guide

This guide explains the comprehensive error handling system implemented in the backend application.

## Table of Contents

1. [Custom Error Classes](#custom-error-classes)
2. [Error Utilities](#error-utilities)
3. [Retry Logic](#retry-logic)
4. [Middleware](#middleware)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)

## Custom Error Classes

All custom errors extend the `AppError` base class located in `/app/backend/src/errors/AppError.ts`.

### Available Error Types

#### 1. **ValidationError** (400)
Used for input validation failures.

```typescript
import { ValidationError } from '../errors';

throw new ValidationError('Email is required', {
  field: 'email',
  value: providedValue
});
```

#### 2. **NotFoundError** (404)
Used when a requested resource doesn't exist.

```typescript
import { NotFoundError } from '../errors';

throw new NotFoundError('User', userId);
// Output: "User with identifier 'userId' not found"
```

#### 3. **UnauthorizedError** (401)
Used for authentication failures.

```typescript
import { UnauthorizedError } from '../errors';

throw new UnauthorizedError('Invalid credentials');
```

#### 4. **ForbiddenError** (403)
Used for authorization/permission failures.

```typescript
import { ForbiddenError } from '../errors';

throw new ForbiddenError('Access forbidden', {
  requiredRole: 'admin',
  userRole: 'user'
});
```

#### 5. **ConflictError** (409)
Used when a resource already exists.

```typescript
import { ConflictError } from '../errors';

throw new ConflictError('Email already exists', {
  email: existingEmail
});
```

#### 6. **DatabaseError** (500)
Used for database operation failures.

```typescript
import { DatabaseError } from '../errors';

throw new DatabaseError('Failed to insert record', 'INSERT', {
  table: 'users'
});
```

#### 7. **ExternalServiceError** (502)
Used when external API/service calls fail.

```typescript
import { ExternalServiceError } from '../errors';

throw new ExternalServiceError(
  'Stripe',
  'Payment gateway unavailable',
  true // isRetryable
);
```

#### 8. **FileOperationError** (500)
Used for file operations (upload, download, delete, scan, generate).

```typescript
import { FileOperationError } from '../errors';

throw new FileOperationError(
  'upload',
  'Failed to upload file to S3',
  { fileName, s3Key }
);
```

#### 9. **PaymentError** (402)
Used for payment processing failures.

```typescript
import { PaymentError } from '../errors';

throw new PaymentError(
  'Card declined',
  false, // isRetryable
  { declineCode: 'insufficient_funds' }
);
```

#### 10. **RateLimitError** (429)
Used when rate limits are exceeded.

```typescript
import { RateLimitError } from '../errors';

throw new RateLimitError('Too many requests', 60); // retryAfter in seconds
```

#### 11. **TimeoutError** (504)
Used when operations timeout.

```typescript
import { TimeoutError } from '../errors';

throw new TimeoutError('database query', 5000); // operation, timeoutMs
```

#### 12. **QuotaExceededError** (429)
Used when user quotas are exceeded.

```typescript
import { QuotaExceededError } from '../errors';

throw new QuotaExceededError('Storage', currentUsage, maxQuota);
```

#### 13. **ConfigurationError** (500)
Used when application configuration is invalid.

```typescript
import { ConfigurationError } from '../errors';

throw new ConfigurationError(
  'AWS_S3_BUCKET environment variable not set',
  'AWS_S3_BUCKET'
);
```

## Error Utilities

### ErrorHandler

Central error handling service located in `/app/backend/src/utils/errorHandler.ts`.

#### Methods

##### `ErrorHandler.logError(error, context)`
Logs errors with context information.

```typescript
ErrorHandler.logError(error, {
  userId: 'user123',
  action: 'createPayment',
  metadata: { amount: 100 }
});
```

##### `ErrorHandler.handleError(error, res, context)`
Handles error and sends appropriate HTTP response.

```typescript
try {
  // ... operation
} catch (error) {
  ErrorHandler.handleError(error, res, {
    userId: req.user.id,
    action: 'processPayment'
  });
}
```

##### `ErrorHandler.asyncHandler(fn)`
Wraps async route handlers to catch errors.

```typescript
app.get('/users', ErrorHandler.asyncHandler(async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);
}));
```

### Helper Functions

#### `formatUserError(error)`
Formats errors for user-friendly display.

```typescript
import { formatUserError } from '../errors';

const userMessage = formatUserError(error);
// Returns user-friendly message, hiding technical details
```

#### `isRetryableError(error)`
Checks if an error is retryable.

```typescript
import { isRetryableError } from '../errors';

if (isRetryableError(error)) {
  // Retry the operation
}
```

#### `normalizeError(error)`
Converts unknown errors to AppError.

```typescript
import { normalizeError } from '../errors';

const appError = normalizeError(unknownError);
```

## Retry Logic

Retry utilities are located in `/app/backend/src/utils/retry.ts`.

### retry()

Retry a function with exponential backoff.

```typescript
import { retry } from '../errors';

const result = await retry(
  async () => {
    return await externalAPI.call();
  },
  {
    maxAttempts: 3,
    delayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    onRetry: (error, attempt) => {
      logger.warn(`Retry attempt ${attempt}`, { error: error.message });
    }
  }
);
```

### retryLinear()

Retry with constant delay (no exponential backoff).

```typescript
import { retryLinear } from '../errors';

const result = await retryLinear(
  async () => await operation(),
  3, // maxAttempts
  1000 // delayMs
);
```

### retryWithJitter()

Retry with jitter to prevent thundering herd.

```typescript
import { retryWithJitter } from '../errors';

const result = await retryWithJitter(
  async () => await operation(),
  { maxAttempts: 3, delayMs: 1000 }
);
```

### withTimeout()

Execute function with timeout.

```typescript
import { withTimeout } from '../errors';

const result = await withTimeout(
  slowOperation(),
  5000, // 5 seconds
  'slow operation'
);
```

### withFallback()

Try primary function, fallback on error.

```typescript
import { withFallback } from '../errors';

const result = await withFallback(
  async () => await primaryService.getData(),
  async () => await fallbackService.getData(),
  { logError: true, errorMessage: 'Primary service failed' }
);
```

### tryOptional()

Execute optional operation without failing.

```typescript
import { tryOptional } from '../errors';

await tryOptional(
  async () => await optionalCleanup(),
  defaultValue,
  true // logErrors
);
```

### CircuitBreaker

Prevents cascading failures in external service calls.

```typescript
import { CircuitBreaker } from '../errors';

const breaker = new CircuitBreaker(
  5,     // failure threshold
  60000, // timeout (1 minute)
  30000  // reset timeout (30 seconds)
);

const result = await breaker.execute(async () => {
  return await externalService.call();
});
```

### @Retry Decorator

Use as a method decorator.

```typescript
import { Retry } from '../errors';

class MyService {
  @Retry({ maxAttempts: 3, delayMs: 1000 })
  async fetchData() {
    return await externalAPI.getData();
  }
}
```

## Middleware

Error handling middleware located in `/app/backend/src/middleware/errorMiddleware.ts`.

### Setup

Add to your Express app:

```typescript
import {
  errorMiddleware,
  notFoundMiddleware,
  requestLoggerMiddleware,
  requestTimeoutMiddleware
} from './middleware/errorMiddleware';

// Add request logger
app.use(requestLoggerMiddleware);

// Add request timeout (optional)
app.use(requestTimeoutMiddleware(30000)); // 30 seconds

// ... your routes here ...

// Add 404 handler (MUST be after all routes)
app.use(notFoundMiddleware);

// Add error handler (MUST be last)
app.use(errorMiddleware);
```

### Process-Level Handlers

Add to your main app file:

```typescript
import {
  unhandledRejectionHandler,
  uncaughtExceptionHandler
} from './middleware/errorMiddleware';

process.on('unhandledRejection', unhandledRejectionHandler);
process.on('uncaughtException', uncaughtExceptionHandler);
```

## Usage Examples

### Example 1: Service Method with Custom Errors

```typescript
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
  retry
} from '../errors';

class UserService {
  async getUser(userId: string) {
    if (!userId) {
      throw new ValidationError('User ID is required', { field: 'userId' });
    }

    const user = await retry(
      async () => await prisma.user.findUnique({ where: { id: userId } }),
      { maxAttempts: 3 }
    );

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return user;
  }

  async createUser(data: CreateUserInput) {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictError('User already exists', {
          email: data.email
        });
      }
      throw new DatabaseError('Failed to create user', 'CREATE');
    }
  }
}
```

### Example 2: Controller with Error Handling

```typescript
import { asyncErrorHandler } from '../middleware/errorMiddleware';
import { ValidationError } from '../errors';

class UserController {
  // Using asyncErrorHandler to catch async errors
  getUsers = asyncErrorHandler(async (req, res) => {
    const users = await userService.getUsers();
    res.json(users);
  });

  // Manual error handling
  createUser = async (req, res, next) => {
    try {
      const userData = req.body;

      if (!userData.email) {
        throw new ValidationError('Email is required', {
          field: 'email'
        });
      }

      const user = await userService.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      next(error); // Pass to error middleware
    }
  };
}
```

### Example 3: External Service with Retry

```typescript
import {
  ExternalServiceError,
  retry,
  CircuitBreaker
} from '../errors';

class StripeService {
  private breaker = new CircuitBreaker(5, 60000, 30000);

  async processPayment(amount: number, paymentMethod: string) {
    try {
      return await this.breaker.execute(async () => {
        return await retry(
          async () => {
            return await stripe.paymentIntents.create({
              amount,
              payment_method: paymentMethod,
              confirm: true
            });
          },
          {
            maxAttempts: 2,
            shouldRetry: (error) => {
              // Only retry on network errors
              return error instanceof Stripe.errors.StripeConnectionError;
            }
          }
        );
      });
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        throw new PaymentError(error.message, false, {
          code: error.code
        });
      }

      throw new ExternalServiceError(
        'Stripe',
        'Payment processing failed',
        true
      );
    }
  }
}
```

### Example 4: File Operations with Optional Cleanup

```typescript
import {
  FileOperationError,
  tryOptional,
  retry
} from '../errors';

class FileService {
  async uploadFile(file: Express.Multer.File) {
    const tempPath = `/tmp/${file.filename}`;

    try {
      // Upload with retry
      await retry(
        async () => await s3.upload(file),
        { maxAttempts: 3 }
      );

      // Optional cleanup (won't fail if it errors)
      await tryOptional(
        async () => await fs.unlink(tempPath),
        undefined,
        true // log errors
      );

      return { success: true };
    } catch (error) {
      throw new FileOperationError(
        'upload',
        'Failed to upload file',
        { fileName: file.filename }
      );
    }
  }
}
```

## Best Practices

### 1. Use Specific Error Types

❌ **Bad:**
```typescript
throw new Error('User not found');
```

✅ **Good:**
```typescript
throw new NotFoundError('User', userId);
```

### 2. Include Context in Errors

❌ **Bad:**
```typescript
throw new ValidationError('Invalid input');
```

✅ **Good:**
```typescript
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: providedEmail,
  expected: 'valid email address'
});
```

### 3. Don't Swallow Errors

❌ **Bad:**
```typescript
try {
  await operation();
} catch (error) {
  // Silent failure
}
```

✅ **Good:**
```typescript
await tryOptional(
  async () => await operation(),
  defaultValue,
  true // log errors
);
```

### 4. Retry Appropriately

❌ **Bad:**
```typescript
// Retrying non-idempotent operations
await retry(() => createPayment()); // Could create duplicate charges!
```

✅ **Good:**
```typescript
// Only retry idempotent operations
await retry(() => fetchUserData());
```

### 5. Log with Context

❌ **Bad:**
```typescript
console.error('Error:', error);
```

✅ **Good:**
```typescript
logger.error('Payment processing failed', error, {
  userId,
  amount,
  paymentMethodId,
  timestamp: new Date().toISOString()
});
```

### 6. Handle Different Error Scenarios

✅ **Good:**
```typescript
try {
  await operation();
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
  } else if (error instanceof ExternalServiceError && error.isRetryable) {
    // Retry the operation
  } else {
    // Re-throw unknown errors
    throw error;
  }
}
```

### 7. Use Async Error Handler

✅ **Good:**
```typescript
import { asyncErrorHandler } from '../middleware/errorMiddleware';

router.get('/users', asyncErrorHandler(async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);
}));
```

## Error Response Format

All errors are returned in a consistent JSON format:

```json
{
  "error": {
    "name": "ValidationError",
    "message": "Email is required",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "2025-11-17T10:30:00.000Z",
    "details": {
      "field": "email",
      "value": null
    }
  }
}
```

## Migration Guide

### Migrating Existing Code

1. **Replace generic Error throws:**
   ```typescript
   // Before
   throw new Error('User not found');

   // After
   throw new NotFoundError('User', userId);
   ```

2. **Fix empty catch blocks:**
   ```typescript
   // Before
   await fs.unlink(path).catch(() => {});

   // After
   import { tryOptional } from '../errors';
   await tryOptional(() => fs.unlink(path), undefined, true);
   ```

3. **Add retry logic:**
   ```typescript
   // Before
   const data = await externalAPI.call();

   // After
   import { retry } from '../errors';
   const data = await retry(
     () => externalAPI.call(),
     { maxAttempts: 3 }
   );
   ```

4. **Update route handlers:**
   ```typescript
   // Before
   app.get('/users', async (req, res) => {
     try {
       const users = await getUsers();
       res.json(users);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });

   // After
   import { asyncErrorHandler } from '../middleware/errorMiddleware';
   app.get('/users', asyncErrorHandler(async (req, res) => {
     const users = await getUsers();
     res.json(users);
   }));
   ```

## Testing

### Testing Custom Errors

```typescript
import { NotFoundError, ValidationError } from '../errors';

describe('UserService', () => {
  it('should throw NotFoundError when user does not exist', async () => {
    await expect(
      userService.getUser('invalid-id')
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw ValidationError for invalid email', async () => {
    await expect(
      userService.createUser({ email: 'invalid' })
    ).rejects.toThrow(ValidationError);
  });
});
```

### Testing Retry Logic

```typescript
import { retry } from '../errors';

describe('Retry Logic', () => {
  it('should retry on failure', async () => {
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary failure');
        return 'success';
      },
      { maxAttempts: 3 }
    );

    expect(attempts).toBe(3);
    expect(result).toBe('success');
  });
});
```

## Summary

This error handling system provides:

✅ **Consistent error responses** across the application
✅ **Type-safe error handling** with custom error classes
✅ **Automatic retry logic** for transient failures
✅ **Comprehensive logging** with context
✅ **User-friendly error messages**
✅ **Circuit breaker pattern** for external services
✅ **Graceful degradation** for optional operations
✅ **Production-ready** error tracking and monitoring

For questions or issues, refer to the source code in:
- `/app/backend/src/errors/`
- `/app/backend/src/utils/errorHandler.ts`
- `/app/backend/src/utils/retry.ts`
- `/app/backend/src/middleware/errorMiddleware.ts`
