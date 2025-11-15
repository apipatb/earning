# EarnTrack API Documentation 📚

## Overview

**EarnTrack** is a comprehensive earning management and financial platform with **348+ RESTful API endpoints** across **35 phases** of development.

- **Base URL**: `https://api.earntrack.com/api/v1`
- **Current Version**: 1.0.0
- **Authentication**: Bearer Token (JWT)
- **Response Format**: JSON
- **Rate Limiting**: 100 requests per 15 minutes

---

## Authentication

All endpoints (except auth routes) require authentication using a Bearer token.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

---

## API Endpoint Categories

### 1. Authentication (4 endpoints)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh JWT token
- `POST /auth/logout` - User logout

### 2. User Management (8 endpoints)
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/settings` - Get user settings
- `PUT /user/settings` - Update user settings
- `POST /user/change-password` - Change password
- `DELETE /user/account` - Delete user account
- `GET /user/data-export` - Export user data
- `POST /user/data-deletion-request` - Request data deletion

### 3. Platform Management (10 endpoints)
- `POST /platforms` - Create platform
- `GET /platforms` - List platforms
- `GET /platforms/:id` - Get platform details
- `PUT /platforms/:id` - Update platform
- `DELETE /platforms/:id` - Delete platform
- `PATCH /platforms/:id/toggle` - Toggle platform active status
- `GET /platforms/:id/earnings-summary` - Get platform earnings
- `GET /platforms/compare` - Compare platform earnings
- `POST /platforms/bulk-create` - Bulk create platforms
- `PUT /platforms/bulk-update` - Bulk update platforms

### 4. Earnings Management (12 endpoints)
- `POST /earnings` - Create earning record
- `GET /earnings` - List earnings with filters
- `GET /earnings/:id` - Get earning details
- `PUT /earnings/:id` - Update earning
- `DELETE /earnings/:id` - Delete earning
- `GET /earnings/daily-summary` - Get daily summary
- `GET /earnings/monthly-breakdown` - Get monthly breakdown
- `POST /earnings/import` - Bulk import earnings
- `POST /earnings/export` - Export earnings
- `GET /earnings/trends` - Analyze earning trends
- `GET /earnings/forecast` - Forecast future earnings
- `GET /earnings/comparison` - Period comparison

### 5. Analytics (18 endpoints)
- `GET /analytics` - Overall analytics dashboard
- `GET /analytics/performance-metrics` - Performance metrics
- `GET /analytics/trend-analysis` - Trend analysis
- `GET /analytics/anomaly-detection` - Anomaly detection
- `GET /analytics/forecast` - Revenue forecasting
- `GET /analytics/cohort-analysis` - Cohort analysis
- `GET /analytics/funnel-analysis` - Funnel analysis
- `GET /analytics/retention-metrics` - Retention metrics
- `GET /analytics/custom-metrics` - Custom metric definitions
- `POST /analytics/snapshots` - Create analytics snapshot
- `GET /analytics/snapshots` - Get snapshots
- `POST /analytics/reports` - Generate custom report
- `GET /analytics/heatmaps` - Get earning heatmaps
- `GET /analytics/correlations` - Find data correlations
- `GET /analytics/insights` - AI-powered insights
- `POST /analytics/export` - Export analytics data
- `GET /analytics/time-series` - Time-series data
- `POST /analytics/benchmark` - Benchmark against averages

### 6. Goals Management (8 endpoints)
- `POST /goals` - Create goal
- `GET /goals` - List goals
- `GET /goals/:id` - Get goal details
- `PUT /goals/:id` - Update goal
- `DELETE /goals/:id` - Delete goal
- `GET /goals/progress` - Get goal progress
- `POST /goals/bulk-create` - Bulk create goals
- `GET /goals/achievements` - Get goal achievements

### 7. Payments & Subscriptions (12 endpoints)
- `POST /payments/stripe/webhook` - Handle Stripe webhook
- `GET /payments` - List payments
- `GET /payments/:id` - Get payment details
- `POST /payments/subscription/create` - Create subscription
- `GET /payments/subscription/status` - Get subscription status
- `PUT /payments/subscription/update` - Update subscription
- `DELETE /payments/subscription/cancel` - Cancel subscription
- `GET /payments/invoices` - List invoices
- `POST /payments/portal-session` - Create billing portal session
- `GET /payments/history` - Get payment history
- `POST /payments/retry` - Retry failed payment
- `GET /payments/statistics` - Payment statistics

### 8. Email Management (10 endpoints)
- `POST /emails/send` - Send email
- `GET /emails/templates` - List email templates
- `POST /emails/templates` - Create email template
- `PUT /emails/templates/:id` - Update email template
- `DELETE /emails/templates/:id` - Delete email template
- `POST /emails/campaigns` - Create email campaign
- `GET /emails/campaigns` - List campaigns
- `GET /emails/statistics` - Email statistics
- `POST /emails/unsubscribe` - Unsubscribe from emails
- `GET /emails/settings` - Get email settings

### 9. Affiliate Program (10 endpoints)
- `GET /affiliate/dashboard` - Affiliate dashboard
- `GET /affiliate/referral-links` - Get referral links
- `POST /affiliate/referral-links` - Create referral link
- `GET /affiliate/conversions` - Get conversions
- `GET /affiliate/commission-history` - Commission history
- `POST /affiliate/payout-request` - Request payout
- `GET /affiliate/leaderboard` - Top affiliates
- `GET /affiliate/marketing-materials` - Marketing resources
- `GET /affiliate/tier-status` - Current tier status
- `POST /affiliate/withdraw-funds` - Withdraw commission

### 10. API Management (12 endpoints)
- `POST /api-management/keys` - Create API key
- `GET /api-management/keys` - List API keys
- `DELETE /api-management/keys/:id` - Delete API key
- `POST /api-management/webhooks` - Create webhook
- `GET /api-management/webhooks` - List webhooks
- `PUT /api-management/webhooks/:id` - Update webhook
- `DELETE /api-management/webhooks/:id` - Delete webhook
- `GET /api-management/webhooks/:id/logs` - Webhook logs
- `GET /api-management/usage` - API usage statistics
- `POST /api-management/test-webhook` - Test webhook
- `GET /api-management/rate-limits` - Get rate limit status
- `POST /api-management/rate-limit-increase` - Request limit increase

### 11. Reports (12 endpoints)
- `POST /reports` - Create report
- `GET /reports` - List reports
- `GET /reports/:id` - Get report details
- `PUT /reports/:id` - Update report
- `DELETE /reports/:id` - Delete report
- `POST /reports/generate` - Generate report
- `POST /reports/export` - Export report
- `GET /reports/templates` - Report templates
- `POST /reports/schedule` - Schedule report generation
- `GET /reports/history` - Report history
- `POST /reports/share` - Share report
- `GET /reports/analytics` - Report analytics

### 12. Integrations (14 endpoints)
- `GET /integrations` - List available integrations
- `POST /integrations/:provider/connect` - Connect integration
- `DELETE /integrations/:provider` - Disconnect integration
- `GET /integrations/:provider/status` - Integration status
- `POST /integrations/:provider/sync` - Manual sync
- `GET /integrations/:provider/data` - Get integration data
- `PUT /integrations/:provider/settings` - Update settings
- `POST /integrations/:provider/test` - Test integration
- `GET /integrations/:provider/logs` - Integration logs
- `POST /integrations/slack/notify` - Send Slack notification
- `POST /integrations/google-sheets/export` - Export to Google Sheets
- `POST /integrations/zapier/trigger` - Zapier trigger
- `GET /integrations/history` - Integration sync history
- `POST /integrations/bulk-enable` - Enable multiple integrations

### 13. Team & Collaboration (16 endpoints)
- `POST /team/members` - Invite team member
- `GET /team/members` - List team members
- `PUT /team/members/:id/role` - Update member role
- `DELETE /team/members/:id` - Remove team member
- `GET /team/roles` - List available roles
- `POST /team/invitations` - Create invitation
- `GET /team/invitations` - List invitations
- `DELETE /team/invitations/:id` - Cancel invitation
- `POST /team/permissions` - Set permissions
- `GET /team/audit-log` - Team audit log
- `POST /team/announcements` - Create announcement
- `GET /team/announcements` - Get announcements
- `POST /team/feedback` - Submit team feedback
- `GET /team/statistics` - Team statistics
- `POST /team/bulk-import` - Bulk import team members
- `GET /team/activity-feed` - Team activity feed

### 14. AI Features (8 endpoints)
- `GET /ai/insights` - AI-powered insights
- `POST /ai/chat` - AI chat interface
- `POST /ai/forecasting` - AI forecasting
- `POST /ai/recommendations` - Smart recommendations
- `POST /ai/anomaly-detection` - Detect anomalies
- `POST /ai/text-analysis` - Text analysis
- `GET /ai/models` - Available AI models
- `POST /ai/training` - Train custom model

### 15. Marketplace (16 endpoints)
- `GET /marketplace/plugins` - List plugins
- `GET /marketplace/plugins/:id` - Plugin details
- `POST /marketplace/plugins/:id/install` - Install plugin
- `DELETE /marketplace/plugins/:id/uninstall` - Uninstall plugin
- `GET /marketplace/plugins/:id/reviews` - Plugin reviews
- `POST /marketplace/plugins/:id/reviews` - Leave review
- `GET /marketplace/plugins/trending` - Trending plugins
- `GET /marketplace/plugins/categories` - Plugin categories
- `POST /marketplace/plugins/publish` - Publish plugin
- `GET /marketplace/plugins/my` - My plugins
- `PUT /marketplace/plugins/:id` - Update plugin
- `DELETE /marketplace/plugins/:id` - Delete plugin
- `GET /marketplace/revenue` - Plugin revenue
- `POST /marketplace/support` - Plugin support
- `GET /marketplace/statistics` - Marketplace stats
- `POST /marketplace/request-feature` - Feature request

### 16. Social Features (14 endpoints)
- `GET /social/profile/:userId` - Get user profile
- `PUT /social/profile` - Update user profile
- `POST /social/follow/:userId` - Follow user
- `DELETE /social/follow/:userId` - Unfollow user
- `GET /social/followers` - Get followers
- `GET /social/following` - Get following
- `GET /social/leaderboard` - Global leaderboard
- `POST /social/posts` - Create post
- `GET /social/posts` - Get posts
- `POST /social/posts/:id/like` - Like post
- `DELETE /social/posts/:id/like` - Unlike post
- `POST /social/posts/:id/comment` - Comment on post
- `GET /social/badges` - User badges
- `GET /social/achievements/share` - Share achievement

### 17. Security Features (12 endpoints)
- `POST /security/2fa/enable` - Enable 2FA
- `POST /security/2fa/verify` - Verify 2FA
- `DELETE /security/2fa/disable` - Disable 2FA
- `POST /security/ip-whitelist` - Add IP to whitelist
- `GET /security/ip-whitelist` - Get whitelist
- `DELETE /security/ip-whitelist/:id` - Remove from whitelist
- `GET /security/sessions` - Active sessions
- `DELETE /security/sessions/:id` - Terminate session
- `POST /security/audit-log` - Get audit log
- `GET /security/login-history` - Login history
- `POST /security/export-data` - Export personal data
- `POST /security/delete-data` - Request data deletion

### 18. Scheduling (8 endpoints)
- `POST /scheduler/tasks` - Create scheduled task
- `GET /scheduler/tasks` - List tasks
- `PUT /scheduler/tasks/:id` - Update task
- `DELETE /scheduler/tasks/:id` - Delete task
- `GET /scheduler/execution-logs` - Execution logs
- `POST /scheduler/run-now` - Run task immediately
- `GET /scheduler/history` - Task history
- `POST /scheduler/bulk-create` - Bulk create tasks

### 19. Notifications (10 endpoints)
- `POST /notifications` - Send notification
- `GET /notifications` - Get notifications
- `PUT /notifications/:id/read` - Mark as read
- `DELETE /notifications/:id` - Delete notification
- `GET /notifications/preferences` - Notification preferences
- `PUT /notifications/preferences` - Update preferences
- `POST /notifications/test` - Send test notification
- `GET /notifications/channels` - Available channels
- `POST /notifications/schedule` - Schedule notification
- `GET /notifications/statistics` - Notification stats

### 20. Advanced Analytics (16 endpoints)
- `GET /analytics-advanced/dashboard` - Advanced dashboard
- `POST /analytics-advanced/custom-metric` - Create custom metric
- `GET /analytics-advanced/metrics` - Get metrics
- `POST /analytics-advanced/filter` - Apply filters
- `GET /analytics-advanced/visualization` - Get visualizations
- `POST /analytics-advanced/chart` - Create chart
- `GET /analytics-advanced/export` - Export analytics
- `POST /analytics-advanced/save-view` - Save custom view
- `GET /analytics-advanced/saved-views` - Get saved views
- `DELETE /analytics-advanced/saved-views/:id` - Delete view
- `POST /analytics-advanced/share-dashboard` - Share dashboard
- `GET /analytics-advanced/drill-down` - Drill down data
- `POST /analytics-advanced/pivot-table` - Create pivot table
- `GET /analytics-advanced/forecasts` - Get forecasts
- `POST /analytics-advanced/correlation` - Analyze correlation
- `GET /analytics-advanced/benchmarks` - Benchmark data

### 21. Advanced Reports (10 endpoints)
- `POST /reports-advanced/create` - Create advanced report
- `GET /reports-advanced` - List advanced reports
- `GET /reports-advanced/:id` - Get report details
- `PUT /reports-advanced/:id` - Update report
- `DELETE /reports-advanced/:id` - Delete report
- `POST /reports-advanced/:id/generate` - Generate report
- `POST /reports-advanced/schedule` - Schedule report
- `GET /reports-advanced/templates` - Report templates
- `POST /reports-advanced/share` - Share report
- `GET /reports-advanced/history` - Report history

### 22. Budgeting (14 endpoints)
- `POST /budgets` - Create budget
- `GET /budgets` - List budgets
- `GET /budgets/:id` - Get budget details
- `PUT /budgets/:id` - Update budget
- `DELETE /budgets/:id` - Delete budget
- `GET /budgets/:id/progress` - Budget progress
- `POST /budgets/categories` - Create category budget
- `GET /budgets/categories` - List category budgets
- `PUT /budgets/categories/:id` - Update category budget
- `DELETE /budgets/categories/:id` - Delete category budget
- `POST /budgets/alerts` - Create budget alert
- `GET /budgets/alerts` - List alerts
- `POST /budgets/forecasting` - Budget forecasting
- `GET /budgets/analysis` - Budget analysis

### 23. Localization (8 endpoints)
- `GET /localization/languages` - Supported languages
- `POST /localization/language` - Set language preference
- `GET /localization/translations` - Get translations
- `POST /localization/translations` - Add translation
- `PUT /localization/translations/:id` - Update translation
- `DELETE /localization/translations/:id` - Delete translation
- `GET /localization/timezones` - Get timezones
- `GET /localization/currency` - Get currencies

### 24. Workspaces & Collaboration (12 endpoints)
- `POST /workspaces` - Create workspace
- `GET /workspaces` - List workspaces
- `GET /workspaces/:id` - Get workspace details
- `PUT /workspaces/:id` - Update workspace
- `DELETE /workspaces/:id` - Delete workspace
- `POST /workspaces/:id/projects` - Create project
- `GET /workspaces/:id/projects` - List projects
- `POST /workspaces/:id/tasks` - Create task
- `GET /workspaces/:id/tasks` - List tasks
- `POST /workspaces/:id/shared-dashboards` - Share dashboard
- `GET /workspaces/:id/activity-log` - Activity log
- `GET /workspaces/:id/statistics` - Workspace statistics

### 25. Automation (12 endpoints)
- `POST /automation/rules` - Create automation rule
- `GET /automation/rules` - List rules
- `PUT /automation/rules/:id` - Update rule
- `DELETE /automation/rules/:id` - Delete rule
- `POST /automation/workflows` - Create workflow
- `GET /automation/workflows` - List workflows
- `PUT /automation/workflows/:id` - Update workflow
- `DELETE /automation/workflows/:id` - Delete workflow
- `GET /automation/execution-logs` - Execution logs
- `POST /automation/test-rule` - Test rule
- `POST /automation/bulk-create` - Bulk create rules
- `GET /automation/statistics` - Automation statistics

### 26. Real-time Features (10 endpoints)
- `GET /realtime/connections` - Active connections
- `POST /realtime/subscribe` - Subscribe to updates
- `DELETE /realtime/unsubscribe` - Unsubscribe
- `GET /realtime/presence` - User presence
- `POST /realtime/alerts` - Create real-time alert
- `GET /realtime/alerts` - Get alerts
- `DELETE /realtime/alerts/:id` - Delete alert
- `POST /realtime/broadcast` - Broadcast message
- `GET /realtime/activity-feed` - Real-time activity
- `POST /realtime/sync` - Force sync

### 27. Performance Monitoring (10 endpoints)
- `GET /performance/metrics` - Performance metrics
- `GET /performance/cpu` - CPU usage
- `GET /performance/memory` - Memory usage
- `GET /performance/database` - Database performance
- `GET /performance/api` - API performance
- `GET /performance/errors` - Error tracking
- `GET /performance/slow-queries` - Slow queries
- `POST /performance/alerts` - Create performance alert
- `GET /performance/history` - Performance history
- `POST /performance/export` - Export performance data

### 28. Backup & Recovery (14 endpoints)
- `POST /backup/create` - Create backup
- `GET /backup/list` - List backups
- `GET /backup/:id` - Get backup details
- `POST /backup/:id/restore` - Restore from backup
- `DELETE /backup/:id` - Delete backup
- `POST /backup/schedule` - Schedule backup
- `GET /backup/schedule` - Get schedule
- `POST /backup/verify` - Verify backup integrity
- `GET /backup/strategies` - Backup strategies
- `POST /backup/strategies` - Create strategy
- `GET /backup/storage-usage` - Storage usage
- `POST /backup/export` - Export backup
- `GET /backup/recovery-points` - Recovery points
- `POST /backup/archive` - Archive backup

### 29. Data Synchronization (14 endpoints)
- `POST /sync/devices` - Register device
- `GET /sync/devices` - List devices
- `DELETE /sync/devices/:id` - Remove device
- `POST /sync/manual` - Trigger sync
- `GET /sync/status` - Sync status
- `GET /sync/queue` - Sync queue
- `POST /sync/conflict-resolve` - Resolve conflict
- `GET /sync/conflicts` - List conflicts
- `GET /sync/versions` - Data versions
- `POST /sync/revert` - Revert to version
- `GET /sync/logs` - Sync logs
- `POST /sync/selective-sync` - Configure selective sync
- `GET /sync/statistics` - Sync statistics
- `POST /sync/reset` - Reset sync

### 30. Compliance Management (18 endpoints)
- `POST /compliance/records` - Create compliance record
- `GET /compliance/records` - List records
- `GET /compliance/records/:id` - Get record details
- `PUT /compliance/records/:id` - Update record
- `DELETE /compliance/records/:id` - Delete record
- `POST /compliance/policies` - Create policy
- `GET /compliance/policies` - List policies
- `PUT /compliance/policies/:id` - Update policy
- `DELETE /compliance/policies/:id` - Delete policy
- `POST /compliance/audit-logs` - Get audit logs
- `GET /compliance/violations` - List violations
- `POST /compliance/violation-resolve` - Resolve violation
- `POST /compliance/reports` - Generate report
- `GET /compliance/evidence` - Get evidence
- `POST /compliance/evidence` - Submit evidence
- `GET /compliance/frameworks` - Supported frameworks
- `POST /compliance/policy-templates` - Get templates
- `GET /compliance/dashboard` - Compliance dashboard

### 31. OCR & Receipt Scanning (15 endpoints)
- `POST /ocr/receipts` - Upload receipt
- `GET /ocr/receipts` - List receipts
- `GET /ocr/receipts/:id` - Get receipt details
- `PUT /ocr/receipts/:id` - Update receipt
- `DELETE /ocr/receipts/:id` - Delete receipt
- `POST /ocr/receipts/:id/process` - Process receipt with OCR
- `GET /ocr/results` - Get OCR results
- `POST /ocr/extract-expense` - Extract expense data
- `GET /ocr/expenses` - List expenses
- `PUT /ocr/expenses/:id` - Update expense
- `POST /ocr/expenses/:id/confirm` - Confirm expense
- `GET /ocr/analytics` - Receipt analytics
- `GET /ocr/categories` - Expense categories
- `POST /ocr/reports/generate` - Generate report
- `GET /ocr/statistics` - OCR statistics

### 32. Invoice & Billing (22 endpoints) ⭐
- `POST /invoices/invoices` - Create invoice
- `GET /invoices/invoices` - List invoices
- `GET /invoices/invoices/:id` - Get invoice details
- `PUT /invoices/invoices/:id` - Update invoice
- `PUT /invoices/invoices/:id/publish` - Publish invoice
- `DELETE /invoices/invoices/:id` - Delete invoice
- `POST /invoices/invoices/:id/tax` - Add tax to invoice
- `GET /invoices/taxes` - List taxes
- `POST /invoices/payments` - Record payment
- `GET /invoices/payments` - List payments
- `GET /invoices/analytics` - Invoice analytics
- `POST /invoices/reports/generate` - Generate invoice report
- `GET /invoices/statistics` - Invoice statistics
- `POST /invoices/templates` - Create invoice template
- `GET /invoices/templates` - Get invoice templates
- `POST /invoices/recurring` - Create recurring invoice
- `GET /invoices/recurring` - List recurring invoices
- `PUT /invoices/recurring/:id` - Update recurring invoice
- `DELETE /invoices/recurring/:id` - Delete recurring invoice
- `GET /invoices/recurring/:id/generate` - Generate from recurring
- `POST /invoices/bulk-create` - Bulk create invoices
- `GET /invoices/export` - Export invoices

---

## Request/Response Examples

### Example 1: Create Invoice

**Request**:
```http
POST /invoices/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "clientName": "Acme Corp",
  "clientEmail": "client@acme.com",
  "amount": "5000.00",
  "description": "Web Development Services",
  "dueDate": "2024-12-31",
  "taxRate": "10"
}
```

**Response (201)**:
```json
{
  "id": "inv_12345",
  "invoiceNumber": "INV-1731686400000",
  "clientName": "Acme Corp",
  "clientEmail": "client@acme.com",
  "totalAmount": 5000.00,
  "taxRate": 10,
  "taxAmount": 500.00,
  "finalAmount": 5500.00,
  "status": "draft",
  "dueDate": "2024-12-31",
  "issuedAt": "2024-11-15T12:00:00Z",
  "createdAt": "2024-11-15T12:00:00Z"
}
```

### Example 2: Get Analytics

**Request**:
```http
GET /invoices/analytics?days=30
Authorization: Bearer {token}
```

**Response (200)**:
```json
{
  "period": 30,
  "totalInvoices": 12,
  "totalInvoiced": 45000.00,
  "totalPaid": 32000.00,
  "outstanding": 13000.00,
  "collectionRate": 71.11,
  "statusBreakdown": {
    "draft": 2,
    "sent": 3,
    "paid": 5,
    "partially_paid": 2,
    "overdue": 0
  }
}
```

### Example 3: Record Payment

**Request**:
```http
POST /invoices/payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "invoiceId": "inv_12345",
  "paymentAmount": "5500.00",
  "paymentDate": "2024-11-15",
  "paymentMethod": "bank_transfer",
  "notes": "Payment received"
}
```

**Response (201)**:
```json
{
  "id": "pay_12345",
  "invoiceId": "inv_12345",
  "paymentAmount": 5500.00,
  "paymentDate": "2024-11-15",
  "paymentMethod": "bank_transfer",
  "status": "completed",
  "createdAt": "2024-11-15T12:05:00Z"
}
```

---

## Error Handling

All errors return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource conflict |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

---

## Rate Limiting

- **Standard Plan**: 100 requests per 15 minutes
- **Pro Plan**: 500 requests per 15 minutes
- **Business Plan**: Unlimited

Response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1731690000
```

---

## Pagination

List endpoints support pagination:

```http
GET /invoices/invoices?page=1&limit=20&sort=-issuedAt
```

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

## Filtering & Sorting

### Filtering
```http
GET /invoices/invoices?status=draft&clientName=Acme
GET /earnings?platformId=platform_1&dateFrom=2024-11-01
```

### Sorting
```http
GET /invoices/invoices?sort=-issuedAt (descending)
GET /earnings?sort=amount (ascending)
```

---

## WebHook Events

Available webhook event types:

- `invoice.created` - Invoice created
- `invoice.published` - Invoice sent
- `invoice.paid` - Invoice fully paid
- `invoice.partially_paid` - Invoice partially paid
- `payment.recorded` - Payment recorded
- `earning.created` - Earning added
- `goal.achieved` - Goal reached
- `subscription.upgraded` - Plan upgraded
- `subscription.downgraded` - Plan downgraded
- `compliance.violation` - Compliance violation
- `backup.completed` - Backup finished
- `sync.completed` - Data sync finished

---

## SDK/Client Libraries

- **JavaScript/TypeScript**: `npm install @earntrack/sdk`
- **Python**: `pip install earntrack-sdk`
- **Go**: `go get github.com/earntrack/sdk-go`
- **Java**: `maven` dependencies available

---

## Support

- **Documentation**: https://docs.earntrack.com
- **API Status**: https://status.earntrack.com
- **Help Center**: https://help.earntrack.com
- **Email Support**: support@earntrack.com

---

**Last Updated**: November 15, 2024
**API Version**: 1.0.0
**Total Endpoints**: 348+
**Supported Authentication**: JWT Bearer Token
