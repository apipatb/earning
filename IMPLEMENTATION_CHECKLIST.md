# Implementation Checklist

## Phase 1: Critical Issues (BEFORE PRODUCTION)
**Target: 1-2 days**

### Pagination (6 Endpoints)
- [ ] Add pagination to `customer.getAllCustomers()`
  - [ ] Add `limit` and `offset` parameters
  - [ ] Update Prisma query with `take` and `skip`
  - [ ] Add `total` count
  - [ ] Add `has_more` flag to response
  - [ ] Test with large dataset

- [ ] Add pagination to `product.getAllProducts()`
  - [ ] Same steps as above
  
- [ ] Add pagination to `platform.getAllPlatforms()`
  - [ ] Same steps as above
  
- [ ] Add pagination to `inventory.getInventory()`
  - [ ] Same steps as above
  - [ ] Only include recent logs (take: 5 or less)
  
- [ ] Update `analytics.getSummary()` to handle large datasets
  - [ ] Either add pagination OR limit to recent 1000 records
  - [ ] Add date filtering
  
- [ ] Update `expense.getExpenseSummary()` 
  - [ ] Add date range filtering
  - [ ] Validate startDate < endDate

### Input Validation (4 Controllers)
- [ ] Analytics: Validate `period` parameter explicitly
  - [ ] Check period is in ['today', 'week', 'month', 'year']
  - [ ] Return 400 if invalid
  
- [ ] Analytics & Expense & Sale: Validate startDate < endDate
  - [ ] Add check before processing
  - [ ] Return 400 with clear message
  
- [ ] Customer: Validate `sortBy` parameter
  - [ ] Check before switch statement
  
- [ ] Invoice: Validate `status` parameter
  - [ ] Check before use
  
- [ ] Sale: Validate quantity * unitPrice = totalAmount (on update)
  - [ ] Add tolerance for decimals

### Query Aggregation (7 Endpoints)
- [ ] Replace memory aggregation with database aggregation
  - [ ] `invoice.getInvoiceSummary()` - Use Prisma aggregate or raw SQL
  - [ ] `platform.getAllPlatforms()` - Use Prisma aggregate for stats
  - [ ] `product.getAllProducts()` - Use Prisma aggregate for stats
  - [ ] `sale.getSalesSummary()` - Use database grouping
  - [ ] `expense.getProfitMargin()` - Use Prisma aggregate
  - [ ] `expense.getExpenseSummary()` - Use database grouping
  - [ ] `inventory.getInventory()` - Limit related logs
  
- [ ] Test performance with 10k+ records

---

## Phase 2: High Priority Issues (NEXT SPRINT)
**Target: 2-3 days**

### Create New Utility Files

#### 1. `src/utils/dateRange.ts`
- [ ] Create `calculateDateRange()` function
  - [ ] Support period: 'today' | 'week' | 'month' | 'year'
  - [ ] Support custom date range
  - [ ] Validate startDate < endDate
  - [ ] Return null on invalid input
- [ ] Create `DateRange` interface
- [ ] Create `Period` type

#### 2. `src/constants/enums.ts`
- [ ] Define `INVOICE_STATUS` object with all statuses
- [ ] Define `INVOICE_STATUS_ARRAYS` for common combinations
- [ ] Define `SALE_STATUS` object
- [ ] Define `INVENTORY_LOG_TYPE` object
- [ ] Add JSDoc comments for each enum

#### 3. `src/utils/dbBuilders.ts`
- [ ] Create `buildCustomerWhere()` function
  - [ ] Takes userId, optional filters
  - [ ] Returns typed `Prisma.CustomerWhereInput`
- [ ] Create `buildEarningWhere()` function
- [ ] Create `buildExpenseWhere()` function
- [ ] Create `buildInvoiceWhere()` function
- [ ] Create `buildSaleWhere()` function
- [ ] Use for all GET endpoints

#### 4. `src/utils/errorHandler.ts`
- [ ] Create `AppError` class
- [ ] Create `handleControllerError()` utility
- [ ] Handle ZodError specifically
- [ ] Handle AppError specifically
- [ ] Generic error handling
- [ ] Use in all controllers

#### 5. `src/middleware/ownership.ts`
- [ ] Create `verifyResourceOwnership()` middleware factory
  - [ ] Takes model name as parameter
  - [ ] Fetches resource by id + userId
  - [ ] Returns 404 if not found
  - [ ] Attaches resource to req
- [ ] Support all models: customer, product, earning, expense, invoice, etc.

#### 6. Update `src/types/responses.ts`
- [ ] Define response types for each controller endpoint
- [ ] Export types for use in controllers
- [ ] Update controller imports to use types
- [ ] Use generic `res.json<Type>()` pattern

### Refactor Controllers

#### 1. Extract Date Range Logic
- [ ] Replace all `switch (period)` logic with `calculateDateRange()`
  - [ ] `analytics.controller.ts`
  - [ ] `expense.controller.ts` (2 functions)
  - [ ] `sale.controller.ts`

#### 2. Extract Ownership Verification
- [ ] Remove repeated `findFirst()` checks
  - [ ] `customer.controller.ts` - update, delete, getDetails
  - [ ] `earning.controller.ts` - update, delete
  - [ ] `expense.controller.ts` - update, delete
  - [ ] `goal.controller.ts` - getOne, update, delete, updateProgress
  - [ ] `invoice.controller.ts` - update, markPaid, delete
  - [ ] `platform.controller.ts` - update, delete
  - [ ] `product.controller.ts` - update, delete
  - [ ] `sale.controller.ts` - update, delete
  
- [ ] Register middleware in routes

#### 3. Use Type-Safe Builders
- [ ] Replace `const where: any = { userId }` patterns
  - [ ] Use `buildCustomerWhere()` in customer.controller
  - [ ] Use `buildEarningWhere()` in earning.controller
  - [ ] Use `buildExpenseWhere()` in expense.controller
  - [ ] Use `buildInvoiceWhere()` in invoice.controller
  - [ ] Use `buildSaleWhere()` in sale.controller

#### 4. Use Centralized Enums
- [ ] Replace hardcoded arrays with constants
  - [ ] `invoice.controller.ts` - Replace status arrays
  - [ ] `sale.controller.ts` - Replace status enums
  - [ ] `inventory.controller.ts` - Replace type arrays

#### 5. Improve Error Handling
- [ ] Replace all try/catch with `handleControllerError()`
- [ ] Remove generic error messages
- [ ] Add more context where needed

---

## Phase 3: Medium Priority Issues
**Target: 1-2 days**

### Validation & Business Logic
- [ ] Add invoice number uniqueness validation per user
  - [ ] In `invoice.createInvoice()`
  - [ ] Check existing count before create
  
- [ ] Add product active status check in sale.createSale()
  - [ ] Verify product.isActive = true
  
- [ ] Add deadline validation in goal operations
  - [ ] Don't allow past deadlines for new goals
  
- [ ] Add decimal/currency type usage
  - [ ] Replace Number conversions with Decimal where appropriate

### Code Quality
- [ ] Simplify complex ternary operators
  - [ ] `inventory.getLowStockAlerts()` line 272 - extract severity function
  - [ ] Extract helper functions for complex logic
  
- [ ] Add JSDoc comments to all exported functions
- [ ] Document error responses in comments
- [ ] Add examples for pagination usage

### Error Messages
- [ ] Improve generic error messages with more context
- [ ] Add distinction between validation, auth, and system errors
- [ ] Include troubleshooting info where helpful

---

## Phase 4: Polish (OPTIONAL)
**Target: 1 day**

- [ ] Standardize response field naming (camelCase vs snake_case)
- [ ] Add rate limiting/throttling
- [ ] Add request length validation
- [ ] Add caching where appropriate
- [ ] Performance testing with real dataset sizes
- [ ] Add monitoring/alerting for slow queries

---

## Testing Checklist

### Unit Tests
- [ ] Test `calculateDateRange()` with all periods
- [ ] Test `calculateDateRange()` with invalid inputs
- [ ] Test `buildCustomerWhere()` with various filters
- [ ] Test `parseEnumParam()` with valid/invalid values

### Integration Tests
- [ ] Test pagination with exactly limit records
- [ ] Test pagination with 0 records
- [ ] Test pagination with offset > total
- [ ] Test aggregation queries match memory calculations
- [ ] Test ownership verification denies access
- [ ] Test ownership verification allows access
- [ ] Test date range validation rejects invalid ranges

### Performance Tests
- [ ] Test queries with 10k+ records
- [ ] Compare before/after aggregation performance
- [ ] Measure pagination vs non-paginated response times
- [ ] Check memory usage with large datasets

### Security Tests
- [ ] Test ownership verification on all protected endpoints
- [ ] Test injection attempts in search parameter
- [ ] Test invalid enum values are rejected
- [ ] Test date range validation prevents reversed dates

---

## Controller-by-Controller Action Items

### analytics.controller.ts
- [ ] Implement pagination for earnings data
- [ ] Extract date range calculation
- [ ] Validate period parameter
- [ ] Validate startDate < endDate

### auth.controller.ts
**Status: GOOD** - No changes needed

### customer.controller.ts
- [ ] Add pagination to getAllCustomers
- [ ] Validate sortBy parameter
- [ ] Extract ownership verification
- [ ] Use buildCustomerWhere()
- [ ] Add response types

### earning.controller.ts
- [ ] Use buildEarningWhere()
- [ ] Extract ownership verification
- [ ] Add response types
- [ ] Consider pagination for large datasets

### expense.controller.ts
- [ ] Extract date range calculation (2 places)
- [ ] Implement database aggregation in getProfitMargin
- [ ] Implement database aggregation in getExpenseSummary
- [ ] Use buildExpenseWhere()
- [ ] Extract ownership verification
- [ ] Validate startDate < endDate

### goal.controller.ts
- [ ] Extract ownership verification
- [ ] Optimize updateGoalProgress (incremental vs recalculate)
- [ ] Add response types

### inventory.controller.ts
- [ ] Add pagination to getInventory
- [ ] Limit inventoryLogs to recent entries
- [ ] Extract ownership verification
- [ ] Extract severity calculation helper
- [ ] Add response types

### invoice.controller.ts
- [ ] Implement database aggregation in getInvoiceSummary
- [ ] Use INVOICE_STATUS constants
- [ ] Validate status parameter
- [ ] Add invoice number uniqueness check
- [ ] Extract ownership verification
- [ ] Use buildInvoiceWhere()
- [ ] Add response types

### platform.controller.ts
- [ ] Add pagination to getAllPlatforms
- [ ] Use Prisma aggregate for stats
- [ ] Extract ownership verification
- [ ] Add response types

### product.controller.ts
- [ ] Add pagination to getAllProducts
- [ ] Use Prisma aggregate for stats
- [ ] Extract ownership verification
- [ ] Add response types

### sale.controller.ts
- [ ] Extract date range calculation
- [ ] Use database aggregation in getSalesSummary
- [ ] Validate calculated fields (quantity * price = total)
- [ ] Use SALE_STATUS constants
- [ ] Extract ownership verification
- [ ] Use buildSaleWhere()
- [ ] Add response types

### user.controller.ts
**Status: GOOD** - No changes needed

---

## Deployment Checklist

Before merging to main:
- [ ] All critical issues resolved
- [ ] All tests passing (unit, integration, performance)
- [ ] Database migration tested (if needed)
- [ ] Security review completed
- [ ] No breaking API changes (or documented)
- [ ] Updated API documentation
- [ ] Load tested with realistic data volumes
- [ ] Error scenarios tested
- [ ] Rollback plan documented

---

## Documentation Updates Needed

- [ ] API documentation for pagination parameters
- [ ] Error code documentation
- [ ] Date range parameter format documentation
- [ ] Enum values documentation
- [ ] Rate limiting documentation (if added)

---

## Estimated Time Breakdown

| Phase | Component | Est. Time |
|-------|-----------|-----------|
| 1 | Add Pagination | 4-6 hours |
| 1 | Input Validation | 2-3 hours |
| 1 | Query Aggregation | 3-4 hours |
| 1 | Testing | 2-3 hours |
| 2 | Create Utils/Types | 4-5 hours |
| 2 | Refactor Controllers | 4-6 hours |
| 2 | Testing | 2-3 hours |
| 3 | Validation/Logic | 2-3 hours |
| 3 | Code Quality | 2-3 hours |
| **Total** | | **30-35 hours** |

**Suggested approach:** 1 week with 2 developers (5 hours/day focus on this)

