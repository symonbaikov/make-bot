/**
 * Publication Types (Frontend)
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
  format: string;
  resolution?: string;
  bitrate?: number;
}

export interface PlatformResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  publishedAt?: string;
}

export interface Publication {
  id: string;
  userId: string;
  title: string;
  description: string;
  videoPath: string;
  videoUrl?: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  platforms: Platform[];
  status: PublicationStatus;
  makeWebhookSent: boolean;
  makeResponse?: any;
  publishResults?: Record<Platform, PlatformResult>;
  fileSize?: number;
  duration?: number;
  format?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CreatePublicationInput {
  title: string;
  description: string;
  videoPath: string;
  thumbnailPath?: string;
  platforms: Platform[];
}

export interface UpdatePublicationInput {
  title?: string;
  description?: string;
  platforms?: Platform[];
}

export interface PublicationListParams {
  status?: PublicationStatus;
  platform?: Platform;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface UploadResult {
  videoPath: string;
  thumbnailPath: string;
  metadata: VideoMetadata;
}

export interface PublicationListResponse {
  publications: Publication[];
  total: number;
  page: number;
  limit: number;
}

