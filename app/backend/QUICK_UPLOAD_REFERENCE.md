# Quick Upload Reference Guide

## Quick Start

### 1. Start Server
```bash
cd /home/user/earning/app/backend
npm run dev
```

### 2. Test with curl

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}' \
  | jq -r '.token')

# Upload file
curl -X POST http://localhost:3001/api/v1/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@document.pdf"

# List files
curl -X GET http://localhost:3001/api/v1/upload \
  -H "Authorization: Bearer $TOKEN"

# Delete file
curl -X DELETE http://localhost:3001/api/v1/upload/{fileId} \
  -H "Authorization: Bearer $TOKEN"
```

## File Locations

| Component | Location |
|-----------|----------|
| Middleware | `src/middleware/upload.middleware.ts` |
| Controller | `src/controllers/upload.controller.ts` |
| Routes | `src/routes/upload.routes.ts` |
| Database | `prisma/schema.prisma` |
| Server | `src/server.ts` |
| Tests | `src/__tests__/upload.test.ts` |
| Frontend | `../frontend/src/lib/fileUpload.ts` |

## API Endpoints

### POST /api/v1/upload
Upload a document
- Request: `multipart/form-data` with `file` field
- Response: Document metadata
- Auth: Required

### GET /api/v1/upload
List user documents
- Response: Array of documents
- Auth: Required

### GET /api/v1/upload/{fileId}
Get document metadata
- Response: Document details
- Auth: Required

### DELETE /api/v1/upload/{fileId}
Delete document
- Response: Success message
- Auth: Required

## Supported File Types
- PDF: `application/pdf`
- PNG: `image/png`
- JPEG: `image/jpeg`

## Limits
- Max file size: 50MB
- Image compression: 80% JPEG quality
- Max image dimensions: 2048x2048px

## Error Codes

| Code | Status | Message |
|------|--------|---------|
| UNAUTHORIZED | 401 | Missing or invalid token |
| NO_FILE | 400 | No file provided |
| FILE_TOO_LARGE | 413 | File exceeds 50MB |
| INVALID_FILE_TYPE | 400 | Unsupported file type |
| NOT_FOUND | 404 | Document not found |
| FORBIDDEN | 403 | Access denied |

## Frontend Hook Usage

```typescript
import { useFileUpload } from '@/lib/fileUpload';

const { uploadFile, deleteFile, listDocuments, isUploading, progress, error } = useFileUpload();

// Upload
await uploadFile(file, (progress) => console.log(progress.percentage));

// List
const docs = await listDocuments();

// Delete
await deleteFile(fileId);
```

## Database Query Examples

```prisma
// Find user documents
Document.findMany({
  where: { userId: "user-id" },
  orderBy: { uploadedAt: 'desc' }
})

// Find single document
Document.findUnique({
  where: { id: "file-id" }
})

// Delete document
Document.delete({
  where: { id: "file-id" }
})
```

## Troubleshooting

**Upload fails?**
- Check file size < 50MB
- Verify file type (PDF/PNG/JPG)
- Ensure token is valid
- Check server logs

**File not found?**
- Verify fileId is correct
- Ensure you're the file owner
- Check database connection

**Compression issues?**
- Only affects images (PNG/JPG)
- PDF files uploaded as-is
- Quality set to 80% by default

## Packages

- `multer` - File upload handling
- `sharp` - Image compression
- `@types/multer` - TypeScript types

## Important Notes

1. Files stored in memory (suitable for serverless)
2. Metadata stored in Prisma database
3. User isolation enforced
4. All endpoints require authentication
5. Cascading delete on user removal
6. Images auto-compressed on upload

## Documentation

- Full API Guide: `FILE_UPLOAD_GUIDE.md`
- Implementation Summary: `../UPLOAD_IMPLEMENTATION_SUMMARY.md`
- Verification Checklist: `../IMPLEMENTATION_VERIFICATION.md`
