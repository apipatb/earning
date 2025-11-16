# EarnTrack Email Notification System Guide

## Overview

The EarnTrack notification system provides comprehensive email functionality using Nodemailer with support for multiple email providers and beautifully designed HTML email templates.

## System Architecture

### Core Components

1. **Mailer Library** (`src/lib/mailer.ts`)
   - Initializes Nodemailer transporter
   - Supports Gmail, SendGrid, and custom SMTP providers
   - Template rendering with Handlebars
   - Error handling and logging

2. **Notification Service** (`src/services/notification.service.ts`)
   - Business logic for all email operations
   - User notification preferences management
   - Email sending with retry logic

3. **Notification Controller** (`src/controllers/notification.controller.ts`)
   - HTTP endpoints for email operations
   - Request validation with Zod
   - Response formatting

4. **Notification Routes** (`src/routes/notification.routes.ts`)
   - RESTful API endpoints
   - Authentication middleware integration
   - Public and protected routes

5. **Email Templates** (`src/templates/emails/`)
   - Handlebars (.hbs) templates for all email types
   - Responsive HTML design
   - Professional styling

## Environment Variables Configuration

### Gmail Configuration
```env
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password
```

### SendGrid Configuration
```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@example.com
```

### Custom SMTP Configuration
```env
EMAIL_PROVIDER=custom
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM_EMAIL=noreply@example.com
SMTP_SECURE=false
```

### Additional Configuration
```env
FRONTEND_URL=https://example.com
SUPPORT_EMAIL=support@example.com
```

## API Endpoints

### Public Endpoints

#### 1. Send Test Email
```
POST /api/v1/notifications/test-email
Content-Type: application/json

{
  "email": "user@example.com",
  "userName": "John Doe" (optional)
}

Response:
{
  "success": true,
  "message": "Test email sent to user@example.com"
}
```

#### 2. Send Password Reset Email
```
POST /api/v1/notifications/send-password-reset
Content-Type: application/json

{
  "email": "user@example.com",
  "resetToken": "reset-token-abc123"
}

Response:
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### 3. Check Mailer Status
```
GET /api/v1/notifications/status

Response:
{
  "success": true,
  "status": {
    "configured": true,
    "provider": "gmail"
  }
}
```

### Protected Endpoints (Requires Authentication)

#### 1. Get Notification Preferences
```
GET /api/v1/notifications/preferences
Authorization: Bearer {jwt-token}

Response:
{
  "success": true,
  "preferences": {
    "emailNotificationsEnabled": true,
    "weeklyReportEnabled": true,
    "invoiceNotificationEnabled": true,
    "expenseAlertEnabled": true
  }
}
```

#### 2. Update Notification Preferences
```
PUT /api/v1/notifications/preferences
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "emailNotificationsEnabled": true,
  "weeklyReportEnabled": false,
  "invoiceNotificationEnabled": true,
  "expenseAlertEnabled": true
}

Response:
{
  "success": true,
  "message": "Notification preferences updated",
  "preferences": { ... }
}
```

#### 3. Resend Invoice Email
```
POST /api/v1/notifications/resend-invoice
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "invoiceId": "invoice-123",
  "recipientEmail": "customer@example.com",
  "recipientName": "John Doe" (optional)
}

Response:
{
  "success": true,
  "message": "Invoice email sent to customer@example.com"
}
```

#### 4. Send Welcome Email
```
POST /api/v1/notifications/send-welcome
Authorization: Bearer {jwt-token}

Response:
{
  "success": true,
  "message": "Welcome email sent to user@example.com"
}
```

#### 5. Send Payment Confirmation
```
POST /api/v1/notifications/send-payment-confirmation
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "invoiceId": "invoice-123",
  "recipientEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "message": "Payment confirmation email sent"
}
```

## Email Types

### 1. Welcome Email
- **Recipient**: New user on signup
- **Template**: `welcome.hbs`
- **Method**: `NotificationService.sendWelcomeEmail(user, verificationLink?)`
- **Data**:
  - User name and email
  - Optional email verification link
  - Features overview

### 2. Invoice Email
- **Recipient**: Customer
- **Template**: `invoice.hbs`
- **Method**: `NotificationService.sendInvoiceEmail(invoiceId, recipientEmail, recipientName?)`
- **Data**:
  - Invoice details (number, date, due date)
  - Line items with pricing
  - Subtotal, tax, discount, total
  - Sender information
  - Notes (optional)

### 3. Payment Confirmation Email
- **Recipient**: Customer
- **Template**: `payment-confirmation.hbs`
- **Method**: `NotificationService.sendPaymentConfirmation(invoiceId, recipientEmail)`
- **Data**:
  - Invoice number
  - Payment amount
  - Payment date and method
  - Additional notes (optional)

### 4. Expense Alert Email
- **Recipient**: User
- **Template**: `expense-alert.hbs`
- **Method**: `NotificationService.sendExpenseAlert(userId, expense, threshold?)`
- **Conditions**:
  - Only sends if `expenseAlertEnabled` is true
  - Requires expense amount > threshold
- **Data**:
  - Category name
  - Expense amount
  - Description and vendor
  - Alert threshold (optional)

### 5. Weekly Summary Email
- **Recipient**: User
- **Template**: `weekly-summary.hbs`
- **Method**: `NotificationService.sendWeeklySummary(userId, summaryData)`
- **Conditions**:
  - Only sends if `weeklyReportEnabled` is true
- **Data**:
  - Week date range
  - Total earnings and expenses
  - Net income
  - Top platform statistics
  - Goal progress percentage
  - Platform breakdown (optional)

### 6. Password Reset Email
- **Recipient**: User
- **Template**: `password-reset.hbs`
- **Method**: `NotificationService.sendPasswordReset(user, resetToken, resetTokenExpiry?)`
- **Data**:
  - User name
  - Reset link with token
  - Token expiry time (default: 1 hour)
  - Support email (optional)

## User Preferences Model

The `User` model now includes the following notification preference fields:

```prisma
model User {
  // ... existing fields ...

  // Email notification preferences
  emailNotificationsEnabled Boolean @default(true) @map("email_notifications_enabled")
  weeklyReportEnabled Boolean @default(true) @map("weekly_report_enabled")
  invoiceNotificationEnabled Boolean @default(true) @map("invoice_notification_enabled")
  expenseAlertEnabled Boolean @default(true) @map("expense_alert_enabled")

  // ... relationships ...
}
```

## Usage Examples

### Send Welcome Email to New User
```typescript
import { NotificationService } from './services/notification.service';

const user = await prisma.user.findUnique({ where: { id: userId } });
await NotificationService.sendWelcomeEmail(user);
```

### Send Invoice Email
```typescript
await NotificationService.sendInvoiceEmail(
  invoiceId,
  'customer@example.com',
  'John Doe'
);
```

### Send Weekly Summary
```typescript
const summaryData = {
  userName: user.name,
  weekStartDate: '2024-01-01',
  weekEndDate: '2024-01-07',
  totalEarnings: '1500.00',
  totalExpenses: '200.00',
  netIncome: '1300.00',
  topPlatform: 'Fiverr',
  topPlatformEarnings: '800.00',
  goalProgress: '85'
};

await NotificationService.sendWeeklySummary(userId, summaryData);
```

### Update User Preferences
```typescript
await NotificationService.updateUserNotificationPreferences(userId, {
  emailNotificationsEnabled: false,
  weeklyReportEnabled: true
});
```

### Check Email Service Status
```typescript
import { mailer } from './lib/mailer';

const status = mailer.getStatus();
console.log('Email configured:', status.configured);
console.log('Provider:', status.provider);
```

## Error Handling

All email functions include comprehensive error handling:

```typescript
try {
  await NotificationService.sendWelcomeEmail(user);
} catch (error) {
  logger.error('Failed to send welcome email:', error);
  // Handle error appropriately
}
```

Errors are logged with:
- Error message
- Function context
- User/resource information
- Stack trace

## Testing

### Run Notification Tests
```bash
npm test -- src/__tests__/notification.service.test.ts
```

### Test Coverage
- 28 comprehensive unit tests
- Mock email service for testing
- Tests for all email types
- Error handling scenarios
- Preference management tests
- Template rendering tests
- Integration scenarios

### Example Test
```typescript
it('should send welcome email to new user', async () => {
  await NotificationService.sendWelcomeEmail(mockUser);

  expect(mailer.sendEmail).toHaveBeenCalledWith({
    to: mockUser.email,
    subject: 'Welcome to EarnTrack!',
    template: 'welcome',
    context: expect.any(Object)
  });
});
```

## Database Migration

To add the notification preferences fields to the database:

```bash
# Generate migration
npm run db:migrate:dev -- --name add_notification_preferences

# Push changes to database
npm run db:push
```

## Security Considerations

1. **Email Validation**: All email addresses are validated before sending
2. **Token Security**: Reset tokens are securely generated and have expiry times
3. **Rate Limiting**: Email endpoints are protected by rate limiting
4. **Authentication**: Protected endpoints require valid JWT tokens
5. **User Privacy**: Email preferences are user-controlled
6. **Secrets Management**: Sensitive credentials stored in environment variables

## Monitoring and Logging

All email operations are logged using Winston logger:

```
[2024-01-15 10:30:45] [INFO] Email sent successfully
  messageId: <abc123@example.com>
  to: user@example.com
  subject: Welcome to EarnTrack!
```

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify email service is configured: `GET /api/v1/notifications/status`
3. Send test email: `POST /api/v1/notifications/test-email`
4. Check logs for detailed error messages

### Gmail Issues
- Use App Passwords, not regular password
- Enable "Less secure app access" if needed
- Check Gmail security settings

### SendGrid Issues
- Verify API key has email sending permissions
- Check sender email is verified in SendGrid account
- Ensure IP is whitelisted if applicable

### Custom SMTP Issues
- Test SMTP connection separately
- Verify SSL/TLS settings
- Check firewall/port access

## Files Included

### Core Files
- `/src/lib/mailer.ts` - Mailer initialization (290 lines)
- `/src/services/notification.service.ts` - Service layer (385 lines)
- `/src/controllers/notification.controller.ts` - API endpoints (280 lines)
- `/src/routes/notification.routes.ts` - Route definitions (75 lines)

### Email Templates
- `src/templates/emails/welcome.hbs` - Welcome template
- `src/templates/emails/invoice.hbs` - Invoice template
- `src/templates/emails/payment-confirmation.hbs` - Payment template
- `src/templates/emails/expense-alert.hbs` - Expense alert template
- `src/templates/emails/weekly-summary.hbs` - Weekly report template
- `src/templates/emails/password-reset.hbs` - Password reset template

### Tests
- `/src/__tests__/notification.service.test.ts` - 28 comprehensive tests

### Database
- Updated `prisma/schema.prisma` - Added notification preference fields

## Next Steps

1. Configure email provider in `.env`
2. Run database migrations
3. Update user signup flow to use `sendWelcomeEmail()`
4. Integrate invoice sending in invoice workflow
5. Set up weekly summary scheduler
6. Add notification preferences to user settings UI
7. Test all email types in development

## Version Info

- Node.js: v16+ required
- Express: 4.18+
- Nodemailer: ^6.9.0
- Prisma: ^5.7.0
- Zod: ^3.22.0

## Support

For issues or questions:
1. Check logs: `logs/` directory
2. Review test examples: `src/__tests__/notification.service.test.ts`
3. Check API documentation above
4. Verify environment configuration
