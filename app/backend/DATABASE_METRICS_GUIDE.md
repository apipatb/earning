# Database Metrics Tracking Guide

This guide explains how to track database query performance using the `db-metrics` utilities.

## Overview

The database metrics system tracks:
- Query duration (time in milliseconds)
- Query type (SELECT, INSERT, UPDATE, DELETE)
- Table name
- Slow queries (queries taking >100ms)

## Quick Start

### Basic Usage

```typescript
import { trackSelectQuery, trackInsertQuery } from '../lib/db-metrics';

// Track a SELECT query
const user = await trackSelectQuery('users', () =>
  prisma.user.findUnique({ where: { id: '123' } })
);

// Track an INSERT query
const newEarning = await trackInsertQuery('earnings', () =>
  prisma.earning.create({ data: { amount: 100 } })
);
```

### Available Functions

1. **trackSelectQuery** - Track SELECT queries
   ```typescript
   const data = await trackSelectQuery('tableName', queryFn);
   ```

2. **trackInsertQuery** - Track INSERT queries
   ```typescript
   const result = await trackInsertQuery('tableName', queryFn);
   ```

3. **trackUpdateQuery** - Track UPDATE queries
   ```typescript
   const result = await trackUpdateQuery('tableName', queryFn);
   ```

4. **trackDeleteQuery** - Track DELETE queries
   ```typescript
   const result = await trackDeleteQuery('tableName', queryFn);
   ```

5. **trackQueryMetrics** - Generic wrapper for custom query types
   ```typescript
   const result = await trackQueryMetrics('CUSTOM_TYPE', 'tableName', queryFn);
   ```

## Implementation Examples

### In Controllers

```typescript
import { trackSelectQuery, trackInsertQuery } from '../lib/db-metrics';
import { Request, Response } from 'express';

export async function getEarnings(req: Request, res: Response) {
  try {
    const earnings = await trackSelectQuery('earnings', () =>
      prisma.earning.findMany({
        where: { userId: req.user.id },
        orderBy: { date: 'desc' },
      })
    );

    res.json(earnings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
}

export async function createEarning(req: Request, res: Response) {
  try {
    const earning = await trackInsertQuery('earnings', () =>
      prisma.earning.create({
        data: {
          userId: req.user.id,
          amount: req.body.amount,
          date: req.body.date,
          platform: req.body.platform,
        },
      })
    );

    res.status(201).json(earning);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create earning' });
  }
}
```

### In Services

```typescript
import { trackSelectQuery, trackUpdateQuery } from '../lib/db-metrics';

export class EarningService {
  async getUserEarnings(userId: string) {
    return trackSelectQuery('earnings', () =>
      prisma.earning.findMany({
        where: { userId },
        include: { platform: true },
      })
    );
  }

  async updateEarning(id: string, data: any) {
    return trackUpdateQuery('earnings', () =>
      prisma.earning.update({
        where: { id },
        data,
      })
    );
  }

  async deleteEarning(id: string) {
    return trackDeleteQuery('earnings', () =>
      prisma.earning.delete({
        where: { id },
      })
    );
  }
}
```

### Batch Operations

```typescript
import { trackQueryMetrics } from '../lib/db-metrics';

export async function batchCreateEarnings(earnings: any[]) {
  return trackQueryMetrics('BATCH_INSERT', 'earnings', () =>
    prisma.$transaction(
      earnings.map(e => prisma.earning.create({ data: e }))
    )
  );
}
```

## Advanced Usage

### Conditional Logging

```typescript
import { trackSelectQuery } from '../lib/db-metrics';

export async function searchEarnings(query: string) {
  const start = Date.now();

  const results = await trackSelectQuery('earnings', () =>
    prisma.earning.findMany({
      where: {
        description: { contains: query, mode: 'insensitive' },
      },
    })
  );

  const duration = Date.now() - start;

  // Log only if query took significant time
  if (duration > 500) {
    console.warn(`Slow search query: ${duration}ms for "${query}"`);
  }

  return results;
}
```

### Transaction Tracking

```typescript
import { trackQueryMetrics } from '../lib/db-metrics';

export async function transferEarnings(fromId: string, toId: string, amount: number) {
  return trackQueryMetrics('TRANSACTION', 'earnings', () =>
    prisma.$transaction(async (tx) => {
      // Deduct from source
      await tx.earning.update({
        where: { id: fromId },
        data: { amount: { decrement: amount } },
      });

      // Add to destination
      await tx.earning.update({
        where: { id: toId },
        data: { amount: { increment: amount } },
      });
    })
  );
}
```

### Error Handling

```typescript
import { trackSelectQuery } from '../lib/db-metrics';

export async function getEarningWithFallback(id: string) {
  try {
    return await trackSelectQuery('earnings', () =>
      prisma.earning.findUniqueOrThrow({
        where: { id },
      })
    );
  } catch (error) {
    console.error(`Failed to fetch earning ${id}:`, error);
    // Metrics are still recorded even on error
    // Return cached or default data
    return null;
  }
}
```

## Monitoring Slow Queries

Slow queries (>100ms) are automatically tracked with the metric `slow_queries_total`.

View them in Prometheus/Grafana:

```promql
# Rate of slow queries
rate(slow_queries_total[5m])

# Specific table
rate(slow_queries_total{table="earnings"}[5m])

# Specific operation
rate(slow_queries_total{query_type="SELECT"}[5m])
```

### Best Practices for Slow Queries

1. **Add Indexes**: For frequently slow SELECT queries
   ```prisma
   model Earning {
     @@index([userId])
     @@index([date])
     @@index([userId, date])
   }
   ```

2. **Use Select**: Only fetch needed columns
   ```typescript
   await trackSelectQuery('earnings', () =>
     prisma.earning.findMany({
       where: { userId },
       select: { id: true, amount: true, date: true },
     })
   );
   ```

3. **Pagination**: For large result sets
   ```typescript
   await trackSelectQuery('earnings', () =>
     prisma.earning.findMany({
       where: { userId },
       skip: (page - 1) * limit,
       take: limit,
     })
   );
   ```

4. **Batch Operations**: Instead of N individual queries
   ```typescript
   // Bad: N queries
   for (const id of ids) {
     await prisma.earning.findUnique({ where: { id } });
   }

   // Good: 1 query
   await trackSelectQuery('earnings', () =>
     prisma.earning.findMany({
       where: { id: { in: ids } },
     })
   );
   ```

## Testing

### Unit Test Example

```typescript
import { trackSelectQuery } from '../lib/db-metrics';
import { recordDatabaseQuery } from '../lib/metrics';

jest.mock('../lib/metrics');

describe('Database Metrics', () => {
  it('should track query duration', async () => {
    const mockQuery = jest.fn().mockResolvedValue([]);

    await trackSelectQuery('users', mockQuery);

    expect(mockQuery).toHaveBeenCalled();
    expect(recordDatabaseQuery).toHaveBeenCalledWith(
      'SELECT',
      'users',
      expect.any(Number)
    );
  });

  it('should record errors', async () => {
    const error = new Error('Query failed');
    const mockQuery = jest.fn().mockRejectedValue(error);

    await expect(
      trackSelectQuery('users', mockQuery)
    ).rejects.toThrow('Query failed');

    expect(recordDatabaseQuery).toHaveBeenCalled();
  });
});
```

## Integration with Existing Code

### Gradual Migration

You don't need to update all queries at once. Start with critical paths:

1. **Step 1**: High-traffic endpoints
   ```typescript
   // Dashboard page - frequently accessed
   await trackSelectQuery('earnings', () =>
     prisma.earning.findMany({ ... })
   );
   ```

2. **Step 2**: Complex queries
   ```typescript
   // Analytical queries
   await trackSelectQuery('earnings', () =>
     prisma.earning.groupBy({ ... })
   );
   ```

3. **Step 3**: Write operations
   ```typescript
   // Mutations
   await trackInsertQuery('earnings', () =>
     prisma.earning.create({ ... })
   );
   ```

4. **Step 4**: Remaining queries
   ```typescript
   // Everything else
   await trackSelectQuery('table', () => query());
   ```

## Prisma Client Extension (Advanced)

To automatically track all queries without manual wrapping:

```typescript
import { PrismaClient } from '@prisma/client';
import { trackQueryMetrics } from './lib/db-metrics';

const prisma = new PrismaClient();

export const prismaWithMetrics = prisma.$extends({
  query: {
    $allOperations({ operation, model, args, query }) {
      return trackQueryMetrics(
        operation.toUpperCase(),
        model,
        () => query(args)
      );
    },
  },
});

export default prismaWithMetrics;
```

Then use it everywhere:

```typescript
import prisma from './lib/prisma-with-metrics';

// All queries automatically tracked
const user = await prisma.user.findUnique({ ... });
const earnings = await prisma.earning.findMany({ ... });
```

## Metrics Reference

### Recorded Metrics

- **database_query_duration_ms**: Histogram of query durations
  - Labels: `query_type`, `table`
  - Buckets: 0.1, 5, 15, 50, 100, 500, 1000, 2000 ms

- **slow_queries_total**: Counter of slow queries (>100ms)
  - Labels: `query_type`, `table`

### Sample Queries

```promql
# Average query duration per table
avg(rate(database_query_duration_ms_sum[5m])) by (table)

# P95 query duration
histogram_quantile(0.95, rate(database_query_duration_ms_bucket[5m]))

# Slow query rate by operation
rate(slow_queries_total[5m]) by (query_type)
```

## Troubleshooting

### Metrics Not Recording

1. Ensure `lib/db-metrics.ts` is imported
2. Check that `recordDatabaseQuery` is called
3. Verify Prometheus is scraping metrics

### High Overhead

If you notice performance degradation:

1. Use `trackQueryMetricsSync` for synchronous queries (if any)
2. Profile code with Chrome DevTools
3. Consider sampling instead of tracking all queries

### Memory Issues

If metrics queue grows too large:

1. Check that backend can reach `/api/v1/metrics`
2. Increase `BATCH_SIZE` in metrics configuration
3. Reduce `FLUSH_INTERVAL`

## References

- [Prisma Performance Docs](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Prometheus Histograms](https://prometheus.io/docs/concepts/metric_types/#histogram)
- [Best Practices for Database Queries](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
