import multer, { MulterError } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { logError, logDebug } from '../lib/logger';

// Configure multer for file uploads with memory storage
const storage = multer.memoryStorage();

// File filter to accept only specific file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimetypes = ['application/pdf', 'image/png', 'image/jpeg'];
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];

  const fileExtension = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();

  if (allowedMimetypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: PDF, PNG, JPG, JPEG`));
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

// Single file upload middleware
export const uploadSingleFile = upload.single('file');

// Middleware to handle multer errors
export const handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    logError('Multer upload error', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File size exceeds the maximum limit of 50MB',
        code: 'FILE_TOO_LARGE',
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Only one file is allowed',
        code: 'TOO_MANY_FILES',
      });
    }

    return res.status(400).json({
      error: err.message,
      code: 'UPLOAD_ERROR',
    });
  }

  if (err) {
    logError('File upload validation error', err);
    return res.status(400).json({
      error: err.message || 'File upload validation failed',
      code: 'VALIDATION_ERROR',
    });
  }

  next();
};

// Validate file is present middleware
export const validateFilePresent = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded',
      code: 'NO_FILE',
    });
  }

  logDebug('File uploaded successfully', {
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });

  next();
};
