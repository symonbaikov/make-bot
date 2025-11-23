/**
 * Publication Service
 * Handles CRUD operations for publications
 */

import { PrismaClient, Publication, PublicationStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  CreatePublicationInput,
  UpdatePublicationInput,
  PublicationFilters,
  PlatformResult,
} from '../types/publication';

const prisma = new PrismaClient();

export class PublicationService {
  /**
   * Create new publication
   */
  async createPublication(data: CreatePublicationInput): Promise<Publication> {
    try {
      const publication = await prisma.publication.create({
        data: {
          userId: data.userId,
          title: data.title,
          description: data.description,
          videoPath: data.videoPath,
          thumbnailPath: data.thumbnailPath,
          platforms: data.platforms,
          status: 'PENDING',
          fileSize: data.metadata?.fileSize,
          duration: data.metadata?.duration,
          format: data.metadata?.format,
          resolution: data.metadata?.resolution,
        },
      });

      logger.info('Publication created', {
        publicationId: publication.id,
        userId: data.userId,
        platforms: data.platforms,
      });

      return publication;
    } catch (error) {
      logger.error('Error creating publication:', error);
      throw new Error('Failed to create publication');
    }
  }

  /**
   * Get publications with filters and pagination
   */
  async getPublications(filters: PublicationFilters): Promise<{
    publications: Publication[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.platform) {
      // Filter by platform in JSON array
      where.platforms = {
        array_contains: filters.platform,
      };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    try {
      const [publications, total] = await Promise.all([
        prisma.publication.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        prisma.publication.count({ where }),
      ]);

      return {
        publications,
        total,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error fetching publications:', error);
      throw new Error('Failed to fetch publications');
    }
  }

  /**
   * Get publication by ID
   */
  async getPublicationById(id: string): Promise<Publication | null> {
    try {
      const publication = await prisma.publication.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return publication;
    } catch (error) {
      logger.error('Error fetching publication:', error);
      throw new Error('Failed to fetch publication');
    }
  }

  /**
   * Update publication
   */
  async updatePublication(id: string, data: UpdatePublicationInput): Promise<Publication> {
    try {
      const publication = await prisma.publication.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          platforms: data.platforms,
        },
      });

      logger.info('Publication updated', { publicationId: id });

      return publication;
    } catch (error) {
      logger.error('Error updating publication:', error);
      throw new Error('Failed to update publication');
    }
  }

  /**
   * Update publication status
   */
  async updateStatus(id: string, status: PublicationStatus): Promise<Publication> {
    try {
      const updateData: any = { status };

      // Set publishedAt timestamp when status is PUBLISHED
      if (status === 'PUBLISHED') {
        updateData.publishedAt = new Date();
      }

      const publication = await prisma.publication.update({
        where: { id },
        data: updateData,
      });

      logger.info('Publication status updated', { publicationId: id, status });

      return publication;
    } catch (error) {
      logger.error('Error updating publication status:', error);
      throw new Error('Failed to update publication status');
    }
  }

  /**
   * Update publication URLs after upload
   */
  async updateUrls(id: string, videoUrl: string, thumbnailUrl?: string): Promise<Publication> {
    try {
      const publication = await prisma.publication.update({
        where: { id },
        data: {
          videoUrl,
          thumbnailUrl,
        },
      });

      return publication;
    } catch (error) {
      logger.error('Error updating publication URLs:', error);
      throw new Error('Failed to update publication URLs');
    }
  }

  /**
   * Update publish results from Make callback
   */
  async updatePublishResults(
    id: string,
    results: Record<string, PlatformResult>
  ): Promise<Publication> {
    try {
      // Determine overall status based on results
      const platforms = Object.keys(results);
      const successCount = platforms.filter(p => results[p].success).length;

      let status: PublicationStatus;
      if (successCount === platforms.length) {
        status = 'PUBLISHED';
      } else if (successCount > 0) {
        status = 'PARTIAL';
      } else {
        status = 'FAILED';
      }

      const publication = await prisma.publication.update({
        where: { id },
        data: {
          publishResults: results as any,
          status,
          publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
        },
      });

      logger.info('Publication results updated', { publicationId: id, status });

      return publication;
    } catch (error) {
      logger.error('Error updating publish results:', error);
      throw new Error('Failed to update publish results');
    }
  }

  /**
   * Mark publication as sent to Make
   */
  async markWebhookSent(id: string, response?: any): Promise<Publication> {
    try {
      const publication = await prisma.publication.update({
        where: { id },
        data: {
          makeWebhookSent: true,
          makeResponse: response,
          status: 'PROCESSING',
        },
      });

      logger.info('Publication marked as sent to Make', { publicationId: id });

      return publication;
    } catch (error) {
      logger.error('Error marking webhook as sent:', error);
      throw new Error('Failed to mark webhook as sent');
    }
  }

  /**
   * Delete publication
   */
  async deletePublication(id: string): Promise<void> {
    try {
      await prisma.publication.delete({
        where: { id },
      });

      logger.info('Publication deleted', { publicationId: id });
    } catch (error) {
      logger.error('Error deleting publication:', error);
      throw new Error('Failed to delete publication');
    }
  }
}

export const publicationService = new PublicationService();
