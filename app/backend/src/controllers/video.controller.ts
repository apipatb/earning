/**
 * Video Controller
 *
 * Handles video upload, transcoding, streaming, and analytics endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { AuthRequest } from '../types';
import { videoService } from '../services/video.service';
import { logger } from '../utils/logger';
import { VideoTranscodeFormat, VideoResolution } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      file?: multer.Express.Multer.File;
      files?: multer.Express.Multer.File[];
    }
  }
}

const uploadVideoSchema = z.object({
  title: z.string().min(1).max(500, 'Title must be less than 500 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
});

const transcodeVideoSchema = z.object({
  formats: z.array(z.enum(['MP4', 'WEBM', 'HLS'])).optional(),
  resolutions: z.array(z.enum(['SD_480P', 'HD_720P', 'FHD_1080P', 'QHD_2K', 'UHD_4K'])).optional(),
});

const logAccessSchema = z.object({
  watchTime: z.number().min(0).optional(),
  country: z.string().max(100).optional(),
  userAgent: z.string().optional(),
});

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform((val) => val ? new Date(val) : undefined),
});

/**
 * Upload a video
 * POST /api/v1/videos/upload
 */
export const uploadVideo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No video file provided',
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/webm',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid video format. Allowed formats: MP4, MPEG, MOV, AVI, WMV, WEBM',
      });
    }

    // Validate file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Video file size exceeds maximum limit of 2GB',
      });
    }

    const data = uploadVideoSchema.parse(req.body);

    const video = await videoService.uploadVideo({
      userId,
      title: data.title,
      description: data.description,
      file,
    });

    res.status(201).json({
      message: 'Video uploaded successfully. Processing started.',
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        status: video.status,
        fileSize: Number(video.fileSize),
        uploadedAt: video.uploadedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error('Upload video error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
    const statusCode = errorMessage.includes('quota') || errorMessage.includes('not allowed') ? 400 : 500;

    res.status(statusCode).json({
      error: statusCode === 400 ? 'Validation Error' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get all videos for authenticated user
 * GET /api/v1/videos
 */
export const listVideos = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await videoService.listVideos(userId, page, limit);

    res.json({
      videos: result.videos.map((video) => ({
        ...video,
        fileSize: Number(video.fileSize),
        duration: video.duration ? parseFloat(video.duration.toString()) : null,
        transcodeJobs: video.transcodeJobs.map((job) => ({
          ...job,
          fileSize: job.fileSize ? Number(job.fileSize) : null,
        })),
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('List videos error:', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch videos',
    });
  }
};

/**
 * Get video details
 * GET /api/v1/videos/:id
 */
export const getVideoDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const videoId = req.params.id;

    const video = await videoService.getVideoDetails(videoId, userId);

    res.json({
      video: {
        ...video,
        fileSize: Number(video.fileSize),
        duration: video.duration ? parseFloat(video.duration.toString()) : null,
        transcodeJobs: video.transcodeJobs.map((job) => ({
          ...job,
          fileSize: job.fileSize ? Number(job.fileSize) : null,
        })),
      },
    });
  } catch (error) {
    logger.error('Get video details error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch video details';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('Unauthorized') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get HLS streaming playlist
 * GET /api/v1/videos/:id/stream
 */
export const getStreamUrl = async (req: AuthRequest, res: Response) => {
  try {
    const videoId = req.params.id;

    // Get HLS playlist
    const playlist = await videoService.getHLSPlaylist(videoId);

    if (!playlist) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'HLS playlist not available. Video may still be processing.',
      });
    }

    res.json({
      message: 'HLS playlist retrieved successfully',
      playlist,
    });
  } catch (error) {
    logger.error('Get stream URL error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to get stream URL';
    const statusCode = errorMessage.includes('not found') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get signed URL for direct video access
 * GET /api/v1/videos/:id/url
 */
export const getVideoUrl = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const videoId = req.params.id;

    const video = await videoService.getVideoDetails(videoId, userId);

    if (!video.s3Key) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Video file not found',
      });
    }

    const signedUrl = await videoService.getSignedUrl(video.s3Key, 3600); // 1 hour expiration

    res.json({
      url: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    logger.error('Get video URL error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to generate video URL';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('Unauthorized') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Trigger video transcoding
 * POST /api/v1/videos/:id/transcode
 */
export const transcodeVideo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const videoId = req.params.id;
    const data = transcodeVideoSchema.parse(req.body);

    // Verify ownership
    const video = await videoService.getVideoDetails(videoId, userId);

    if (!video) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Video not found',
      });
    }

    // Convert string enums to actual enum types
    const formats = data.formats?.map(f => VideoTranscodeFormat[f as keyof typeof VideoTranscodeFormat]);
    const resolutions = data.resolutions?.map(r => VideoResolution[r as keyof typeof VideoResolution]);

    await videoService.transcodeVideo({
      videoId,
      formats,
      resolutions,
    });

    res.json({
      message: 'Transcoding jobs queued successfully',
      videoId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error('Transcode video error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to start transcoding';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('Unauthorized') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get video analytics
 * GET /api/v1/videos/:id/analytics
 */
export const getVideoAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const videoId = req.params.id;

    // Verify ownership
    await videoService.getVideoDetails(videoId, userId);

    const query = analyticsQuerySchema.parse(req.query);

    const analytics = await videoService.getVideoAnalytics(
      videoId,
      query.startDate,
      query.endDate
    );

    res.json({
      analytics,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error('Get video analytics error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('Unauthorized') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Log video access (for public videos or tracking)
 * POST /api/v1/videos/:id/access
 */
export const logVideoAccess = async (req: AuthRequest, res: Response) => {
  try {
    const videoId = req.params.id;
    const data = logAccessSchema.parse(req.body);

    // Get IP address from request
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                      req.socket.remoteAddress ||
                      'unknown';

    await videoService.logVideoAccess(
      videoId,
      ipAddress,
      data.country,
      data.userAgent,
      data.watchTime
    );

    res.json({
      message: 'Video access logged successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.errors[0].message,
      });
    }

    logger.error('Log video access error:', error instanceof Error ? error : new Error(String(error)));

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log video access',
    });
  }
};

/**
 * Delete video
 * DELETE /api/v1/videos/:id
 */
export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const videoId = req.params.id;

    // Verify ownership
    const video = await videoService.getVideoDetails(videoId, userId);

    if (!video) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Video not found',
      });
    }

    await videoService.deleteVideo(videoId);

    res.json({
      message: 'Video deleted successfully',
    });
  } catch (error) {
    logger.error('Delete video error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete video';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('Unauthorized') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};

/**
 * Get transcode job status
 * GET /api/v1/videos/:id/transcode-status
 */
export const getTranscodeStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const videoId = req.params.id;

    const video = await videoService.getVideoDetails(videoId, userId);

    const transcodeJobs = video.transcodeJobs.map((job) => ({
      id: job.id,
      format: job.format,
      resolution: job.resolution,
      status: job.status,
      fileSize: job.fileSize ? Number(job.fileSize) : null,
      bitrate: job.bitrate,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      error: job.error,
    }));

    res.json({
      videoId,
      videoStatus: video.status,
      transcodeJobs,
      totalJobs: transcodeJobs.length,
      completedJobs: transcodeJobs.filter(j => j.status === 'COMPLETED').length,
      failedJobs: transcodeJobs.filter(j => j.status === 'FAILED').length,
      pendingJobs: transcodeJobs.filter(j => j.status === 'PENDING').length,
      processingJobs: transcodeJobs.filter(j => j.status === 'PROCESSING').length,
    });
  } catch (error) {
    logger.error('Get transcode status error:', error instanceof Error ? error : new Error(String(error)));

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transcode status';
    const statusCode = errorMessage.includes('not found') || errorMessage.includes('Unauthorized') ? 404 : 500;

    res.status(statusCode).json({
      error: statusCode === 404 ? 'Not Found' : 'Internal Server Error',
      message: errorMessage,
    });
  }
};
