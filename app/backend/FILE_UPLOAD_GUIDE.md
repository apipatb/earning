# File Upload Implementation Guide

## Overview

This document describes the file upload functionality implemented using multer, sharp, and the Prisma database.

## Features

- **File Types Supported**: PDF, PNG, JPG, JPEG
- **Max File Size**: 50MB
- **Image Compression**: Automatic image compression using Sharp (resized to 2048x2048, JPEG quality 80)
- **Memory Storage**: Files stored in memory with metadata persisted to database
- **Authentication**: All upload endpoints require JWT authentication
- **User Isolation**: Users can only access their own uploads

## Installation

The following packages have been installed:

```bash
npm install multer sharp @types/multer
```

## Database Schema

### Document Model

A new `Document` model has been added to the Prisma schema:

```prisma
model Document {
  id           String   @id // Custom ID (file hash)
  userId       String   @map("user_id")
  filename     String   @db.VarChar(255)
  storageName  String   @map("storage_name") @db.VarChar(255) // Name in storage
  mimetype     String   @db.VarChar(50)
  size         Int      // File size in bytes
  uploadedAt   DateTime @map("uploaded_at") @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, id])
  @@index([userId, uploadedAt(sort: Desc)])
  @@map("documents")
}
```

## API Endpoints

### 1. Upload a Document

**Endpoint**: `POST /api/v1/upload`

**Authentication**: Required (Bearer token)

**Request**:
```
Headers:
  Authorization: Bearer {token}
  Content-Type: multipart/form-data

Body:
  file: <binary file data>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "document": {
    "id": "a1b2c3d4e5f6g7h8",
    "filename": "document.pdf",
    "mimetype": "application/pdf",
    "size": 102400,
    "uploadedAt": "2025-11-16T13:30:00.000Z"
  }
}
```

**Error Responses**:
- `400`: No file provided or invalid file type
- `401`: Unauthorized (no token or invalid token)
- `413`: File size exceeds 50MB limit

### 2. List User Documents

**Endpoint**: `GET /api/v1/upload`

**Authentication**: Required (Bearer token)

**Request**:
```
Headers:
  Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "documents": [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "filename": "document.pdf",
      "mimetype": "application/pdf",
      "size": 102400,
      "uploadedAt": "2025-11-16T13:30:00.000Z"
    }
  ],
  "total": 1
}
```

### 3. Get Document Metadata

**Endpoint**: `GET /api/v1/upload/:fileId`

**Authentication**: Required (Bearer token)

**Request**:
```
Headers:
  Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "document": {
    "id": "a1b2c3d4e5f6g7h8",
    "filename": "document.pdf",
    "mimetype": "application/pdf",
    "size": 102400,
    "uploadedAt": "2025-11-16T13:30:00.000Z"
  }
}
```

**Error Responses**:
- `403`: Access denied (not file owner)
- `404`: Document not found
- `401`: Unauthorized

### 4. Delete Document

**Endpoint**: `DELETE /api/v1/upload/:fileId`

**Authentication**: Required (Bearer token)

**Request**:
```
Headers:
  Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Error Responses**:
- `403`: Access denied (not file owner)
- `404`: Document not found
- `401`: Unauthorized

## File Structure

### Backend Files Created

1. **Middleware**:
   - `/home/user/earning/app/backend/src/middleware/upload.middleware.ts`
     - `uploadSingleFile`: Multer middleware for single file upload
     - `handleUploadError`: Error handling for upload failures
     - `validateFilePresent`: Validates file existence

2. **Controller**:
   - `/home/user/earning/app/backend/src/controllers/upload.controller.ts`
     - `uploadDocument()`: Handle file upload with compression
     - `deleteDocument()`: Delete file from database
     - `getDocument()`: Retrieve file metadata
     - `listDocuments()`: List all user documents

3. **Routes**:
   - `/home/user/earning/app/backend/src/routes/upload.routes.ts`
     - POST /upload: Upload file
     - GET /upload: List documents
     - GET /upload/:fileId: Get document
     - DELETE /upload/:fileId: Delete document

4. **Database**:
   - `/home/user/earning/app/backend/prisma/schema.prisma`
     - Added `Document` model

5. **Server**:
   - `/home/user/earning/app/backend/src/server.ts`
     - Registered upload routes
     - Increased body limit to 50MB

### Frontend Files Created

1. **Hook**:
   - `/home/user/earning/app/frontend/src/lib/fileUpload.ts`
     - `useFileUpload()`: React hook for file uploads
     - Methods: `uploadFile()`, `deleteFile()`, `getDocument()`, `listDocuments()`
     - Progress tracking and error handling

## Frontend Usage Example

### Basic Upload with Progress Tracking

```typescript
import { useFileUpload } from '@/lib/fileUpload';

function DocumentUpload() {
  const {
    uploadFile,
    isUploading,
    progress,
    error,
    clearError
  } = useFileUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await uploadFile(file, (prog) => {
        console.log(`Upload progress: ${prog.percentage}%`);
      });

      if (result) {
        console.log('Upload successful:', result.document);
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading && (
        <div>Progress: {progress.percentage}%</div>
      )}
      {error && (
        <div className="error">
          {error.error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
```

### List Documents

```typescript
const { listDocuments, error } = useFileUpload();

const handleListDocuments = async () => {
  const documents = await listDocuments();
  if (documents) {
    console.log('Documents:', documents);
  }
};
```

### Delete Document

```typescript
const { deleteFile, error } = useFileUpload();

const handleDeleteFile = async (fileId: string) => {
  const success = await deleteFile(fileId);
  if (success) {
    console.log('File deleted successfully');
  }
};
```

## Image Compression Details

When an image is uploaded (PNG or JPG/JPEG), it is automatically compressed using Sharp:

- **Resize**: Maximum 2048x2048 pixels (maintains aspect ratio)
- **Format**: Converted to JPEG if necessary
- **Quality**: 80% JPEG quality
- **Progressive**: Progressive JPEG encoding enabled

Example compression results:
- Original PNG (5MB) → Compressed JPEG (500KB) - 90% reduction
- Original JPG (3MB) → Compressed JPEG (300KB) - 90% reduction

## Error Handling

### Common Errors

| Code | HTTP | Message | Solution |
|------|------|---------|----------|
| UNAUTHORIZED | 401 | No authentication token | Login first, include Bearer token in header |
| NO_FILE | 400 | No file uploaded | Ensure file is attached to request |
| FILE_TOO_LARGE | 413 | File exceeds 50MB limit | Reduce file size |
| INVALID_FILE_TYPE | 400 | Invalid file type | Use PDF, PNG, JPG, or JPEG |
| NOT_FOUND | 404 | Document not found | Verify file ID exists |
| FORBIDDEN | 403 | Access denied | File belongs to another user |

## Security Considerations

1. **Authentication**: All endpoints require JWT authentication
2. **File Type Validation**: Only specific MIME types and extensions allowed
3. **File Size Limits**: Maximum 50MB to prevent abuse
4. **User Isolation**: Users can only access their own files
5. **Database Validation**: Metadata stored securely in Prisma database
6. **Error Handling**: No sensitive information leaked in error messages

## Next Steps for Production

1. **External Storage**: Replace memory storage with:
   - AWS S3
   - Azure Blob Storage
   - Google Cloud Storage
   - Local filesystem with secure path handling

2. **File Processing**:
   - Implement file scanning for malware
   - Add content type verification
   - Implement file versioning

3. **Performance**:
   - Add CDN for file delivery
   - Implement file caching
   - Add upload queue for large files

4. **Monitoring**:
   - Track upload/download statistics
   - Monitor storage usage
   - Alert on suspicious activity

## Testing

Run the test suite:

```bash
npm test -- src/__tests__/upload.test.ts
```

Manual testing with curl:

```bash
# Upload a file
curl -X POST http://localhost:3001/api/v1/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf"

# List documents
curl -X GET http://localhost:3001/api/v1/upload \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get document
curl -X GET http://localhost:3001/api/v1/upload/FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Delete document
curl -X DELETE http://localhost:3001/api/v1/upload/FILE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Support

For issues or questions regarding file uploads, refer to:
- Multer documentation: https://github.com/expressjs/multer
- Sharp documentation: https://sharp.pixelplumbing.com/
- Prisma documentation: https://www.prisma.io/docs/
