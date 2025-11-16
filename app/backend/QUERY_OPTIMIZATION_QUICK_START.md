# Query Optimization Quick Start Guide

**For Developers**: Copy-paste patterns and examples for optimized Prisma queries.

---

## Quick Import

```typescript
import {
  earningsIncludes,
  earningsSelect,
  customerIncludes,
  customerSelect,
  invoiceIncludes,
  invoiceSelect,
  saleIncludes,
  saleSelect,
  expenseSelect,
  getEarningsList,
  getTopCustomersByLTV,
  getRecentCustomers,
  getOverdueInvoices,
  getInvoiceSummary,
  getExpensesByCategory,
  getTaxDeductibleExpenses,
  getDashboardData,
  paginate,
  searchCustomers,
} from '../utils/query-optimization';
```

---

## Common Queries

### Earnings Queries

**List earnings with platform info:**
```typescript
// ✓ OPTIMIZED - prevents N+1, uses indexes
const earnings = await prisma.earning.findMany({
  where: { userId },
  include: earningsIncludes.withPlatform,
  orderBy: { date: 'desc' },
  take: 50,
  skip: 0,
});

// OR use helper function
const result = await getEarningsList(userId, startDate, endDate, platformId);
```

**Get analytics data:**
```typescript
// ✓ OPTIMIZED - uses select to reduce data
const earnings = await prisma.earning.findMany({
  where: { userId, date: { gte: monthStart, lte: monthEnd } },
  select: earningsSelect.analytics, // Only needed fields
  orderBy: { date: 'desc' },
});
```

**Filtered earnings (by platform + date):**
```typescript
// ✓ OPTIMIZED - uses composite index [userId, platformId, date DESC]
const earnings = await prisma.earning.findMany({
  where: {
    userId,
    platformId, // Always include for optimal index usage
    date: { gte: start, lte: end },
  },
  include: earningsIncludes.withPlatform,
  orderBy: { date: 'desc' },
  take: 50,
});
```

---

### Customer Queries

**List customers (with pagination):**
```typescript
// ✓ OPTIMIZED - smart sorting with indexes
const customers = await prisma.customer.findMany({
  where: { userId, isActive: true },
  orderBy: { name: 'asc' }, // Uses [userId, name] index
  take: 50,
  skip: 0,
});

// With count in parallel
const [customers, total] = await Promise.all([
  prisma.customer.findMany({ where: { userId }, take: 50, skip: 0 }),
  prisma.customer.count({ where: { userId } }),
]);
```

**Top customers by LTV:**
```typescript
// ✓ OPTIMIZED - dedicated index [userId, totalPurchases DESC]
const topCustomers = await getTopCustomersByLTV(userId, limit = 10);

// OR manually
const topCustomers = await prisma.customer.findMany({
  where: { userId, isActive: true },
  orderBy: { totalPurchases: 'desc' }, // Uses index
  take: 10,
  select: customerSelect.ltv,
});
```

**Recent customers:**
```typescript
// ✓ OPTIMIZED - uses [userId, lastPurchase DESC] index
const recent = await getRecentCustomers(userId, limit = 10);
```

**Search customers:**
```typescript
// ✓ OPTIMIZED - filters by userId first, then text search
const results = await searchCustomers(userId, 'john doe', limit = 20);

// OR manually with proper filtering
const customers = await prisma.customer.findMany({
  where: {
    userId, // First filter by user!
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ],
  },
  take: 20,
});
```

---

### Invoice Queries

**List invoices:**
```typescript
// ✓ OPTIMIZED - uses [userId, invoiceDate DESC] index
const invoices = await prisma.invoice.findMany({
  where: { userId },
  include: invoiceIncludes.basic,
  orderBy: { invoiceDate: 'desc' },
  take: 50,
  skip: 0,
});
```

**Filter by status:**
```typescript
// ✓ OPTIMIZED - uses [userId, status] index
const paidInvoices = await prisma.invoice.findMany({
  where: { userId, status: 'paid' },
  select: invoiceSelect.api,
  take: 50,
});
```

**Overdue invoices (OPTIMAL):**
```typescript
// ✓ HIGHLY OPTIMIZED - composite index [userId, dueDate ASC, status]
const overdue = await getOverdueInvoices(userId);

// Expected time: < 20ms (index handles filtering AND sorting)
```

**Invoice summary:**
```typescript
// Get aggregated summary
const summary = await getInvoiceSummary(userId);

// Returns: { total_invoices, paid, pending, overdue, amounts... }
```

**Invoices for customer:**
```typescript
// ✓ OPTIMIZED - uses [customerId, userId] index
const customerInvoices = await prisma.invoice.findMany({
  where: { userId, customerId },
  orderBy: { invoiceDate: 'desc' },
  include: invoiceIncludes.basic,
});
```

---

### Sale Queries

**List sales:**
```typescript
// ✓ OPTIMIZED - uses [userId, saleDate DESC]
const sales = await prisma.sale.findMany({
  where: { userId },
  include: saleIncludes.withProduct,
  orderBy: { saleDate: 'desc' },
  take: 50,
});
```

**Sales by product:**
```typescript
// ✓ OPTIMIZED - uses [productId, saleDate DESC]
const productSales = await prisma.sale.findMany({
  where: { productId },
  select: saleSelect.analytics,
  orderBy: { saleDate: 'desc' },
});
```

**Filter by status:**
```typescript
// ✓ OPTIMIZED - uses [userId, status]
const completedSales = await prisma.sale.findMany({
  where: { userId, status: 'completed' },
  orderBy: { saleDate: 'desc' },
  take: 50,
});
```

---

### Expense Queries

**List expenses by date:**
```typescript
// ✓ OPTIMIZED - uses [userId, expenseDate DESC]
const expenses = await prisma.expense.findMany({
  where: { userId },
  select: expenseSelect.api,
  orderBy: { expenseDate: 'desc' },
  take: 50,
});
```

**Expenses by category:**
```typescript
// ✓ OPTIMIZED - uses [userId, category]
const categoryExpenses = await getExpensesByCategory(userId, 'Office Supplies');
```

**Tax deductible expenses:**
```typescript
// ✓ OPTIMIZED - filters by userId first
const taxExpenses = await getTaxDeductibleExpenses(
  userId,
  startDate,
  endDate
);
```

---

## Pagination Helper

```typescript
// Use for any model with consistent pattern
const result = await paginate(
  prisma.earning,
  { userId, date: { gte: start, lte: end } },
  { date: 'desc' },
  pageNumber = 1,
  pageSize = 50,
  include = earningsIncludes.withPlatform,
);

// Returns:
// {
//   items: [...],
//   total: 347,
//   page: 1,
//   pageSize: 50,
//   totalPages: 7,
//   hasMore: true
// }
```

---

## Dashboard Data (Parallel Queries)

```typescript
// Get 4 key dashboard metrics in parallel
const dashboard = await getDashboardData(userId);

// Returns:
// {
//   earnings: [...last 30 days],
//   platforms: [...active platforms],
//   overdueInvoices: [...],
//   recentCustomers: [...top 5 recent]
// }

// ✓ OPTIMIZED - 4 queries run simultaneously, not sequentially
// Expected time: ~50-100ms for all 4 queries vs 200-300ms sequential
```

---

## Transaction Example

```typescript
// Update customer metrics atomically with sale creation
const sale = await createSaleWithCustomerUpdate(
  userId,
  customerId,
  {
    productId,
    quantity,
    totalAmount,
    unitPrice,
    saleDate: new Date(),
  }
);

// ✓ OPTIMIZED - Both operations in single transaction
// - Either both succeed or both rollback
// - Better than separate create + update calls
```

---

## What NOT to Do

### ✗ N+1 Queries
```typescript
// BAD: Triggers N+1 queries
const earnings = await prisma.earning.findMany({ where: { userId } });
for (const e of earnings) {
  console.log(e.platform.name); // Each iteration = 1 extra query!
}
```

**Fix**: Use `include`
```typescript
const earnings = await prisma.earning.findMany({
  where: { userId },
  include: earningsIncludes.withPlatform, // Single query with join
});
```

### ✗ Sequential Queries When Parallel Possible
```typescript
// BAD: 60ms + 40ms = 100ms
const earnings = await prisma.earning.findMany({ where: { userId } });
const total = await prisma.earning.count({ where: { userId } });
```

**Fix**: Parallel with Promise.all
```typescript
// GOOD: ~60ms (both execute simultaneously)
const [earnings, total] = await Promise.all([
  prisma.earning.findMany({ where: { userId } }),
  prisma.earning.count({ where: { userId } }),
]);
```

### ✗ No User Filter
```typescript
// BAD: Table scan without userId
const earnings = await prisma.earning.findMany({
  where: { date: { gte: start, lte: end } },
});
```

**Fix**: Always filter by userId first
```typescript
// GOOD: Uses index immediately
const earnings = await prisma.earning.findMany({
  where: {
    userId, // Always first
    date: { gte: start, lte: end },
  },
});
```

### ✗ Wrong Include Patterns
```typescript
// BAD: Gets all fields of platform
const earnings = await prisma.earning.findMany({
  where: { userId },
  include: { platform: true },
});
```

**Fix**: Use predefined includes with select
```typescript
// GOOD: Only needed fields
const earnings = await prisma.earning.findMany({
  where: { userId },
  include: earningsIncludes.withPlatform, // Uses select internally
});
```

---

## Performance Debugging

### Check Query Execution Plan
```typescript
// Enable logging in Prisma Client
const prisma = new PrismaClient({
  log: ['info', 'warn', 'error', 'query'], // Shows actual SQL
});

// Run slow query
const result = await someSlowQuery();

// Check logs to see generated SQL
```

### Verify Index Usage
```sql
-- In PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM earnings
WHERE user_id = $1 AND date >= $2 AND date <= $3
ORDER BY date DESC
LIMIT 50;

-- Look for "Index Scan" not "Seq Scan"
-- Seq Scan = query not using index (bad!)
-- Index Scan = query using index (good!)
```

### Monitor Slow Queries
```sql
-- Find queries taking > 100ms
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC LIMIT 10;
```

---

## Common Issues & Solutions

### Issue: "Query is slow"
**Solution**: Check if userId is in WHERE clause first
```typescript
// ✗ Slow (might scan many rows)
where: { date: { gte: start }, platformId }

// ✓ Fast (filters by user first)
where: { userId, date: { gte: start }, platformId }
```

### Issue: "Different sort not working"
**Solution**: Check if index exists for that sort
```typescript
// If sorting by new field, may need new index
// Add to schema: @@index([userId, newField(sort: Desc)])
```

### Issue: "Memory growing"
**Solution**: Reduce result set size
```typescript
// ✗ Loads 10,000 records into memory
const items = await prisma.model.findMany({ where: { userId } });

// ✓ Only load needed fields
const items = await prisma.model.findMany({
  where: { userId },
  select: { id: true, name: true }, // Smaller objects
  take: 50, // Limit results
});
```

---

## File Locations

- **Optimization Utilities**: `/home/user/earning/app/backend/src/utils/query-optimization.ts`
- **Full Documentation**: `/home/user/earning/app/backend/DATABASE_OPTIMIZATION.md`
- **Summary**: `/home/user/earning/app/backend/DATABASE_OPTIMIZATION_SUMMARY.md`
- **Schema**: `/home/user/earning/app/backend/prisma/schema.prisma`

---

## When to Update

Update query patterns when:
- [ ] Adding new model
- [ ] Adding new relationship
- [ ] Creating new query pattern
- [ ] Need different sort order
- [ ] Dealing with slow queries

Check `DATABASE_OPTIMIZATION.md` for:
- [ ] Which index to use
- [ ] How to optimize that query
- [ ] What's the expected performance

---

**Remember**: User-scoped filtering + proper indexes = fast queries!

