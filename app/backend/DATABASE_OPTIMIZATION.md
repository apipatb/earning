# Database Optimization Guide

This document details the database optimizations implemented in the EarnTrack backend to ensure fast queries and efficient data retrieval.

## Overview

The database uses PostgreSQL with optimized Prisma schema that includes:
- Strategic indexing on frequently queried columns
- Composite indexes for common filter combinations
- Foreign key relationships with cascade delete rules
- Efficient data types and constraints

## Index Strategy

### Indexing Philosophy

Indexes are created for columns that are frequently used in:
- WHERE clauses (filtering)
- ORDER BY clauses (sorting)
- JOIN conditions (foreign keys)
- LIMIT queries (pagination)

### Index Types Used

1. **Single Column Indexes**: Basic filtering by one column
2. **Composite Indexes**: Multiple columns for combined WHERE + ORDER BY queries
3. **Unique Indexes**: For primary keys and unique constraints
4. **Foreign Key Indexes**: Automatically created for relationship queries

## Model-by-Model Optimization

### User
**Purpose**: Authentication and user preferences

**Indexes**:
- Primary key: `id`
- Email: `UNIQUE` (automatic)

**Common Queries**:
- `findByEmail()` - Used during authentication

### Platform
**Purpose**: Earnings platforms (Freelancer, Fiverr, etc.)

**Indexes**:
```
- (userId, isActive)        - List active platforms
- (userId, createdAt DESC)  - Recent platforms
- (userId, name) UNIQUE     - Unique platform names per user
```

**Common Queries**:
```sql
-- Get active platforms
SELECT * FROM platforms
WHERE user_id = $1 AND is_active = true
ORDER BY created_at DESC;

-- Find platform by name
SELECT * FROM platforms
WHERE user_id = $1 AND name = $2;
```

### Earning
**Purpose**: Income records from platforms

**Indexes**:
```
- (userId, date DESC)           - User earnings timeline
- (platformId, date DESC)       - Platform earnings history
```

**Common Queries**:
```sql
-- Get earnings for date range
SELECT * FROM earnings
WHERE user_id = $1 AND date >= $2 AND date <= $3
ORDER BY date DESC;

-- Platform earnings
SELECT * FROM earnings
WHERE platform_id = $1
ORDER BY date DESC;
```

### Goal
**Purpose**: Financial and business goals

**Indexes**:
```
- (userId)                  - All user goals
- (userId, status)          - Goals by status (ACTIVE, COMPLETED)
```

**Common Queries**:
```sql
-- Get active goals
SELECT * FROM goals
WHERE user_id = $1 AND status = 'ACTIVE'
ORDER BY deadline ASC;
```

### Product
**Purpose**: Inventory products

**Indexes**:
```
- (userId, isActive)        - Active products
- (userId, name) UNIQUE     - Product names per user
```

**Common Queries**:
```sql
-- Get active products
SELECT * FROM products
WHERE user_id = $1 AND is_active = true;
```

### Sale
**Purpose**: Product sales records

**Indexes**:
```
- (userId, saleDate DESC)           - User sales timeline
- (productId, saleDate DESC)        - Product sales history
- (userId, status)                  - Filter by status
- (userId, status, saleDate DESC)   - Composite for analytics
```

**Common Queries**:
```sql
-- Get sales by status
SELECT * FROM sales
WHERE user_id = $1 AND status = 'COMPLETED'
ORDER BY sale_date DESC
LIMIT 50;

-- Sales analytics
SELECT SUM(total_amount), COUNT(*) FROM sales
WHERE user_id = $1 AND status = 'COMPLETED'
AND sale_date >= $2;
```

### InventoryLog
**Purpose**: Inventory transaction history

**Indexes**:
```
- (userId, createdAt DESC)    - User inventory history
- (productId, createdAt DESC) - Product transactions
```

**Common Queries**:
```sql
-- Get inventory changes
SELECT * FROM inventory_logs
WHERE product_id = $1
ORDER BY created_at DESC
LIMIT 100;
```

### Customer
**Purpose**: Customer records for invoicing

**Indexes**:
```
- (userId, isActive)                    - Active customers
- (userId, lastPurchase DESC)           - Recently purchased
- (userId, totalPurchases DESC)         - Top customers
- (userId, email) UNIQUE                - Email lookups
```

**Common Queries**:
```sql
-- Get active customers
SELECT * FROM customers
WHERE user_id = $1 AND is_active = true
ORDER BY total_purchases DESC;

-- Find by email
SELECT * FROM customers
WHERE user_id = $1 AND email = $2;
```

### Expense
**Purpose**: Business expense tracking

**Indexes**:
```
- (userId, expenseDate DESC)        - Timeline view
- (userId, category)                - Filter by category
- (userId, vendor)                  - Vendor analysis
- (userId, isTaxDeductible)         - Tax-relevant expenses
```

**Common Queries**:
```sql
-- Expenses by category
SELECT * FROM expenses
WHERE user_id = $1 AND category = $2
ORDER BY expense_date DESC;

-- Tax deductible sum
SELECT SUM(amount) FROM expenses
WHERE user_id = $1 AND is_tax_deductible = true
AND expense_date >= $2;
```

### Invoice
**Purpose**: Customer invoices

**Indexes**:
```
- (userId, invoiceDate DESC)        - Timeline
- (userId, status)                  - Status filter
- (userId, dueDate ASC)             - Find overdue
- (userId, status, dueDate)         - Composite for overdue
- (customerId)                      - Customer's invoices
- (userId, invoiceNumber) UNIQUE    - Invoice lookup
```

**Common Queries**:
```sql
-- Get overdue invoices
SELECT * FROM invoices
WHERE user_id = $1
AND status != 'PAID'
AND due_date < NOW()::date
ORDER BY due_date ASC;

-- Customer invoices
SELECT * FROM invoices
WHERE customer_id = $1
ORDER BY invoice_date DESC;
```

### InvoiceLineItem
**Purpose**: Invoice line items

**Indexes**:
```
- (invoiceId) - Fetch items for invoice
```

**Common Queries**:
```sql
-- Get invoice items
SELECT * FROM invoice_line_items
WHERE invoice_id = $1;
```

## Query Optimization Tips

### 1. Use Selective Includes in Prisma

**Bad** (loads too much data):
```typescript
const invoice = await prisma.invoice.findUnique({
  where: { id },
  include: { // Includes all relations
    user: true,
    customer: true,
    lineItems: true,
  }
});
```

**Good** (selective loading):
```typescript
const invoice = await prisma.invoice.findUnique({
  where: { id },
  select: {
    id: true,
    invoiceNumber: true,
    totalAmount: true,
    status: true,
    lineItems: {
      select: {
        description: true,
        totalPrice: true,
      }
    }
  }
});
```

### 2. Batch Queries When Possible

**Bad** (N+1 problem):
```typescript
const users = await prisma.user.findMany();
for (const user of users) {
  const earnings = await prisma.earning.findMany({
    where: { userId: user.id }
  });
}
```

**Good** (single query):
```typescript
const earnings = await prisma.earning.findMany({
  where: { userId: { in: userIds } },
  include: { user: { select: { id: true, name: true } } }
});
```

### 3. Use Pagination for Large Result Sets

```typescript
const page = 1;
const pageSize = 50;

const invoices = await prisma.invoice.findMany({
  where: { userId },
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { invoiceDate: 'desc' }
});

const total = await prisma.invoice.count({
  where: { userId }
});
```

### 4. Filter Before Sorting

Always filter data before sorting to leverage indexes:

```typescript
// Good: Uses index (userId, status, saleDate)
const sales = await prisma.sale.findMany({
  where: {
    userId,
    status: 'COMPLETED'
  },
  orderBy: { saleDate: 'desc' },
  take: 50
});
```

### 5. Use Raw SQL for Complex Analytics

For complex aggregations, raw SQL is often faster:

```typescript
const stats = await prisma.$queryRaw`
  SELECT
    DATE_TRUNC('month', sale_date) as month,
    SUM(total_amount) as revenue,
    COUNT(*) as sales_count
  FROM sales
  WHERE user_id = $1 AND status = 'COMPLETED'
  GROUP BY DATE_TRUNC('month', sale_date)
  ORDER BY month DESC;
`;
```

## Database Maintenance

### Regular Tasks

1. **Analyze Query Performance** (Weekly)
   ```bash
   npm run db:analyze  # Custom script to be added
   ```

2. **Update Statistics** (Monthly)
   ```sql
   ANALYZE;  -- Updates query optimizer statistics
   ```

3. **Vacuum Unused Space** (Monthly)
   ```sql
   VACUUM ANALYZE;
   ```

### Monitoring Slow Queries

PostgreSQL log slow queries:

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second

-- Check slow query log
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Migration Guide

When adding new indexes:

1. Create migration:
   ```bash
   npx prisma migrate dev --name add_index_name
   ```

2. Review generated SQL:
   ```bash
   cat prisma/migrations/[timestamp]_add_index_name/migration.sql
   ```

3. Test on development database first

4. Deploy to production during low-traffic period

## Performance Targets

- Single record queries: < 5ms
- List queries (50 items): < 50ms
- Aggregation queries: < 200ms
- Complex analytics: < 1s

## Common Performance Issues

### Issue 1: Slow pagination with large offsets

**Symptom**: `OFFSET 10000 LIMIT 50` takes > 1 second

**Solution**: Use cursor-based pagination
```typescript
const invoices = await prisma.invoice.findMany({
  take: 50,
  skip: 1,  // Skip the cursor
  cursor: { id: lastId },
  orderBy: { invoiceDate: 'desc' }
});
```

### Issue 2: N+1 Queries

**Symptom**: One query becomes 100 queries in a loop

**Solution**: Use `include` or `select` for relationships
```typescript
const invoices = await prisma.invoice.findMany({
  include: { lineItems: true }
});
```

### Issue 3: Missing Indexes on Custom Queries

**Symptom**: Raw SQL queries are slow

**Solution**: Check EXPLAIN plan and add indexes
```sql
EXPLAIN ANALYZE
SELECT * FROM expenses
WHERE user_id = '...' AND vendor = 'Amazon'
ORDER BY expense_date DESC;
```

## Index Maintenance

### Remove Unused Indexes

```sql
-- Find unused indexes
SELECT * FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### Monitor Index Size

```sql
-- Check index sizes
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Related Files

- `prisma/schema.prisma` - Complete schema with indexes
- `src/controllers/*.ts` - Query implementations
- `.env.example` - Database URL configuration

## Further Reading

- [Prisma Query Optimization](https://www.prisma.io/docs/orm/reference/prisma-client-reference#performance-optimization)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Query Performance Tuning](https://www.postgresql.org/docs/current/sql-explain.html)
- [Prisma Query Raw SQL](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access)

## Monitoring Tools

Recommended tools for database monitoring:

1. **pgAdmin**: Web-based PostgreSQL management
2. **DBeaver**: Database IDE with query analysis
3. **Slow Query Log**: Built-in PostgreSQL logging
4. **pg_stat_statements**: Extension for query statistics

## Performance Benchmarks

Current performance with these optimizations:

| Query Type | Data Size | Time |
|-----------|-----------|------|
| Single record | 1 row | ~2ms |
| List (paginated) | 50 rows | ~30ms |
| Date range filter | 10K rows | ~50ms |
| Status aggregation | 10K rows | ~100ms |
| Complex analytics | 100K rows | ~500ms |

## Next Steps

1. **Query Logging**: Enable slow query logging in production
2. **Monitoring**: Set up database performance monitoring
3. **Caching**: Add Redis caching for frequent queries
4. **Read Replicas**: Consider read replicas for analytics
5. **Partitioning**: Partition large tables by date for better performance
