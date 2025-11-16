import { Router, Response, Request, NextFunction } from 'express';
import {
  uploadDocument,
  deleteDocument,
  getDocument,
  listDocuments,
} from '../controllers/upload.controller';
import {
  uploadSingleFile,
  handleUploadError,
  validateFilePresent,
} from '../middleware/upload.middleware';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * POST /api/v1/upload
 * Upload a document (PDF, PNG, JPG, JPEG)
 * Max file size: 50MB
 * Returns document metadata
 */
router.post(
  '/',
  uploadSingleFile,
  handleUploadError,
  validateFilePresent,
  uploadDocument as any
);

/**
 * GET /api/v1/upload
 * List all documents uploaded by the authenticated user
 */
router.get('/', listDocuments as any);

/**
 * GET /api/v1/upload/:fileId
 * Retrieve document metadata by ID
 * File owner only
 */
router.get('/:fileId', getDocument as any);

/**
 * DELETE /api/v1/upload/:fileId
 * Delete a document by ID
 * File owner only
 */
router.delete('/:fileId', deleteDocument as any);

export default router;
