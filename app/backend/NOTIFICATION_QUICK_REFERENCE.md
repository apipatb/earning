# Notification System Quick Reference

## Installation & Setup

```bash
# Already installed:
npm install nodemailer nodemailer-express-handlebars @types/nodemailer

# Environment variables:
EMAIL_PROVIDER=gmail  # or sendgrid or custom
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

## Quick Start

### 1. Import Service
```typescript
import { NotificationService } from './services/notification.service';
```

### 2. Send Emails

#### Welcome Email
```typescript
await NotificationService.sendWelcomeEmail(user);
```

#### Invoice Email
```typescript
await NotificationService.sendInvoiceEmail(
  invoiceId,
  'customer@example.com',
  'John Doe'
);
```

#### Payment Confirmation
```typescript
await NotificationService.sendPaymentConfirmation(
  invoiceId,
  'customer@example.com'
);
```

#### Expense Alert
```typescript
await NotificationService.sendExpenseAlert(
  userId,
  expenseObject,
  threshold  // optional
);
```

#### Weekly Summary
```typescript
await NotificationService.sendWeeklySummary(userId, {
  weekStartDate: '2024-01-01',
  weekEndDate: '2024-01-07',
  totalEarnings: '1500.00',
  totalExpenses: '200.00',
  netIncome: '1300.00'
});
```

#### Password Reset
```typescript
await NotificationService.sendPasswordReset(
  user,
  resetToken,
  expiryDate  // optional
);
```

#### Test Email
```typescript
await NotificationService.sendTestEmail('test@example.com', 'User Name');
```

## API Endpoints

### Public
```
POST  /api/v1/notifications/test-email
POST  /api/v1/notifications/send-password-reset
GET   /api/v1/notifications/status
```

### Authenticated
```
GET   /api/v1/notifications/preferences
PUT   /api/v1/notifications/preferences
POST  /api/v1/notifications/resend-invoice
POST  /api/v1/notifications/send-welcome
POST  /api/v1/notifications/send-payment-confirmation
```

## User Preferences

### Get Preferences
```typescript
const prefs = await NotificationService.getUserNotificationPreferences(userId);
```

### Update Preferences
```typescript
await NotificationService.updateUserNotificationPreferences(userId, {
  emailNotificationsEnabled: false,
  weeklyReportEnabled: true,
  invoiceNotificationEnabled: true,
  expenseAlertEnabled: true
});
```

## Email Types at a Glance

| Type | Template | Method | Requires Pref |
|------|----------|--------|--------------|
| Welcome | welcome.hbs | `sendWelcomeEmail()` | - |
| Invoice | invoice.hbs | `sendInvoiceEmail()` | invoiceNotificationEnabled |
| Payment | payment-confirmation.hbs | `sendPaymentConfirmation()` | - |
| Expense Alert | expense-alert.hbs | `sendExpenseAlert()` | expenseAlertEnabled |
| Weekly Summary | weekly-summary.hbs | `sendWeeklySummary()` | weeklyReportEnabled |
| Password Reset | password-reset.hbs | `sendPasswordReset()` | - |
| Test | Raw HTML | `sendTestEmail()` | - |

## Mailer Status

```typescript
import { mailer } from './lib/mailer';

const status = mailer.getStatus();
console.log(status.configured);  // true/false
console.log(status.provider);    // 'gmail', 'sendgrid', etc
```

## Error Handling

```typescript
try {
  await NotificationService.sendWelcomeEmail(user);
} catch (error) {
  console.error('Email failed:', error.message);
  // Handle error
}
```

## Testing

### Run Tests
```bash
npm test -- src/__tests__/notification.service.test.ts
```

### Test Example
```typescript
it('should send welcome email', async () => {
  await NotificationService.sendWelcomeEmail(user);
  expect(mailer.sendEmail).toHaveBeenCalled();
});
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Emails not sending | Check `status` endpoint, verify env vars |
| Gmail auth fails | Use App Password, not regular password |
| SendGrid error | Verify API key, check sender email |
| Templates missing | Run `npm run db:generate` |

## File Structure

```
src/
├── lib/
│   └── mailer.ts              # Transporter setup
├── services/
│   └── notification.service.ts # Business logic
├── controllers/
│   └── notification.controller.ts # API handlers
├── routes/
│   └── notification.routes.ts # Route definitions
├── templates/
│   └── emails/
│       ├── welcome.hbs
│       ├── invoice.hbs
│       ├── payment-confirmation.hbs
│       ├── expense-alert.hbs
│       ├── weekly-summary.hbs
│       └── password-reset.hbs
└── __tests__/
    └── notification.service.test.ts # 28 tests
```

## Database Fields

```sql
ALTER TABLE users ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN weekly_report_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN invoice_notification_enabled BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN expense_alert_enabled BOOLEAN DEFAULT true;
```

## TypeScript Types

```typescript
// Email options
interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
  }>;
}

// User preferences
{
  emailNotificationsEnabled: boolean;
  weeklyReportEnabled: boolean;
  invoiceNotificationEnabled: boolean;
  expenseAlertEnabled: boolean;
}
```

## Integration Example

```typescript
// In user creation
const newUser = await prisma.user.create({
  data: { email, passwordHash, name }
});

// Send welcome email
await NotificationService.sendWelcomeEmail(newUser);

// In invoice workflow
await NotificationService.sendInvoiceEmail(
  invoice.id,
  customer.email,
  customer.name
);

// After payment
await NotificationService.sendPaymentConfirmation(
  invoice.id,
  customer.email
);
```

## API Request Examples

### Test Email
```bash
curl -X POST http://localhost:3001/api/v1/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "userName": "John"
  }'
```

### Update Preferences
```bash
curl -X PUT http://localhost:3001/api/v1/notifications/preferences \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "weeklyReportEnabled": false,
    "expenseAlertEnabled": true
  }'
```

### Check Status
```bash
curl http://localhost:3001/api/v1/notifications/status
```

## Environment Variables Checklist

- [ ] EMAIL_PROVIDER set
- [ ] Provider credentials set (GMAIL_USER, SENDGRID_API_KEY, etc.)
- [ ] FRONTEND_URL set
- [ ] SUPPORT_EMAIL set (optional)
- [ ] Database migrations run
- [ ] Tests passing
- [ ] All templates present in `src/templates/emails/`

## Next Actions

1. ✅ Install dependencies
2. ✅ Create mailer.ts
3. ✅ Create notification.service.ts
4. ✅ Create email templates
5. ✅ Create notification.controller.ts
6. ✅ Create notification.routes.ts
7. ✅ Update User model
8. ✅ Add 28 tests
9. → Configure .env file
10. → Run database migrations
11. → Integrate into your app flows
12. → Test in development
13. → Deploy to production

## Support & Resources

- Full Guide: `NOTIFICATION_SYSTEM_GUIDE.md`
- Tests: `src/__tests__/notification.service.test.ts`
- Mailer: `src/lib/mailer.ts`
- Service: `src/services/notification.service.ts`
- Controller: `src/controllers/notification.controller.ts`
- Templates: `src/templates/emails/`
