/**
 * Publication Types
 * Types for social media cross-posting functionality
 */

export type PublicationStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PUBLISHED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'youtube';

export interface VideoMetadata {
  duration: number; // seconds
  fileSize: number; // bytes
  format: string; // mp4, mov, etc
  resolution?: string; // 1920x1080
  bitrate?: number; // bits per second
}

export interface PlatformResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  publishedAt?: string;
}

export interface CreatePublicationInput {
  userId: string;
  title: string;
  description: string;
  videoPath: string;
  thumbnailPath?: string;
  platforms: Platform[];
  metadata?: VideoMetadata;
}

export interface UpdatePublicationInput {
  title?: string;
  description?: string;
  platforms?: Platform[];
}

export interface PublicationFilters {
  status?: PublicationStatus;
  platform?: Platform;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface UploadResult {
  videoPath: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
}

export interface MakePublicationPayload {
  publicationId: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  platforms: Platform[];
  metadata: VideoMetadata;
  createdAt: string;
}

