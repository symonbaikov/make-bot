/**
 * Video Upload Service
 * Handles video file upload, validation, metadata extraction, and thumbnail generation
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { VideoMetadata, UploadResult } from '../types/publication';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Configuration
const MAX_VIDEO_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB || '500', 10);
const MAX_VIDEO_DURATION_SECONDS = parseInt(
  process.env.MAX_VIDEO_DURATION_SECONDS || '600',
  10
);
const ALLOWED_FORMATS = (process.env.ALLOWED_VIDEO_FORMATS || 'mp4,mov,avi,mkv').split(',');
const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
const VIDEO_URL_BASE = process.env.VIDEO_URL_BASE || 'http://localhost:3000/uploads/videos';
const THUMBNAIL_URL_BASE =
  process.env.THUMBNAIL_URL_BASE || 'http://localhost:3000/uploads/thumbnails';

export class VideoUploadService {
  /**
   * Validate video file before processing
   */
  validateVideo(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_VIDEO_SIZE_MB) {
      return {
        valid: false,
        error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${MAX_VIDEO_SIZE_MB}MB)`,
      };
    }

    // Check format
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!ALLOWED_FORMATS.includes(ext)) {
      return {
        valid: false,
        error: `File format .${ext} is not supported. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Extract video metadata using FFmpeg
   */
  async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error('Error extracting video metadata:', err);
          return reject(new Error('Failed to extract video metadata'));
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
        if (!videoStream) {
          return reject(new Error('No video stream found in file'));
        }

        const duration = metadata.format.duration || 0;
        const fileSize = metadata.format.size || 0;
        const format = metadata.format.format_name || 'unknown';
        const resolution = videoStream.width && videoStream.height
          ? `${videoStream.width}x${videoStream.height}`
          : undefined;
        const bitrate = metadata.format.bit_rate 
          ? (typeof metadata.format.bit_rate === 'string' 
              ? parseInt(metadata.format.bit_rate, 10) 
              : metadata.format.bit_rate)
          : undefined;

        // Check duration limit
        if (duration > MAX_VIDEO_DURATION_SECONDS) {
          return reject(
            new Error(
              `Video duration (${Math.round(duration)}s) exceeds maximum allowed duration (${MAX_VIDEO_DURATION_SECONDS}s)`
            )
          );
        }

        resolve({
          duration: Math.round(duration),
          fileSize,
          format,
          resolution,
          bitrate,
        });
      });
    });
  }

  /**
   * Generate thumbnail from video
   */
  async generateThumbnail(videoPath: string): Promise<string> {
    const thumbnailDir = path.join(UPLOADS_DIR, 'thumbnails');
    const thumbnailName = `${uuidv4()}_${Date.now()}.jpg`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailName);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: 1,
          folder: thumbnailDir,
          filename: thumbnailName,
          size: '640x?', // 640px width, auto height
          timemarks: ['10%'], // Take screenshot at 10% of video duration
        })
        .on('end', () => {
          logger.info('Thumbnail generated successfully', { thumbnailPath });
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          logger.error('Error generating thumbnail:', err);
          reject(new Error('Failed to generate thumbnail'));
        });
    });
  }

  /**
   * Move uploaded video from temp to published directory
   */
  async moveVideoToPublished(tempPath: string): Promise<string> {
    const publishedDir = path.join(UPLOADS_DIR, 'videos', 'published');
    const filename = path.basename(tempPath);
    const publishedPath = path.join(publishedDir, filename);

    await fs.rename(tempPath, publishedPath);
    logger.info('Video moved to published directory', { publishedPath });

    return publishedPath;
  }

  /**
   * Upload and process video file
   */
  async uploadVideo(file: Express.Multer.File): Promise<UploadResult> {
    // Validate file
    const validation = this.validateVideo(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const tempPath = file.path;

    try {
      // Extract metadata
      const metadata = await this.extractMetadata(tempPath);

      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(tempPath);

      // Move video to published directory
      const videoPath = await this.moveVideoToPublished(tempPath);

      logger.info('Video uploaded and processed successfully', {
        videoPath,
        thumbnailPath,
        metadata,
      });

      return {
        videoPath,
        thumbnailPath,
        metadata,
      };
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch (unlinkError) {
        logger.error('Error cleaning up temp file:', unlinkError);
      }

      throw error;
    }
  }

  /**
   * Delete video and thumbnail files
   */
  async deleteVideo(videoPath: string, thumbnailPath?: string): Promise<void> {
    try {
      // Delete video
      if (videoPath) {
        await fs.unlink(videoPath);
        logger.info('Video file deleted', { videoPath });
      }

      // Delete thumbnail
      if (thumbnailPath) {
        await fs.unlink(thumbnailPath);
        logger.info('Thumbnail file deleted', { thumbnailPath });
      }
    } catch (error) {
      logger.error('Error deleting video files:', error);
      throw new Error('Failed to delete video files');
    }
  }

  /**
   * Get public URL for video
   */
  getVideoUrl(videoPath: string): string {
    const filename = path.basename(videoPath);
    return `${VIDEO_URL_BASE}/published/${filename}`;
  }

  /**
   * Get public URL for thumbnail
   */
  getThumbnailUrl(thumbnailPath: string): string {
    const filename = path.basename(thumbnailPath);
    return `${THUMBNAIL_URL_BASE}/${filename}`;
  }
}

export const videoUploadService = new VideoUploadService();

