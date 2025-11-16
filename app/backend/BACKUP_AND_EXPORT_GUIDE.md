# Backup and Export Functionality Guide

## Overview

The backup and export functionality provides users with the ability to:
- Export data in multiple formats (JSON, CSV, Excel, PDF)
- Create manual and automatic backups
- Restore data from backups
- View backup history and statistics
- Manage backup retention policies

## Database Schema

Two new models have been added to the Prisma schema:

### Backup Model
Stores metadata about user backups:
- `id`: Unique identifier
- `userId`: Reference to user
- `filename`: Name of the backup file
- `size`: File size in bytes (BigInt)
- `format`: Format of the backup (json, encrypted)
- `backupType`: 'manual' or 'automatic'
- `dataHash`: SHA256 hash for integrity verification
- `isRestored`: Whether this backup has been restored
- `restoredAt`: Timestamp of restoration
- `createdAt`: Creation timestamp
- `expiresAt`: Expiration date for automatic backups

### BackupHistory Model
Audit trail for backup operations:
- `id`: Unique identifier
- `backupId`: Reference to backup
- `action`: 'created', 'restored', 'deleted', 'verified'
- `status`: 'success', 'failed', 'in_progress'
- `details`: JSON metadata about the operation
- `performedBy`: User who performed the action
- `error`: Error message if action failed
- `createdAt`: Operation timestamp

## Database Migration

Run the following to apply the database changes:

```bash
cd /home/user/earning/app/backend
npm run db:migrate:dev
# or
npx prisma migrate dev
```

## API Endpoints

### Export Endpoints

#### GET /api/v1/export/json
Export all user data as JSON backup

**Query Parameters:**
- `dateFrom` (optional): Start date for filtering
- `dateTo` (optional): End date for filtering

**Response:** JSON file download

#### GET /api/v1/export/csv/:dataType
Export specific data type as CSV

**Path Parameters:**
- `dataType`: earnings, invoices, customers, expenses, sales, products

**Query Parameters:**
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date

**Response:** CSV file download

#### GET /api/v1/export/excel/:dataType
Export data as Excel format

**Path Parameters:**
- `dataType`: earnings, invoices, customers, expenses, sales, products

**Query Parameters:**
- `dateFrom` (optional): Start date
- `dateTo` (optional): End date

**Response:** XLSX file download

#### GET /api/v1/export/pdf/:reportType
Generate PDF reports

**Path Parameters:**
- `reportType`: summary, earnings, invoices, financial

**Response:** PDF file download

### Backup Management Endpoints

#### POST /api/v1/export/backup
Create a manual backup

**Request Body:**
```json
{
  "expiresInDays": 30  // optional, default 30 days
}
```

**Response:**
```json
{
  "success": true,
  "backup": {
    "id": "backup-id",
    "filename": "backup_user_2024-01-15_1234567890.json",
    "size": 102400,
    "format": "json",
    "backupType": "manual",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-14T10:30:00Z",
    "dataHash": "sha256hash"
  }
}
```

#### GET /api/v1/export/backups
List all backups for the user

**Query Parameters:**
- `limit`: Number of backups to return (default 50, max 100)
- `offset`: Pagination offset (default 0)

**Response:**
```json
{
  "success": true,
  "backups": [...],
  "total": 5,
  "limit": 50,
  "offset": 0
}
```

#### GET /api/v1/export/backups/:backupId
Get detailed information about a specific backup

**Response:**
```json
{
  "success": true,
  "backup": {
    "id": "backup-id",
    "filename": "...",
    "size": 102400,
    "format": "json",
    "backupType": "manual",
    "createdAt": "2024-01-15T10:30:00Z",
    "expiresAt": "2024-02-14T10:30:00Z",
    "isRestored": false,
    "restoredAt": null,
    "dataHash": "sha256hash",
    "history": [...]  // BackupHistory records
  }
}
```

#### POST /api/v1/export/backups/:backupId/restore
Restore data from a backup

**Response:**
```json
{
  "success": true,
  "result": {
    "backupId": "backup-id",
    "userId": "user-id",
    "recordsRestored": {
      "earnings": 50,
      "invoices": 10,
      "customers": 5,
      // ... other record counts
    },
    "restoredAt": "2024-01-15T11:00:00Z",
    "duration": 2500  // milliseconds
  }
}
```

#### DELETE /api/v1/export/backups/:backupId
Delete a backup

**Response:**
```json
{
  "success": true,
  "result": {
    "success": true,
    "backupId": "backup-id"
  }
}
```

#### POST /api/v1/export/backups/:backupId/verify
Verify backup integrity

**Response:**
```json
{
  "success": true,
  "backupId": "backup-id",
  "isValid": true,
  "verifiedAt": "2024-01-15T11:00:00Z"
}
```

#### GET /api/v1/export/backups/stats
Get backup statistics

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalBackups": 5,
    "manualBackups": 2,
    "automaticBackups": 3,
    "totalSize": 512000,
    "oldestBackupDate": "2024-01-10T10:30:00Z",
    "newestBackupDate": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/v1/export/import
Import data from JSON backup

**Request Body:**
```json
{
  "backupData": {...}  // JSON backup data or string
}
```

**Response:**
```json
{
  "success": true,
  "recordCounts": {
    "earnings": 50,
    "invoices": 10,
    // ... other counts
  }
}
```

#### GET /api/v1/export/health
Health check for export service

**Response:**
```json
{
  "status": "ok",
  "service": "export",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Automated Backup Job

The backup job runs automatically every day at 3 AM (UTC):

**Features:**
- Creates automatic backups for all users
- Expires automatic backups after 30 days
- Maintains audit trail in BackupHistory
- Cleans up expired backups
- Creates database-level backups (if configured)

**Configuration:**
- Schedule: `0 3 * * *` (Daily at 3 AM)
- Automatic backup retention: 30 days
- Maximum backups per user: 10

## File System Structure

Exports and backups are stored in:
- Exports: `./exports/`
- Backups: `./backups/`

**Note:** In production, consider using cloud storage (S3, GCS) instead of local filesystem.

## Service Classes

### ExportService

```typescript
static exportToJSON(userId: string, options?: ExportOptions): Promise<ExportResult>
static exportToCSV(userId: string, dataType: string, options?: ExportOptions): Promise<ExportResult>
static exportToExcel(userId: string, dataType: string, options?: ExportOptions): Promise<ExportResult>
static exportToPDF(userId: string, reportType?: string): Promise<ExportResult>
```

### BackupService

```typescript
static createBackup(userId: string, options?: CreateBackupOptions): Promise<BackupResult>
static restoreBackup(userId: string, backupId: string, performedBy?: string): Promise<RestoreResult>
static listBackups(userId: string, limit?: number, offset?: number): Promise<BackupList>
static getBackupDetails(userId: string, backupId: string): Promise<BackupDetails>
static deleteBackup(userId: string, backupId: string): Promise<DeleteResult>
static verifyBackup(userId: string, backupId: string): Promise<VerifyResult>
static getBackupStatistics(userId: string): Promise<BackupStatistics>
static cleanupOldBackups(userId: string, keepCount?: number): Promise<CleanupResult>
static deleteExpiredBackups(daysOld?: number): Promise<DeleteExpiredResult>
```

## Frontend Components

### DataManagement Component

A comprehensive React component for managing data exports and backups.

**Features:**
- Multiple export format options (JSON, CSV, Excel, PDF)
- Manual backup creation
- Backup listing with statistics
- Restore from backup functionality
- Backup deletion
- Date range filtering for exports

**Usage:**
```typescript
import DataManagement from '../components/DataManagement';

export default function Settings() {
  return (
    <div>
      <DataManagement />
    </div>
  );
}
```

**Tabs:**
1. **Export Data** - Export data in various formats
2. **Backups** - View and manage backups
3. **Restore** - Restore from previous backups

## Security Considerations

1. **Authentication:** All endpoints require user authentication
2. **Data Integrity:** Backups include SHA256 hash for verification
3. **Audit Trail:** All backup operations are logged in BackupHistory
4. **User Isolation:** Users can only access their own backups
5. **File Permissions:** Backup files should have restricted permissions
6. **Encryption:** Consider encrypting backups in transit and at rest
7. **Retention Policy:** Automatic backups expire after 30 days

## Performance Considerations

1. **Large Data Exports:** For users with large datasets, exports may take time
2. **Concurrent Operations:** Multiple exports/backups can run concurrently
3. **Disk Space:** Monitor disk usage for backups and exports
4. **Memory:** Large JSON exports are streamed to disk
5. **Database Load:** Backup creation queries all user data

## Error Handling

All endpoints return appropriate HTTP status codes:
- 200: Success
- 201: Created (backup creation)
- 400: Bad request (invalid parameters)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (access denied)
- 404: Not found (backup/user not found)
- 500: Server error

Error responses include descriptive messages:
```json
{
  "error": "Error title",
  "message": "Detailed error message"
}
```

## Backup Retention Policy

- **Manual Backups:** Retained indefinitely (user can delete)
- **Automatic Backups:** Retained for 30 days by default
- **Maximum Backups:** 10 most recent backups per user (older ones deleted)
- **Cleanup:** Runs daily via backup job

## Testing

Run tests with:
```bash
npm test -- export.service.test.ts
npm run test:coverage
```

Test coverage includes:
- JSON export functionality
- CSV export for all data types
- Excel export
- PDF report generation
- Backup creation and restoration
- Backup listing and statistics
- Backup cleanup and deletion
- Error handling and edge cases
- Data integrity verification

## Troubleshooting

### Backup Creation Fails
- Check disk space in `./backups/` directory
- Verify database connectivity
- Check user exists and has data

### Export Takes Too Long
- Large datasets may take time to export
- Use date range filtering for smaller exports
- Consider exporting specific data types instead of full backup

### Restore Fails
- Verify backup file exists
- Check data integrity (use verify endpoint)
- Ensure sufficient database space
- Check user has permission to restore

### Disk Space Issues
- Delete old automatic backups
- Configure cleanup job to run more frequently
- Consider archiving old backups to cloud storage

## Future Enhancements

1. **Cloud Storage:** AWS S3, Google Cloud Storage, Azure Blob
2. **Encryption:** AES-256 encryption for sensitive backups
3. **Differential Backups:** Only backup changed data
4. **Compression:** GZIP compression for backup files
5. **Streaming Restore:** Stream restore data for large backups
6. **Backup Scheduling:** Custom backup schedules per user
7. **Selective Restore:** Restore specific data types only
8. **Backup Comparison:** Diff between backups
9. **Backup Search:** Search within backup data
10. **Export Templates:** Custom export configurations

## Support

For issues or questions about backup and export functionality, please contact support or check the logs at `./logs/` for detailed error information.
