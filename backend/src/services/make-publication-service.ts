/**
 * Make Publication Service
 * Handles sending publication data to Make webhook
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { MakePublicationPayload } from '../types/publication';
import { publicationService } from './publication-service';
import { videoUploadService } from './video-upload-service';

const MAKE_WEBHOOK_URL =
  process.env.MAKE_PUBLICATION_WEBHOOK_URL ||
  'https://hook.eu2.make.com/l6aflctg7ipab5y1gmrtai7a4pfmomu3';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

export class MakePublicationService {
  /**
   * Send publication to Make webhook
   */
  async sendToMake(publicationId: string): Promise<void> {
    const publication = await publicationService.getPublicationById(publicationId);

    if (!publication) {
      throw new Error('Publication not found');
    }

    // Generate public URLs
    const videoUrl = videoUploadService.getVideoUrl(publication.videoPath);
    const thumbnailUrl = publication.thumbnailPath
      ? videoUploadService.getThumbnailUrl(publication.thumbnailPath)
      : undefined;

    // Update URLs in database
    await publicationService.updateUrls(publicationId, videoUrl, thumbnailUrl);

    // Build payload
    const payload: MakePublicationPayload = {
      publicationId: publication.id,
      title: publication.title,
      description: publication.description,
      videoUrl,
      thumbnailUrl,
      platforms: publication.platforms as any[],
      metadata: {
        duration: publication.duration || 0,
        fileSize: publication.fileSize || 0,
        format: publication.format || 'unknown',
        resolution: publication.resolution || undefined,
      },
      createdAt: publication.createdAt.toISOString(),
    };

    // Send with retry logic
    try {
      const response = await this.sendWithRetry(payload);

      // Mark as sent
      await publicationService.markWebhookSent(publicationId, response);

      logger.info('Publication sent to Make successfully', {
        publicationId,
        webhookUrl: MAKE_WEBHOOK_URL,
      });
    } catch (error) {
      logger.error('Failed to send publication to Make after retries', {
        publicationId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Update status to FAILED
      await publicationService.updateStatus(publicationId, 'FAILED');

      throw error;
    }
  }

  /**
   * Send webhook request with retry logic
   */
  private async sendWithRetry(
    payload: MakePublicationPayload,
    attempt: number = 1
  ): Promise<any> {
    try {
      const response = await axios.post(MAKE_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      });

      logger.info('Make webhook request successful', {
        publicationId: payload.publicationId,
        attempt,
        status: response.status,
      });

      return response.data;
    } catch (error) {
      logger.warn('Make webhook request failed', {
        publicationId: payload.publicationId,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });

      // Retry if not max attempts
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt - 1];
        logger.info(`Retrying in ${delay}ms...`, {
          publicationId: payload.publicationId,
          attempt: attempt + 1,
        });

        await this.delay(delay);
        return this.sendWithRetry(payload, attempt + 1);
      }

      // Max retries exceeded
      throw new Error('Max retries exceeded for Make webhook');
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry failed publication
   */
  async retryPublication(publicationId: string): Promise<void> {
    const publication = await publicationService.getPublicationById(publicationId);

    if (!publication) {
      throw new Error('Publication not found');
    }

    if (publication.status === 'PUBLISHED') {
      throw new Error('Publication is already published');
    }

    logger.info('Retrying publication', { publicationId });

    // Reset status to PENDING
    await publicationService.updateStatus(publicationId, 'PENDING');

    // Send to Make
    await this.sendToMake(publicationId);
  }
}

export const makePublicationService = new MakePublicationService();

