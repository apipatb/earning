/**
 * Video Service
 *
 * Handles video upload, transcoding, streaming, and CDN distribution
 * with FFmpeg integration and S3 storage
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import ffmpeg from 'fluent-ffmpeg';
import { Queue, Worker } from 'bullmq';
import { prisma } from '../lib/prisma';
import { VideoStatus, VideoTranscodeFormat, VideoResolution, TranscodeJobStatus } from '@prisma/client';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface VideoUploadOptions {
  userId: string;
  title: string;
  description?: string;
  file: Express.Multer.File;
}

interface TranscodeOptions {
  videoId: string;
  formats?: VideoTranscodeFormat[];
  resolutions?: VideoResolution[];
}

interface VideoMetadata {
  duration: number;
  format: string;
  resolution: string;
  fileSize: number;
  bitrate: number;
  codec: string;
}

interface HLSPlaylist {
  masterPlaylistUrl: string;
  variantPlaylists: Array<{
    resolution: VideoResolution;
    bandwidth: number;
    url: string;
  }>;
}

export class VideoService {
  private s3Client: S3Client;
  private cloudFrontClient: CloudFrontClient;
  private transcodeQueue: Queue;
  private readonly BUCKET_NAME = process.env.AWS_S3_BUCKET || 'earntrack-videos';
  private readonly CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  private readonly CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
  private readonly VIDEO_PREFIX = 'videos/';
  private readonly THUMBNAIL_PREFIX = 'thumbnails/';
  private readonly HLS_PREFIX = 'hls/';

  constructor() {
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Initialize CloudFront client
    this.cloudFrontClient = new CloudFrontClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Initialize BullMQ for video processing queue
    this.transcodeQueue = new Queue('video-transcode', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    // Initialize worker for processing transcode jobs
    this.initializeWorker();
  }

  /**
   * Upload video to S3 and create database record
   */
  async uploadVideo(options: VideoUploadOptions): Promise<any> {
    const { userId, title, description, file } = options;

    try {
      // Generate unique S3 key
      const timestamp = Date.now();
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const s3Key = `${this.VIDEO_PREFIX}${userId}/${timestamp}_${sanitizedFilename}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          userId,
          originalName: file.originalname,
        },
      });

      await this.s3Client.send(uploadCommand);

      // Create video record in database
      const video = await prisma.video.create({
        data: {
          userId,
          title,
          description,
          s3Key,
          fileSize: BigInt(file.size),
          status: VideoStatus.UPLOADING,
        },
      });

      // Queue metadata extraction and thumbnail generation
      await this.transcodeQueue.add('extract-metadata', {
        videoId: video.id,
        s3Key,
      });

      return video;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw new Error('Failed to upload video');
    }
  }

  /**
   * Extract video metadata using FFmpeg
   */
  async extractMetadata(videoId: string, s3Key: string): Promise<VideoMetadata> {
    return new Promise(async (resolve, reject) => {
      try {
        // Download video temporarily
        const tempFilePath = await this.downloadToTemp(s3Key);

        ffmpeg.ffprobe(tempFilePath, async (err, metadata) => {
          // Clean up temp file
          fs.unlinkSync(tempFilePath);

          if (err) {
            return reject(err);
          }

          const videoStream = metadata.streams.find(s => s.codec_type === 'video');
          if (!videoStream) {
            return reject(new Error('No video stream found'));
          }

          const duration = metadata.format.duration || 0;
          const format = metadata.format.format_name || 'unknown';
          const resolution = `${videoStream.width}x${videoStream.height}`;
          const fileSize = metadata.format.size || 0;
          const bitrate = metadata.format.bit_rate || 0;
          const codec = videoStream.codec_name || 'unknown';

          // Update video record with metadata
          await prisma.video.update({
            where: { id: videoId },
            data: {
              duration: duration.toString(),
              format: codec,
              resolution,
              status: VideoStatus.PROCESSING,
            },
          });

          resolve({
            duration,
            format,
            resolution,
            fileSize,
            bitrate,
            codec,
          });
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate video thumbnail
   */
  async generateThumbnail(videoId: string, s3Key: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const tempVideoPath = await this.downloadToTemp(s3Key);
        const tempThumbnailPath = path.join(os.tmpdir(), `thumb_${Date.now()}.jpg`);

        ffmpeg(tempVideoPath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(tempThumbnailPath),
            folder: path.dirname(tempThumbnailPath),
            size: '1280x720',
          })
          .on('end', async () => {
            try {
              // Upload thumbnail to S3
              const thumbnailKey = `${this.THUMBNAIL_PREFIX}${videoId}.jpg`;
              const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

              const uploadCommand = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: thumbnailKey,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
              });

              await this.s3Client.send(uploadCommand);

              // Clean up temp files
              fs.unlinkSync(tempVideoPath);
              fs.unlinkSync(tempThumbnailPath);

              // Get CDN URL
              const thumbnailUrl = this.getCDNUrl(thumbnailKey);

              // Update video record
              await prisma.video.update({
                where: { id: videoId },
                data: { thumbnail: thumbnailUrl },
              });

              resolve(thumbnailUrl);
            } catch (uploadError) {
              reject(uploadError);
            }
          })
          .on('error', (err) => {
            // Clean up temp files on error
            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
            if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
            reject(err);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Transcode video to multiple formats and resolutions
   */
  async transcodeVideo(options: TranscodeOptions): Promise<void> {
    const { videoId, formats, resolutions } = options;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    const targetFormats = formats || [VideoTranscodeFormat.MP4, VideoTranscodeFormat.WEBM, VideoTranscodeFormat.HLS];
    const targetResolutions = resolutions || [VideoResolution.HD_720P, VideoResolution.FHD_1080P];

    // Create transcode jobs
    for (const format of targetFormats) {
      for (const resolution of targetResolutions) {
        const job = await prisma.videoTranscodeJob.create({
          data: {
            videoId,
            format,
            resolution,
            status: TranscodeJobStatus.PENDING,
          },
        });

        // Add to queue
        await this.transcodeQueue.add('transcode', {
          jobId: job.id,
          videoId,
          s3Key: video.s3Key,
          format,
          resolution,
        });
      }
    }
  }

  /**
   * Process transcode job
   */
  private async processTranscodeJob(
    jobId: string,
    videoId: string,
    s3Key: string,
    format: VideoTranscodeFormat,
    resolution: VideoResolution
  ): Promise<void> {
    try {
      // Update job status
      await prisma.videoTranscodeJob.update({
        where: { id: jobId },
        data: {
          status: TranscodeJobStatus.PROCESSING,
          startedAt: new Date(),
        },
      });

      const tempInputPath = await this.downloadToTemp(s3Key);
      const tempOutputPath = path.join(os.tmpdir(), `transcoded_${Date.now()}.${format.toLowerCase()}`);

      // Get resolution settings
      const resolutionSettings = this.getResolutionSettings(resolution);

      // Transcode based on format
      if (format === VideoTranscodeFormat.HLS) {
        await this.transcodeToHLS(tempInputPath, videoId, resolutionSettings);
      } else {
        await this.transcodeToFormat(tempInputPath, tempOutputPath, format, resolutionSettings);

        // Upload transcoded file
        const outputKey = `${this.VIDEO_PREFIX}transcoded/${videoId}/${resolution}_${format}.${format.toLowerCase()}`;
        const fileBuffer = fs.readFileSync(tempOutputPath);

        const uploadCommand = new PutObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: outputKey,
          Body: fileBuffer,
          ContentType: this.getContentType(format),
        });

        await this.s3Client.send(uploadCommand);

        // Update job with completed status
        await prisma.videoTranscodeJob.update({
          where: { id: jobId },
          data: {
            status: TranscodeJobStatus.COMPLETED,
            s3Key: outputKey,
            fileSize: BigInt(fileBuffer.length),
            bitrate: resolutionSettings.bitrate,
            completedAt: new Date(),
          },
        });

        // Clean up
        fs.unlinkSync(tempOutputPath);
      }

      // Clean up input
      fs.unlinkSync(tempInputPath);

      // Mark video as ready if all jobs are complete
      await this.checkAndUpdateVideoStatus(videoId);
    } catch (error) {
      console.error('Transcode job failed:', error);

      // Update job with error
      await prisma.videoTranscodeJob.update({
        where: { id: jobId },
        data: {
          status: TranscodeJobStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Transcode to HLS (HTTP Live Streaming) with adaptive bitrate
   */
  private async transcodeToHLS(
    inputPath: string,
    videoId: string,
    resolutionSettings: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const hlsOutputDir = path.join(os.tmpdir(), `hls_${videoId}_${Date.now()}`);
      fs.mkdirSync(hlsOutputDir, { recursive: true });

      const playlistPath = path.join(hlsOutputDir, 'playlist.m3u8');

      ffmpeg(inputPath)
        .outputOptions([
          '-codec: copy',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls',
        ])
        .output(playlistPath)
        .on('end', async () => {
          try {
            // Upload all HLS segments to S3
            const files = fs.readdirSync(hlsOutputDir);
            for (const file of files) {
              const filePath = path.join(hlsOutputDir, file);
              const fileBuffer = fs.readFileSync(filePath);
              const s3Key = `${this.HLS_PREFIX}${videoId}/${file}`;

              const uploadCommand = new PutObjectCommand({
                Bucket: this.BUCKET_NAME,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: file.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T',
              });

              await this.s3Client.send(uploadCommand);
            }

            // Clean up temp directory
            files.forEach(file => fs.unlinkSync(path.join(hlsOutputDir, file)));
            fs.rmdirSync(hlsOutputDir);

            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  /**
   * Transcode to specific format
   */
  private async transcodeToFormat(
    inputPath: string,
    outputPath: string,
    format: VideoTranscodeFormat,
    resolutionSettings: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .size(`${resolutionSettings.width}x${resolutionSettings.height}`)
        .videoBitrate(resolutionSettings.bitrate);

      // Format-specific settings
      if (format === VideoTranscodeFormat.MP4) {
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-preset medium', '-crf 23']);
      } else if (format === VideoTranscodeFormat.WEBM) {
        command = command
          .videoCodec('libvpx-vp9')
          .audioCodec('libopus')
          .outputOptions(['-crf 30', '-b:v 0']);
      }

      command
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * Get HLS playlist for adaptive streaming
   */
  async getHLSPlaylist(videoId: string): Promise<HLSPlaylist | null> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcodeJobs: {
          where: {
            format: VideoTranscodeFormat.HLS,
            status: TranscodeJobStatus.COMPLETED,
          },
        },
      },
    });

    if (!video || video.transcodeJobs.length === 0) {
      return null;
    }

    const masterPlaylistKey = `${this.HLS_PREFIX}${videoId}/master.m3u8`;
    const masterPlaylistUrl = this.getCDNUrl(masterPlaylistKey);

    const variantPlaylists = video.transcodeJobs.map(job => ({
      resolution: job.resolution,
      bandwidth: job.bitrate || 0,
      url: this.getCDNUrl(`${this.HLS_PREFIX}${videoId}/playlist_${job.resolution}.m3u8`),
    }));

    return {
      masterPlaylistUrl,
      variantPlaylists,
    };
  }

  /**
   * Get video analytics
   */
  async getVideoAnalytics(videoId: string, startDate?: Date, endDate?: Date) {
    const where: any = { videoId };

    if (startDate || endDate) {
      where.viewedAt = {};
      if (startDate) where.viewedAt.gte = startDate;
      if (endDate) where.viewedAt.lte = endDate;
    }

    const [totalViews, uniqueViewers, avgWatchTime, viewsByCountry, viewsOverTime] = await Promise.all([
      // Total views
      prisma.videoAccessLog.count({ where }),

      // Unique viewers (by IP)
      prisma.videoAccessLog.groupBy({
        by: ['ipAddress'],
        where,
      }).then(results => results.length),

      // Average watch time
      prisma.videoAccessLog.aggregate({
        where,
        _avg: { watchTime: true },
      }).then(result => result._avg.watchTime),

      // Views by country
      prisma.videoAccessLog.groupBy({
        by: ['country'],
        where,
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),

      // Views over time (daily)
      prisma.$queryRaw`
        SELECT DATE(viewed_at) as date, COUNT(*) as views
        FROM video_access_logs
        WHERE video_id = ${videoId}
        ${startDate ? prisma.$queryRaw`AND viewed_at >= ${startDate}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND viewed_at <= ${endDate}` : prisma.$queryRaw``}
        GROUP BY DATE(viewed_at)
        ORDER BY date DESC
        LIMIT 30
      `,
    ]);

    return {
      totalViews,
      uniqueViewers,
      avgWatchTime: avgWatchTime ? parseFloat(avgWatchTime.toString()) : 0,
      viewsByCountry: viewsByCountry.map(v => ({
        country: v.country,
        views: v._count,
      })),
      viewsOverTime,
    };
  }

  /**
   * Log video access
   */
  async logVideoAccess(
    videoId: string,
    ipAddress: string,
    country?: string,
    userAgent?: string,
    watchTime?: number
  ): Promise<void> {
    await prisma.videoAccessLog.create({
      data: {
        videoId,
        ipAddress,
        country,
        userAgent,
        watchTime: watchTime?.toString(),
      },
    });

    // Increment view count
    await prisma.video.update({
      where: { id: videoId },
      data: { views: { increment: 1 } },
    });
  }

  /**
   * Delete video and all associated files
   */
  async deleteVideo(videoId: string): Promise<void> {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { transcodeJobs: true },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    // Delete from S3
    const keysToDelete = [
      video.s3Key,
      `${this.THUMBNAIL_PREFIX}${videoId}.jpg`,
    ];

    // Add transcode job files
    video.transcodeJobs.forEach(job => {
      if (job.s3Key) {
        keysToDelete.push(job.s3Key);
      }
    });

    // Delete HLS segments
    keysToDelete.push(`${this.HLS_PREFIX}${videoId}/`);

    for (const key of keysToDelete) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: key,
        });
        await this.s3Client.send(deleteCommand);
      } catch (error) {
        console.error(`Failed to delete ${key}:`, error);
      }
    }

    // Invalidate CloudFront cache
    if (this.CLOUDFRONT_DISTRIBUTION_ID) {
      await this.invalidateCloudFrontCache(keysToDelete);
    }

    // Delete from database (cascade will delete related records)
    await prisma.video.delete({
      where: { id: videoId },
    });
  }

  /**
   * Get signed URL for video streaming
   */
  async getSignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: s3Key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Helper: Download S3 file to temporary location
   */
  private async downloadToTemp(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);
    const tempFilePath = path.join(os.tmpdir(), `video_${Date.now()}_${path.basename(s3Key)}`);

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempFilePath);
      (response.Body as Readable).pipe(writeStream);
      writeStream.on('finish', () => resolve(tempFilePath));
      writeStream.on('error', reject);
    });
  }

  /**
   * Helper: Get CDN URL
   */
  private getCDNUrl(s3Key: string): string {
    if (this.CLOUDFRONT_DOMAIN) {
      return `https://${this.CLOUDFRONT_DOMAIN}/${s3Key}`;
    }
    return `https://${this.BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
  }

  /**
   * Helper: Invalidate CloudFront cache
   */
  private async invalidateCloudFrontCache(keys: string[]): Promise<void> {
    if (!this.CLOUDFRONT_DISTRIBUTION_ID) return;

    const command = new CreateInvalidationCommand({
      DistributionId: this.CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: `video-delete-${Date.now()}`,
        Paths: {
          Quantity: keys.length,
          Items: keys.map(key => `/${key}`),
        },
      },
    });

    await this.cloudFrontClient.send(command);
  }

  /**
   * Helper: Get resolution settings
   */
  private getResolutionSettings(resolution: VideoResolution) {
    const settings = {
      [VideoResolution.SD_480P]: { width: 854, height: 480, bitrate: 1500 },
      [VideoResolution.HD_720P]: { width: 1280, height: 720, bitrate: 2500 },
      [VideoResolution.FHD_1080P]: { width: 1920, height: 1080, bitrate: 5000 },
      [VideoResolution.QHD_2K]: { width: 2560, height: 1440, bitrate: 8000 },
      [VideoResolution.UHD_4K]: { width: 3840, height: 2160, bitrate: 15000 },
    };

    return settings[resolution];
  }

  /**
   * Helper: Get content type for format
   */
  private getContentType(format: VideoTranscodeFormat): string {
    const contentTypes = {
      [VideoTranscodeFormat.MP4]: 'video/mp4',
      [VideoTranscodeFormat.WEBM]: 'video/webm',
      [VideoTranscodeFormat.HLS]: 'application/x-mpegURL',
    };

    return contentTypes[format];
  }

  /**
   * Helper: Check and update video status
   */
  private async checkAndUpdateVideoStatus(videoId: string): Promise<void> {
    const jobs = await prisma.videoTranscodeJob.findMany({
      where: { videoId },
    });

    const allCompleted = jobs.every(job =>
      job.status === TranscodeJobStatus.COMPLETED ||
      job.status === TranscodeJobStatus.FAILED
    );

    if (allCompleted) {
      const anySuccessful = jobs.some(job => job.status === TranscodeJobStatus.COMPLETED);
      const cdnUrl = anySuccessful ? this.getCDNUrl(`${this.VIDEO_PREFIX}transcoded/${videoId}/`) : null;

      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: anySuccessful ? VideoStatus.READY : VideoStatus.FAILED,
          processedAt: new Date(),
          cdnUrl,
        },
      });
    }
  }

  /**
   * Initialize BullMQ worker for processing jobs
   */
  private initializeWorker(): void {
    new Worker(
      'video-transcode',
      async (job) => {
        const { name, data } = job;

        switch (name) {
          case 'extract-metadata':
            await this.extractMetadata(data.videoId, data.s3Key);
            await this.generateThumbnail(data.videoId, data.s3Key);
            break;

          case 'transcode':
            await this.processTranscodeJob(
              data.jobId,
              data.videoId,
              data.s3Key,
              data.format,
              data.resolution
            );
            break;

          default:
            console.warn(`Unknown job type: ${name}`);
        }
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        concurrency: 2, // Process 2 videos at a time
      }
    );
  }

  /**
   * List videos with pagination
   */
  async listVideos(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: {
          transcodeJobs: {
            where: { status: TranscodeJobStatus.COMPLETED },
          },
          _count: {
            select: { accessLogs: true },
          },
        },
      }),
      prisma.video.count({ where: { userId } }),
    ]);

    return {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get video details
   */
  async getVideoDetails(videoId: string, userId?: string) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        transcodeJobs: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!video) {
      throw new Error('Video not found');
    }

    // Check access permissions
    if (userId && video.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return video;
  }
}

export const videoService = new VideoService();
