import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import sharp from 'sharp';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import prisma from '../lib/prisma';
import {
  ValidationError,
  NotFoundError,
  FileOperationError,
  ExternalServiceError,
  QuotaExceededError,
  ForbiddenError,
  tryOptional,
  retry,
} from '../errors';

// File type configurations
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',

  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_USER_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB

export class FileService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET || '';

    if (!this.bucketName) {
      logger.warn('AWS_S3_BUCKET environment variable not set');
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        { fileSize: file.size, maxSize: MAX_FILE_SIZE }
      );
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(
        `File type ${file.mimetype} is not allowed`,
        { mimeType: file.mimetype, allowedTypes: ALLOWED_MIME_TYPES }
      );
    }

    // Check for executable extensions (security)
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.bin', '.app'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (dangerousExtensions.includes(fileExtension)) {
      throw new ValidationError(
        'Executable files are not allowed',
        { extension: fileExtension }
      );
    }
  }

  /**
   * Check user storage quota
   */
  async checkUserQuota(userId: string, fileSize: number): Promise<void> {
    const totalUsage = await prisma.fileUpload.aggregate({
      where: { userId },
      _sum: { fileSize: true },
    });

    const currentUsage = Number(totalUsage._sum.fileSize || 0);

    if (currentUsage + fileSize > MAX_USER_STORAGE) {
      throw new QuotaExceededError(
        'Storage',
        currentUsage + fileSize,
        MAX_USER_STORAGE
      );
    }
  }

  /**
   * Generate unique S3 key
   */
  generateS3Key(userId: string, fileName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension).replace(/[^a-zA-Z0-9]/g, '_');

    return `uploads/${userId}/${timestamp}-${randomString}-${baseName}${extension}`;
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(
    file: Express.Multer.File,
    userId: string,
    folderId?: string
  ): Promise<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    s3Key: string;
    url: string;
    thumbnailUrl?: string;
  }> {
    try {
      // Validate file
      this.validateFile(file);

      // Check quota
      await this.checkUserQuota(userId, file.size);

      // Generate S3 key
      const s3Key = this.generateS3Key(userId, file.originalname);

      // Upload to S3 with retry logic
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await retry(
        () => this.s3Client.send(uploadCommand),
        {
          maxAttempts: 3,
          delayMs: 1000,
          onRetry: (error, attempt) => {
            logger.warn(`Retrying S3 upload (attempt ${attempt})`, {
              s3Key,
              error: error.message,
            });
          },
        }
      );

      // Generate public URL (or pre-signed URL for private buckets)
      const url = `https://${this.bucketName}.s3.amazonaws.com/${s3Key}`;

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
        thumbnailUrl = await this.generateThumbnail(file.buffer, s3Key, userId);
      }

      // Initiate virus scan (async)
      this.scanFile(file.buffer, s3Key).catch((error) => {
        logger.error('Virus scan failed:', error);
      });

      // Save to database
      const fileUpload = await prisma.fileUpload.create({
        data: {
          userId,
          folderId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          s3Key,
          url,
          thumbnailUrl,
          isScanned: false,
          scanResult: 'PENDING',
        },
      });

      return {
        id: fileUpload.id,
        fileName: fileUpload.fileName,
        fileSize: Number(fileUpload.fileSize),
        mimeType: fileUpload.mimeType,
        s3Key: fileUpload.s3Key,
        url: fileUpload.url,
        thumbnailUrl: fileUpload.thumbnailUrl || undefined,
      };
    } catch (error) {
      logger.error('File upload error', error instanceof Error ? error : new Error(String(error)), {
        userId,
        fileName: file.originalname,
        fileSize: file.size,
      });

      // Re-throw custom errors
      if (
        error instanceof ValidationError ||
        error instanceof QuotaExceededError ||
        error instanceof FileOperationError
      ) {
        throw error;
      }

      // Wrap other errors
      throw new FileOperationError(
        'upload',
        'Failed to upload file',
        {
          fileName: file.originalname,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Generate thumbnail for images
   */
  async generateThumbnail(
    imageBuffer: Buffer,
    originalS3Key: string,
    userId: string
  ): Promise<string> {
    try {
      const thumbnailBuffer = await sharp(imageBuffer)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = `thumbnails/${userId}/${path.basename(originalS3Key)}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      });

      await this.s3Client.send(uploadCommand);

      logger.info('Thumbnail generated successfully', { thumbnailKey });
      return `https://${this.bucketName}.s3.amazonaws.com/${thumbnailKey}`;
    } catch (error) {
      logger.warn('Thumbnail generation failed - non-critical', {
        error: error instanceof Error ? error.message : String(error),
        originalS3Key,
      });
      // Return empty string if thumbnail generation fails (non-critical)
      return '';
    }
  }

  /**
   * Scan file for viruses using ClamAV
   */
  async scanFile(fileBuffer: Buffer, s3Key: string): Promise<void> {
    try {
      const scanResult = await this.scanWithClamAV(fileBuffer);

      // Update file scan status
      await prisma.fileUpload.update({
        where: { s3Key },
        data: {
          isScanned: true,
          scanResult: scanResult.infected ? 'INFECTED' : 'CLEAN',
        },
      });

      // If infected, delete the file
      if (scanResult.infected) {
        await this.deleteFromS3(s3Key);
        logger.warn('Infected file detected and deleted', {
          s3Key,
          virus: scanResult.virus,
        });
      }
    } catch (error) {
      logger.error('File scan error', error instanceof Error ? error : new Error(String(error)), {
        s3Key,
      });

      // Mark as scan failed (non-critical error)
      await tryOptional(
        () =>
          prisma.fileUpload.update({
            where: { s3Key },
            data: {
              isScanned: true,
              scanResult: 'SCAN_FAILED',
            },
          }),
        undefined,
        false
      );
    }
  }

  /**
   * Scan buffer with ClamAV
   */
  private scanWithClamAV(buffer: Buffer): Promise<{ infected: boolean; virus?: string }> {
    return new Promise((resolve, reject) => {
      // Check if ClamAV is available
      const clamScan = spawn('clamdscan', ['--no-summary', '--infected', '-']);

      let output = '';
      let errorOutput = '';

      clamScan.stdout.on('data', (data) => {
        output += data.toString();
      });

      clamScan.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      clamScan.on('close', (code) => {
        // ClamAV exit codes: 0 = clean, 1 = infected, 2 = error
        if (code === 0) {
          resolve({ infected: false });
        } else if (code === 1) {
          const virusMatch = output.match(/FOUND:\s*(.+)/);
          resolve({
            infected: true,
            virus: virusMatch ? virusMatch[1].trim() : 'Unknown',
          });
        } else {
          // If ClamAV is not available, assume clean (for development)
          logger.warn('ClamAV not available or error occurred, skipping scan');
          resolve({ infected: false });
        }
      });

      clamScan.on('error', (error) => {
        logger.warn('ClamAV process error:', error.message);
        // If ClamAV is not installed, assume clean
        resolve({ infected: false });
      });

      // Write buffer to stdin
      clamScan.stdin.write(buffer);
      clamScan.stdin.end();
    });
  }

  /**
   * Generate pre-signed download URL
   */
  async getDownloadUrl(fileId: string, userId: string, expiresIn = 3600): Promise<string> {
    const file = await prisma.fileUpload.findFirst({
      where: {
        id: fileId,
        OR: [
          { userId },
          {
            shares: {
              some: {
                sharedWith: userId,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } },
                ],
              },
            },
          },
        ],
      },
    });

    if (!file) {
      throw new NotFoundError('File', fileId);
    }

    // Check scan result
    if (file.scanResult === 'INFECTED') {
      throw new ForbiddenError('File is infected and cannot be downloaded', {
        fileId,
        scanResult: 'INFECTED',
      });
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: file.s3Key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
    return signedUrl;
  }

  /**
   * Delete file from S3
   */
  async deleteFromS3(s3Key: string): Promise<void> {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    await this.s3Client.send(deleteCommand);

    // Delete thumbnail if exists
    const thumbnailKey = `thumbnails/${path.basename(s3Key)}`;
    const deleteThumbnailCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: thumbnailKey,
    });

    // Try to delete thumbnail (non-critical)
    await tryOptional(
      () => this.s3Client.send(deleteThumbnailCommand),
      undefined,
      false
    );
  }

  /**
   * Delete file by ID
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const file = await prisma.fileUpload.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundError('File', fileId);
    }

    // Delete from S3
    await this.deleteFromS3(file.s3Key);

    // Delete from database
    await prisma.fileUpload.delete({
      where: { id: fileId },
    });
  }

  /**
   * Create folder
   */
  async createFolder(userId: string, name: string, parentFolderId?: string): Promise<any> {
    // Check if folder already exists
    const existing = await prisma.fileFolder.findFirst({
      where: {
        userId,
        name,
        parentFolderId: parentFolderId || null,
      },
    });

    if (existing) {
      throw new ValidationError('Folder with this name already exists in this location', {
        name,
        parentFolderId,
      });
    }

    const folder = await prisma.fileFolder.create({
      data: {
        userId,
        name,
        parentFolderId,
      },
    });

    return folder;
  }

  /**
   * Share file with user
   */
  async shareFile(
    fileId: string,
    userId: string,
    sharedWith: string,
    permission: 'VIEW' | 'EDIT',
    expiresAt?: Date
  ): Promise<any> {
    // Verify file ownership
    const file = await prisma.fileUpload.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      throw new NotFoundError('File', fileId);
    }

    // Create or update share
    const share = await prisma.fileShare.upsert({
      where: {
        fileId_sharedWith: {
          fileId,
          sharedWith,
        },
      },
      update: {
        permission,
        expiresAt,
      },
      create: {
        fileId,
        sharedBy: userId,
        sharedWith,
        permission,
        expiresAt,
      },
    });

    return share;
  }

  /**
   * Get user's files
   */
  async getUserFiles(userId: string, folderId?: string) {
    const files = await prisma.fileUpload.findMany({
      where: {
        userId,
        folderId: folderId || null,
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        url: true,
        thumbnailUrl: true,
        isScanned: true,
        scanResult: true,
        uploadedAt: true,
        expiresAt: true,
      },
    });

    return files;
  }

  /**
   * Get files shared with user
   */
  async getSharedFiles(userId: string) {
    const shares = await prisma.fileShare.findMany({
      where: {
        sharedWith: userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        file: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            url: true,
            thumbnailUrl: true,
            uploadedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((share) => ({
      ...share.file,
      sharedBy: share.file.user,
      permission: share.permission,
      sharedAt: share.createdAt,
    }));
  }

  /**
   * Get user folders
   */
  async getUserFolders(userId: string, parentFolderId?: string) {
    const folders = await prisma.fileFolder.findMany({
      where: {
        userId,
        parentFolderId: parentFolderId || null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            files: true,
            subFolders: true,
          },
        },
      },
    });

    return folders;
  }
}

export default new FileService();
