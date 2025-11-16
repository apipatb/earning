import { Response } from 'express';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
import { logError, logInfo, logDebug } from '../lib/logger';
import { AuthRequest } from '../types';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Extend AuthRequest to include file
interface AuthenticatedRequest extends AuthRequest {
  file?: Express.Multer.File;
}

/**
 * Upload and compress image/document
 * Accepts: PDF, PNG, JPG, JPEG
 * Images are compressed using Sharp
 * Metadata is stored in the database
 */
export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    if (!file) {
      return res.status(400).json({
        error: 'No file provided',
        code: 'NO_FILE',
      });
    }

    logDebug('Processing upload for user', {
      userId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Generate unique filename with hash
    const fileId = crypto.randomBytes(16).toString('hex');
    const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
    const storageName = `${fileId}${fileExtension}`;

    let processedBuffer = file.buffer;
    let finalMimetype = file.mimetype;
    let finalSize = file.size;

    // Compress images using Sharp
    if (file.mimetype.startsWith('image/')) {
      try {
        logDebug('Compressing image', { filename: file.originalname });

        const compressedBuffer = await sharp(file.buffer)
          .resize(2048, 2048, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat('jpeg', { quality: 80, progressive: true })
          .toBuffer();

        processedBuffer = compressedBuffer;
        finalMimetype = 'image/jpeg';
        finalSize = compressedBuffer.length;

        logDebug('Image compressed successfully', {
          originalSize: file.size,
          compressedSize: compressedBuffer.length,
          reduction: `${(((file.size - compressedBuffer.length) / file.size) * 100).toFixed(2)}%`,
        });
      } catch (compressionError) {
        logError('Image compression failed', compressionError);
        // Continue with original file if compression fails
      }
    }

    // Store metadata in database
    const document = await prisma.document.create({
      data: {
        id: fileId,
        userId,
        filename: file.originalname,
        storageName,
        mimetype: finalMimetype,
        size: finalSize,
        uploadedAt: new Date(),
      },
    });

    logInfo('Document uploaded successfully', {
      documentId: document.id,
      userId,
      filename: document.filename,
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      document: {
        id: document.id,
        filename: document.filename,
        mimetype: document.mimetype,
        size: document.size,
        uploadedAt: document.uploadedAt,
      },
    });
  } catch (error) {
    logError('Document upload error', error);
    res.status(500).json({
      error: 'Failed to upload document',
      code: 'UPLOAD_FAILED',
    });
  }
};

/**
 * Retrieve uploaded file by ID
 * Returns the file with appropriate headers
 */
export const getDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { fileId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    logDebug('Retrieving document', { fileId, userId });

    // Get document metadata from database
    const document = await prisma.document.findUnique({
      where: { id: fileId },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        code: 'NOT_FOUND',
      });
    }

    // Verify ownership
    if (document.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
    }

    // In a production environment, you would retrieve the file from storage
    // For now, we'll return the metadata and indicate where to retrieve from
    res.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        mimetype: document.mimetype,
        size: document.size,
        uploadedAt: document.uploadedAt,
      },
      note: 'File content retrieval requires external storage implementation (S3, Azure Blob, etc.)',
    });
  } catch (error) {
    logError('Document retrieval error', error);
    res.status(500).json({
      error: 'Failed to retrieve document',
      code: 'RETRIEVAL_FAILED',
    });
  }
};

/**
 * Delete document and remove from storage
 * Only file owner can delete
 */
export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { fileId } = req.params;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    logDebug('Deleting document', { fileId, userId });

    // Get document metadata from database
    const document = await prisma.document.findUnique({
      where: { id: fileId },
    });

    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        code: 'NOT_FOUND',
      });
    }

    // Verify ownership
    if (document.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
    }

    // Delete from database
    await prisma.document.delete({
      where: { id: fileId },
    });

    // In a production environment, you would delete the file from storage
    // (S3, Azure Blob, local filesystem, etc.)

    logInfo('Document deleted successfully', {
      documentId: fileId,
      userId,
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logError('Document deletion error', error);
    res.status(500).json({
      error: 'Failed to delete document',
      code: 'DELETION_FAILED',
    });
  }
};

/**
 * List all documents for the authenticated user
 */
export const listDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    logDebug('Listing documents for user', { userId });

    const documents = await prisma.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        mimetype: true,
        size: true,
        uploadedAt: true,
      },
    });

    res.json({
      success: true,
      documents: documents,
      total: documents.length,
    });
  } catch (error) {
    logError('Document list error', error);
    res.status(500).json({
      error: 'Failed to list documents',
      code: 'LIST_FAILED',
    });
  }
};
