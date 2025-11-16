# TypeScript Types Quick Reference Guide

## Core Types Location

All shared types are defined in:
- `/home/user/earning/app/backend/src/types/index.ts` - Main type definitions
- `/home/user/earning/app/backend/src/types/utils.ts` - Utility types

## Common Type Imports

```typescript
// Import types in controllers
import {
  AuthRequest,              // Authenticated request with user
  ControllerHandler,        // Async controller return type
  PublicControllerHandler,  // Public handler return type
  User,
  Product,
  ProductWithStats,
  Sale,
  SaleWithProduct,
  Expense,
  Goal,
  ApiErrorPayload,
  StandardApiResponse,
  SalesFilter,
  ProductFilter,
  PaginationParams
} from '../types';

// Import utility types
import {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  BaseFilter,
  DateFilter,
  SearchFilter,
  Pagination,
  DatabaseResult,
  ValidationError
} from '../types/utils';
```

## Controller Pattern

### Authenticated Handler
```typescript
import { Response } from 'express';
import { AuthRequest, ControllerHandler } from '../types';

export const getProfile: ControllerHandler = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    // ... handler logic
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};
```

### Public Handler
```typescript
import { Request, Response } from 'express';
import { PublicControllerHandler } from '../types';

export const register: PublicControllerHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  // ... handler logic
};
```

## Entity Types

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Product with Stats
```typescript
interface ProductWithStats extends Product {
  stats: {
    total_sales: number;
    total_revenue: number;
    total_quantity: number;
  };
}
```

### Sale with Product
```typescript
interface SaleWithProduct extends Sale {
  product: {
    id: string;
    name: string;
    price: number;
    category: string | null;
  };
}
```

## Response Types

### Standard API Response
```typescript
interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

// Usage
const response: StandardApiResponse<User> = {
  success: true,
  data: user,
  timestamp: new Date()
};
```

### Error Response
```typescript
interface ApiErrorPayload {
  error: string;
  message: string;
  details?: ErrorDetails[] | Record<string, unknown>;
  timestamp: Date;
}
```

## Filter Types

### Sales Filter
```typescript
interface SalesFilter {
  startDate?: string;
  endDate?: string;
  productId?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

// Usage
const filters = req.query as SalesFilter;
```

### Base Filter
```typescript
interface BaseFilter {
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Pagination

### Paginated Response
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: Date;
  success: boolean;
}
```

### List Response
```typescript
interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
```

## Utility Types

### Nullable Type
```typescript
type Nullable<T> = T | null;

// Usage
const user: Nullable<User> = await findUser();
```

### Optional Type
```typescript
type Optional<T> = T | undefined;

// Usage
const middleName: Optional<string> = user.middleName;
```

### Async Result
```typescript
type AsyncResult<T> = Promise<[Error, null] | [null, T]>;

// Usage
const [error, data] = await getUser() as AsyncResult<User>;
```

## Type Aliases for Common Patterns

### Request Handler
```typescript
type ControllerHandler = (
  req: AuthRequest,
  res: Response
) => Promise<void>;

type PublicControllerHandler = (
  req: Request,
  res: Response
) => Promise<void>;
```

## Best Practices

1. **Always import types from centralized location**
   ```typescript
   import { User, Product } from '../types';
   ```

2. **Use handler type aliases**
   ```typescript
   export const handler: ControllerHandler = async (req, res) => {
     // TypeScript knows req is AuthRequest, res is Response
   };
   ```

3. **Type query parameters**
   ```typescript
   const filters = req.query as SalesFilter;
   ```

4. **Use generic response types**
   ```typescript
   const response: StandardApiResponse<User[]> = {
     success: true,
     data: users,
     timestamp: new Date()
   };
   ```

5. **Extend types for specific use cases**
   ```typescript
   interface ProductResponse extends ProductWithStats {
     availability: 'in_stock' | 'out_of_stock';
   }
   ```

