# Comprehensive Audit Logging and Compliance System for EarnTrack

## Overview

This document describes the newly implemented audit logging and compliance system for EarnTrack. The system provides complete audit trails, GDPR compliance, data export capabilities, and comprehensive compliance reporting.

## Features

### 1. **Complete Audit Trail**
- Logs all user actions (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, SHARE)
- Captures before/after values for all changes
- Tracks IP addresses and user agents
- Records success/failure status with error messages

### 2. **GDPR Compliance**
- One-click data export for users
- Comprehensive user data extraction
- Compliance report generation
- Data retention policy management

### 3. **Compliance Reports**
- Data Export reports
- Activity logs
- Access logs (READ operations)
- Retention policy reports

### 4. **Automatic Logging**
- Middleware-based automatic API call logging
- Sensitive data sanitization
- Configurable resource tracking
- Minimal performance impact

## Implementation Details

### Backend Components

#### 1. Prisma Schema Extensions (`/app/backend/prisma/schema.prisma`)

Three new models have been added:

##### `AuditLog` Model
```prisma
model AuditLog {
  id         String       @id @default(uuid())
  userId     String?      @map("user_id")
  action     AuditAction  // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, SHARE
  resource   String       // Resource type (e.g., "earnings", "users")
  resourceId String?      @map("resource_id")
  changes    String?      @db.Text // JSON: before/after values
  ipAddress  String?      @map("ip_address")
  userAgent  String?      @map("user_agent")
  status     AuditStatus  @default(SUCCESS) // SUCCESS, FAILED, PENDING
  errorMsg   String?      @map("error_msg")
  timestamp  DateTime     @default(now())
  createdAt  DateTime     @default(now()) @map("created_at")

  user       User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

##### `ComplianceReport` Model
```prisma
model ComplianceReport {
  id           String              @id @default(uuid())
  generatedBy  String              @map("generated_by")
  reportType   ComplianceReportType // DATA_EXPORT, ACTIVITY, RETENTION, ACCESS_LOG, GDPR
  period       String
  startDate    DateTime?           @map("start_date")
  endDate      DateTime?           @map("end_date")
  data         String              @db.Text // JSON report data
  fileUrl      String?             @map("file_url")
  recordCount  Int                 @default(0) @map("record_count")
  status       String              @default("COMPLETED")
  createdAt    DateTime            @default(now()) @map("created_at")

  generator    User                @relation(fields: [generatedBy], references: [id], onDelete: Cascade)
}
```

##### `DataRetention` Model
```prisma
model DataRetention {
  id           String   @id @default(uuid())
  dataType     String   @db.VarChar(100) // e.g., "earnings", "audit_logs"
  retentionDays Int     @map("retention_days")
  description  String?  @db.Text
  isActive     Boolean  @default(true) @map("is_active")
  lastReview   DateTime @map("last_review")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
}
```

#### 2. Audit Service (`/app/backend/src/services/audit.service.ts`)

Provides comprehensive audit logging functionality:

**Key Methods:**
- `logAction()` - Generic audit log creation
- `logCreate()` - Log CREATE operations
- `logUpdate()` - Log UPDATE operations with change tracking
- `logDelete()` - Log DELETE operations
- `logRead()` - Log READ operations (for sensitive data)
- `logLogin()` - Log authentication attempts
- `logLogout()` - Log user logouts
- `logExport()` - Log data exports (GDPR)
- `getAuditLogs()` - Retrieve audit logs with filters
- `searchAuditLogs()` - Search audit logs by query
- `generateAuditReport()` - Generate audit reports for date ranges
- `generateComplianceReport()` - Generate GDPR/compliance reports
- `exportUserData()` - Export all user data (GDPR)
- `cleanupOldLogs()` - Clean up old logs based on retention policy

#### 3. Audit Middleware (`/app/backend/src/middleware/audit.middleware.ts`)

Automatic logging middleware:

**Features:**
- Automatic API call logging based on HTTP methods
- IP address and User Agent tracking
- Sensitive data sanitization (passwords, tokens, etc.)
- Configurable excluded resources
- Resource and resourceId extraction from URLs
- Authentication event logging
- Data export tracking

**Usage:**
```typescript
// In server.ts, add after authentication middleware:
import { auditMiddleware, auditAuthMiddleware } from './middleware/audit.middleware';

app.use(auditMiddleware);
app.use('/api/v1/auth', auditAuthMiddleware, authRoutes);
```

#### 4. Audit Controller (`/app/backend/src/controllers/audit.controller.ts`)

Provides REST API endpoints:

**Endpoints:**
- `GET /api/v1/audit/logs` - List audit logs with filters
- `GET /api/v1/audit/logs/search` - Search audit logs
- `GET /api/v1/audit/report` - Generate audit report
- `GET /api/v1/audit/stats` - Get audit statistics
- `GET /api/v1/compliance/reports` - List compliance reports
- `GET /api/v1/compliance/reports/:id` - Get compliance report details
- `POST /api/v1/compliance/export` - Generate compliance report
- `POST /api/v1/compliance/data-export` - GDPR data export
- `DELETE /api/v1/audit/cleanup` - Clean up old logs (admin only)

#### 5. Audit Routes (`/app/backend/src/routes/audit.routes.ts`)

Express router configuration for audit endpoints.

### Frontend Components

#### 1. AuditLogs Page (`/app/frontend/src/pages/AuditLogs.tsx`)

Main page for audit and compliance features with three tabs:
- **Audit Logs**: View and search audit logs
- **Compliance Reports**: Generate and view compliance reports
- **Statistics**: View audit statistics and analytics

#### 2. AuditLogViewer Component (`/app/frontend/src/components/AuditLogViewer.tsx`)

Features:
- Advanced filtering (action, resource, status, date range)
- Full-text search
- Pagination
- Detailed log view modal
- Export functionality
- Real-time refresh

#### 3. ComplianceReportGenerator Component (`/app/frontend/src/components/ComplianceReportGenerator.tsx`)

Features:
- GDPR quick export button
- Custom compliance report generation
- Report type selection (DATA_EXPORT, ACTIVITY, ACCESS_LOG, RETENTION, GDPR)
- Date range filtering
- Report viewing and download
- JSON export

## Setup Instructions

### 1. Database Migration

Run the Prisma migration to create the new tables:

```bash
cd /home/user/earning/app/backend

# Format the schema (optional)
npx prisma format

# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name add_audit_compliance_system

# Or for production
npx prisma migrate deploy
```

### 2. Enable Audit Middleware (Optional)

To enable automatic audit logging for all API calls, add the middleware to `server.ts`:

```typescript
// After authentication middleware
import { auditMiddleware, auditAuthMiddleware } from './middleware/audit.middleware';

app.use(auditMiddleware); // Auto-log all API calls

// Add to auth routes
app.use('/api/v1/auth', auditAuthMiddleware, authRoutes);
```

**Note:** The middleware is already configured in the code but commented out to avoid performance impact until you're ready to enable it.

### 3. Configure Data Retention (Optional)

Create data retention policies in the database:

```sql
INSERT INTO data_retentions (id, data_type, retention_days, description, is_active, last_review)
VALUES
  (uuid_generate_v4(), 'audit_logs', 365, 'Audit logs retention policy - 1 year', true, NOW()),
  (uuid_generate_v4(), 'compliance_reports', 2555, 'Compliance reports retention policy - 7 years', true, NOW());
```

### 4. Add Route to Frontend Router

Add the audit logs page to your frontend router:

```typescript
// In your React Router configuration
import AuditLogs from './pages/AuditLogs';

<Route path="/audit" element={<AuditLogs />} />
```

## Usage Examples

### Backend Usage

#### Manual Audit Logging

```typescript
import { AuditService } from '../services/audit.service';

// Log a create action
await AuditService.logCreate(
  userId,
  'earnings',
  earningId,
  earningData,
  req.ip,
  req.get('user-agent')
);

// Log an update action
await AuditService.logUpdate(
  userId,
  'earnings',
  earningId,
  beforeData,
  afterData,
  req.ip,
  req.get('user-agent')
);

// Log a delete action
await AuditService.logDelete(
  userId,
  'earnings',
  earningId,
  earningData,
  req.ip,
  req.get('user-agent')
);

// Log a sensitive read
await AuditService.logRead(
  userId,
  'invoices',
  invoiceId,
  req.ip,
  req.get('user-agent')
);
```

#### Generate Compliance Report

```typescript
import { AuditService } from '../services/audit.service';

// Generate GDPR data export
const report = await AuditService.generateComplianceReport(
  userId,
  'GDPR'
);

// Generate activity report for date range
const activityReport = await AuditService.generateComplianceReport(
  userId,
  'ACTIVITY',
  new Date('2024-01-01'),
  new Date('2024-12-31')
);
```

### Frontend Usage

#### View Audit Logs

1. Navigate to `/audit` in the application
2. Click on "Audit Logs" tab
3. Use filters to narrow down logs
4. Click on a log entry to view details

#### Generate Compliance Report

1. Navigate to `/audit` in the application
2. Click on "Compliance Reports" tab
3. Select report type and date range
4. Click "Generate" button
5. View and download generated reports

#### GDPR Data Export

1. Navigate to `/audit` in the application
2. Click on "Compliance Reports" tab
3. Click "Export My Data" button
4. Data will be downloaded as JSON file

## API Documentation

### Get Audit Logs

```
GET /api/v1/audit/logs?action=CREATE&resource=earnings&limit=50&offset=0
```

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action type
- `resource` (optional): Filter by resource type
- `resourceId` (optional): Filter by resource ID
- `status` (optional): Filter by status
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `limit` (optional): Number of results per page (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe"
      },
      "action": "CREATE",
      "resource": "earnings",
      "resourceId": "uuid",
      "changes": {
        "amount": {
          "before": null,
          "after": 1000
        }
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "status": "SUCCESS",
      "errorMsg": null,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "hasMore": true
}
```

### Search Audit Logs

```
GET /api/v1/audit/logs/search?query=invoice&limit=50
```

**Query Parameters:**
- `query` (required): Search query string
- All other parameters same as Get Audit Logs

### Generate Compliance Report

```
POST /api/v1/compliance/export
Content-Type: application/json

{
  "reportType": "ACTIVITY",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "reportType": "ACTIVITY",
  "period": "2024-01-01 - 2024-12-31",
  "recordCount": 1500,
  "status": "COMPLETED",
  "createdAt": "2024-01-15T10:30:00Z",
  "message": "Compliance report generated successfully"
}
```

### GDPR Data Export

```
POST /api/v1/compliance/data-export
```

**Response:**
```json
{
  "id": "uuid",
  "data": {
    "user": {...},
    "platforms": [...],
    "earnings": [...],
    "invoices": [...],
    "auditLogs": [...]
  },
  "recordCount": 5000,
  "generatedAt": "2024-01-15T10:30:00Z",
  "message": "Your data has been exported successfully"
}
```

## Security Considerations

1. **Sensitive Data Sanitization**: The middleware automatically sanitizes sensitive fields (passwords, tokens, etc.) before logging
2. **User Context**: Audit logs are tied to user IDs, allowing for user-specific filtering
3. **IP Tracking**: All actions track IP addresses for security auditing
4. **Error Logging**: Failed operations are logged with error messages for debugging
5. **Data Retention**: Old logs can be automatically cleaned up based on retention policies

## Performance Considerations

1. **Async Logging**: All audit logging is asynchronous and non-blocking
2. **Selective Logging**: READ operations are only logged for sensitive resources
3. **Excluded Resources**: Health check and other non-critical endpoints are excluded
4. **Pagination**: Large result sets are paginated to avoid memory issues
5. **Indexing**: The schema includes indexes on commonly queried fields

## Maintenance

### Cleanup Old Logs

```
DELETE /api/v1/audit/cleanup
```

This endpoint cleans up audit logs older than the configured retention period.

**Recommendation**: Set up a cron job to run this daily:

```typescript
// In a scheduled job (e.g., using node-cron)
import { AuditService } from './services/audit.service';

schedule.scheduleJob('0 2 * * *', async () => { // Run at 2 AM daily
  await AuditService.cleanupOldLogs();
});
```

## Compliance Notes

This system helps with:
- **GDPR Article 15**: Right of access - Users can export all their data
- **GDPR Article 17**: Right to erasure - Audit trail of deletion requests
- **GDPR Article 20**: Right to data portability - JSON export format
- **GDPR Article 30**: Records of processing activities - Complete audit trail
- **SOC 2**: Audit logging requirements
- **ISO 27001**: Information security audit requirements

## Troubleshooting

### Issue: Prisma migration fails

**Solution**: Make sure you have Prisma installed and the database is running:
```bash
npm install prisma @prisma/client
npx prisma generate
```

### Issue: Frontend can't connect to audit endpoints

**Solution**: Verify the routes are registered in `server.ts`:
```typescript
app.use('/api/v1/audit', auditRoutes);
```

### Issue: Logs not being created

**Solution**:
1. Check if audit middleware is enabled
2. Verify database connection
3. Check console for errors in AuditService

## Future Enhancements

1. **Real-time Notifications**: Alert admins of suspicious activity
2. **Machine Learning**: Anomaly detection in user behavior
3. **Advanced Analytics**: Dashboards and visualizations
4. **Export Formats**: PDF, CSV export options
5. **Scheduled Reports**: Automatic report generation and email delivery
6. **Webhook Integration**: Send audit events to external systems

## Support

For questions or issues with the audit logging system, please refer to the main EarnTrack documentation or contact the development team.
