# Development Guide

## Project Structure

```
earning/
├── app/
│   ├── frontend/          # React TypeScript application
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities and helpers
│   │   │   ├── pages/       # Page components
│   │   │   ├── store/       # State management
│   │   │   ├── types/       # TypeScript type definitions
│   │   │   └── hooks/       # Custom React hooks
│   │   └── package.json
│   │
│   └── backend/           # Node.js Express API
│       ├── src/
│       │   ├── controllers/  # API endpoint handlers
│       │   ├── lib/          # Core libraries
│       │   ├── types/        # TypeScript types
│       │   ├── utils/        # Utility functions
│       │   ├── middleware/   # Express middleware
│       │   └── server.ts     # App entry point
│       ├── prisma/          # Database schema
│       └── package.json
└── DEVELOPMENT.md
```

---

## Frontend Utilities

### Safe JSON Parsing (`lib/json.ts`)

Always use safe JSON parsing to prevent crashes from corrupted data:

```typescript
import { safeJsonParse, safeJsonStringify } from '@/lib/json';

// Parse with fallback
const data = safeJsonParse<MyType>(jsonString, defaultValue);

// Stringify with error handling
const json = safeJsonStringify(obj, pretty);

// Parse with validation
const validated = safeJsonParseWithValidator(
  jsonString,
  (obj) => 'required_field' in obj,
  fallback
);
```

### Type-Safe Components (`types/components.ts`)

Use provided component types instead of `any`:

```typescript
import { ChartDataPoint, BudgetItem, ReportConfig } from '@/types/components';

const chartData: ChartDataPoint[] = [
  { label: 'Q1', value: 1000, color: '#3B82F6' },
];

const budgetItems: BudgetItem[] = [...];

const config: ReportConfig = {
  type: 'sales',
  period: 'month',
};
```

### Accessibility (`lib/accessibility.ts`)

Make components accessible to all users:

```typescript
import {
  getIconButtonLabel,
  getCollapsibleAriaAttrs,
  handleAccessibleClick,
  announceToScreenReader
} from '@/lib/accessibility';

// Icon buttons
<button aria-label={getIconButtonLabel('edit')}>
  <EditIcon />
</button>

// Collapsible sections
<div {...getCollapsibleAriaAttrs('section-id', isOpen, 'Settings')}>
  {content}
</div>

// Keyboard events
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => handleAccessibleClick(e, handleClick)}
/>

// Screen reader announcements
announceToScreenReader('Payment received successfully!', 'assertive');
```

### Constants (`lib/constants.ts`)

Use centralized constants instead of hardcoded values:

```typescript
import {
  DEFAULTS,
  EXPENSE_CATEGORIES,
  CHART_COLORS,
  PAGINATION,
  STORAGE_KEYS
} from '@/lib/constants';

// Default values
const hourlyRate = DEFAULTS.DEFAULT_HOURLY_RATE;

// Categories
const categories = EXPENSE_CATEGORIES;

// Colors for charts
const colors = CHART_COLORS;

// Pagination
const limit = PAGINATION.DEFAULT_LIMIT;

// Storage
localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
```

---

## Backend Utilities

### Resource Management (`utils/resource.ts`)

Eliminate duplicate ownership verification:

```typescript
import { checkResourceOwnership, getDateRange, handleError } from '@/utils/resource';

// Check ownership in one line
const resource = await checkResourceOwnership('invoice', invoiceId, userId, res);
if (!resource) return;

// Get date ranges
const { startDate, endDate } = getDateRange('month');

// Handle errors consistently
handleError('delete invoice', error, res);
```

### Type-Safe Models (`types/models.ts`)

Use Prisma types for safety:

```typescript
import {
  InvoiceWithDetails,
  INVOICE_STATUSES,
  GoalStatuses
} from '@/types/models';

// Strongly typed queries
const invoice: InvoiceWithDetails = await prisma.invoice.findFirst({...});

// Valid status enums
if (!INVOICE_STATUSES.includes(status)) {
  return res.status(400).json({ error: 'Invalid status' });
}
```

### Validation (`utils/validation.ts`)

Safe parameter parsing:

```typescript
import {
  parseLimitParam,
  parseOffsetParam,
  parseDateParam,
  parseEnumParam
} from '@/utils/validation';

const limit = parseLimitParam(req.query.limit); // Safe: returns 10-100
const offset = parseOffsetParam(req.query.offset); // Safe: returns 0+
const date = parseDateParam(req.query.date); // Safe: returns Date or null
const status = parseEnumParam(req.query.status, validStatuses); // Safe: validated
```

---

## API Endpoints

See `app/backend/API_ENDPOINTS.md` for comprehensive endpoint documentation.

### Pagination

All list endpoints support pagination:

```
GET /api/v1/invoices?limit=50&offset=0
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

---

## Type Safety Guidelines

### ❌ Avoid

```typescript
// Don't use 'any' types
const data: any = response.data;
const handleEdit = (invoice: any) => { ... };

// Don't cast with 'as any'
const value = data.field as any;

// Don't hardcode values
const DEFAULT_RATE = 50;
const CATEGORIES = ['Utilities', 'Rent', 'Other'];
```

### ✅ Do Use

```typescript
// Use proper interfaces
import { Invoice, InvoiceFormData } from '@/types/components';
const data: Invoice = response.data;
const handleEdit = (invoice: Invoice) => { ... };

// Use type validation
const validated = parseEnumParam(status, validStatuses);

// Use constants
import { DEFAULTS, EXPENSE_CATEGORIES } from '@/lib/constants';
const DEFAULT_RATE = DEFAULTS.DEFAULT_HOURLY_RATE;
const CATEGORIES = EXPENSE_CATEGORIES;
```

---

## Error Handling

### Frontend

```typescript
import { getErrorMessage } from '@/lib/error';
import { safeJsonParse } from '@/lib/json';
import { notify } from '@/store/notification.store';

try {
  const data = safeJsonParse<MyType>(jsonString, null);
  if (!data) throw new Error('Invalid data format');

  const response = await api.post('/endpoint', data);
} catch (error) {
  const message = getErrorMessage(error);
  notify.error('Failed', message);
}
```

### Backend

```typescript
import { handleError, checkResourceOwnership } from '@/utils/resource';
import { logger } from '@/utils/logger';

try {
  const resource = await checkResourceOwnership('invoice', id, userId, res);
  if (!resource) return;

  // Process resource
} catch (error) {
  handleError('process invoice', error, res, 500);
  logger.error('Invoice processing failed:', error);
}
```

---

## Performance Considerations

### Pagination

Always use pagination for list endpoints to prevent memory exhaustion:

```typescript
// ✅ Good: Paginated query
const items = await prisma.item.findMany({
  where: { userId },
  take: limit,
  skip: offset,
});

// ❌ Bad: No pagination, loads all records
const allItems = await prisma.item.findMany({
  where: { userId },
});
```

### Date Range Calculations

Use the date utility function for consistency:

```typescript
// ✅ Good: Proper month calculation
const { startDate, endDate } = getDateRange('month');

// ❌ Bad: Fixed 30-day "month"
const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
```

### Line Items & Related Data

For paginated list endpoints, don't load unnecessary related data:

```typescript
// ✅ Good: Minimal related data
const invoices = await prisma.invoice.findMany({
  include: {
    customer: { select: { id: true, name: true, email: true } },
  },
  skip: offset,
  take: limit,
});

// ❌ Bad: Loads all line items for every invoice
const invoices = await prisma.invoice.findMany({
  include: {
    customer: true,
    lineItems: true, // Don't include in list!
  },
  skip: offset,
  take: limit,
});
```

---

## Logging

Use structured logging instead of console:

```typescript
import { logger } from '@/utils/logger';

// ✅ Structured logging
logger.info('Invoice created', { invoiceId: '123', amount: 1000 });
logger.error('Payment failed', error, { retryCount: 3 });

// ❌ Console logging
console.log('Invoice created');
console.error('Payment failed', error);
```

---

## Testing

### Frontend Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { ChartDataPoint } from '@/types/components';

// Use proper types in tests
const mockData: ChartDataPoint[] = [
  { label: 'Q1', value: 1000 },
];

render(<Chart data={mockData} />);
expect(screen.getByText('Q1')).toBeInTheDocument();
```

### Backend API Testing

```typescript
// Use proper types for requests/responses
const response = await request(app)
  .get('/api/v1/invoices?limit=10&offset=0')
  .set('Authorization', `Bearer ${token}`);

expect(response.body.pagination).toBeDefined();
expect(response.body.data).toBeInstanceOf(Array);
```

---

## Database Migrations

Using Prisma:

```bash
# Create migration
npm run migrate:dev

# Deploy to production
npm run migrate:deploy

# View migration status
npm run migrate:status
```

---

## Environment Variables

### Frontend (.env.local)

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_DEBUG_MODE=true
```

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost/earning
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
PORT=3001
```

---

## Git Workflow

### Branch Naming

- Feature: `feature/description`
- Bug fix: `fix/description`
- Improvement: `improve/description`

### Commit Messages

```
Type: Brief description

Longer explanation if needed.
- Bullet point 1
- Bullet point 2

Fixes #123
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `improve`: Code improvement
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Dependencies, tooling

---

## Code Quality

### Linting

```bash
# Frontend
npm run lint --prefix app/frontend

# Backend
npm run lint --prefix app/backend
```

### Type Checking

```bash
# Frontend
npm run type-check --prefix app/frontend

# Backend
npm run type-check --prefix app/backend
```

### Formatting

```bash
# Both
npm run format
```

---

## Deployment

### Frontend

```bash
npm run build --prefix app/frontend
# Deploy dist/ directory to CDN or hosting
```

### Backend

```bash
npm run build --prefix app/backend
npm start --prefix app/backend
```

---

## Troubleshooting

### Common Issues

**Issue:** TypeScript error about missing types
- **Solution:** Check imports use proper type files, not `lib/api.ts`

**Issue:** API 404 errors
- **Solution:** Verify endpoint in API_ENDPOINTS.md matches controller routes

**Issue:** Pagination not working
- **Solution:** Ensure `limit` and `offset` query params are properly parsed

**Issue:** Accessibility warnings
- **Solution:** Use utilities from `lib/accessibility.ts` for ARIA attributes

---

## Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Jest Testing](https://jestjs.io/)
