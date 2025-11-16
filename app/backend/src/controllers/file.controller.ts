import { Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { AuthRequest } from '../types';
import fileService from '../services/file.service';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      file?: multer.Express.Multer.File;
      files?: multer.Express.Multer.File[];
    }
  }
}

const shareFileSchema = z.object({
  sharedWith: z.string().min(1, 'Shared with user ID or email is required'),
  permission: z.enum(['VIEW', 'EDIT']).default('VIEW'),
  expiresAt: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
});

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentFolderId: z.string().uuid().optional(),
});

/**
 * Upload a file
 * POST /api/v1/files/upload
 */
export const uploadFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No file provided',
      });
    }

    const folderId = req.body.folderId;

    const uploadedFile = await fileService.uploadToS3(file, userId, folderId);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: uploadedFile,
    });
  } catch (error) {
    logger.error('Upload file error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
    const statusCode = errorMessage.includes('quota') || errorMessage.includes('not allowed') ? 400 : 500;

    res.status(statusCode).json({
      error: statusCode === 400 ? 'Validation Error' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get all files for the authenticated user
 * GET /api/v1/files
 */
export const getFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { folderId } = req.query;

    const files = await fileService.getUserFiles(userId, folderId as string | undefined);

    res.json({
      files: files.map((file) => ({
        ...file,
        fileSize: Number(file.fileSize),
      })),
      total: files.length,
    });
  } catch (error) {
    logger.error('Get files error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch files',
    });
  }
};

/**
 * Get download URL for a file
 * GET /api/v1/files/:id/download
 */
export const getDownloadUrl = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;

    const downloadUrl = await fileService.getDownloadUrl(fileId, userId);

    res.json({
      downloadUrl,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    logger.error('Get download URL error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate download URL';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('access denied') || errorMessage.includes('infected') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Delete a file
 * DELETE /api/v1/files/:id
 */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;

    await fileService.deleteFile(fileId, userId);

    res.json({
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Delete file error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete file';
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Share a file with another user
 * POST /api/v1/files/:id/share
 */
export const shareFile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;
    const data = shareFileSchema.parse(req.body);

    const share = await fileService.shareFile(
      fileId,
      userId,
      data.sharedWith,
      data.permission,
      data.expiresAt
    );

    res.status(201).json({
      message: 'File shared successfully',
      share: {
        id: share.id,
        fileId: share.fileId,
        sharedWith: share.sharedWith,
        permission: share.permission,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error('Share file error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to share file';
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get files shared with the authenticated user
 * GET /api/v1/files/shared-with-me
 */
export const getSharedFiles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const files = await fileService.getSharedFiles(userId);

    res.json({
      files: files.map((file) => ({
        ...file,
        fileSize: Number(file.fileSize),
      })),
      total: files.length,
    });
  } catch (error) {
    logger.error('Get shared files error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch shared files',
    });
  }
};

/**
 * Create a new folder
 * POST /api/v1/folders
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const data = createFolderSchema.parse(req.body);

    const folder = await fileService.createFolder(userId, data.name, data.parentFolderId);

    res.status(201).json({
      message: 'Folder created successfully',
      folder: {
        id: folder.id,
        name: folder.name,
        parentFolderId: folder.parentFolderId,
        createdAt: folder.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error('Create folder error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
    const statusCode = errorMessage.includes('already exists') ? 409 : 500;

    res.status(statusCode).json({
      error: statusCode === 409 ? 'Conflict' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get folders for the authenticated user
 * GET /api/v1/folders
 */
export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { parentFolderId } = req.query;

    const folders = await fileService.getUserFolders(userId, parentFolderId as string | undefined);

    res.json({
      folders,
      total: folders.length,
    });
  } catch (error) {
    logger.error('Get folders error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch folders',
    });
  }
};
