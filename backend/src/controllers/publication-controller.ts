/**
 * Publication Controller
 * Handles API requests for publications
 */

import { Request, Response } from 'express';
import { videoUploadService } from '../services/video-upload-service';
import { publicationService } from '../services/publication-service';
import { makePublicationService } from '../services/make-publication-service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/async-handler';
import {
  CreatePublicationInput,
  UpdatePublicationInput,
} from '../validators/publication-validators';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

class PublicationController {
  /**
   * Upload video file
   * POST /api/admin/publications/upload
   */
  uploadVideo = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 'NO_FILE_UPLOADED', 400);
    }

    try {
      const result = await videoUploadService.uploadVideo(req.file);

      sendSuccess(res, result, 200);
    } catch (error) {
      logger.error('Error uploading video:', error);
      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to upload video',
        'UPLOAD_FAILED',
        400
      );
    }
  });

  /**
   * Create new publication
   * POST /api/admin/publications
   */
  createPublication = asyncHandler(
    async (req: Request<unknown, unknown, CreatePublicationInput>, res: Response) => {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      }

      const { title, description, videoPath, thumbnailPath, platforms } = req.body;

      try {
        const publication = await publicationService.createPublication({
          userId,
          title,
          description,
          videoPath,
          thumbnailPath,
          platforms,
        });

        sendSuccess(res, publication, 201);
      } catch (error) {
        logger.error('Error creating publication:', error);
        sendError(
          res,
          error instanceof Error ? error.message : 'Failed to create publication',
          'CREATE_FAILED',
          500
        );
      }
    }
  );

  /**
   * Get publications list
   * GET /api/admin/publications
   */
  getPublications = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    const query = req.query as any;
    const filters = {
      ...query,
      userId, // Filter by current user
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    try {
      const result = await publicationService.getPublications(filters);
      sendSuccess(res, result);
    } catch (error) {
      logger.error('Error fetching publications:', error);
      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to fetch publications',
        'FETCH_FAILED',
        500
      );
    }
  });

  /**
   * Get publication by ID
   * GET /api/admin/publications/:id
   */
  getPublicationById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const publication = await publicationService.getPublicationById(id);

      if (!publication) {
        return sendError(res, 'Publication not found', 'NOT_FOUND', 404);
      }

      sendSuccess(res, publication);
    } catch (error) {
      logger.error('Error fetching publication:', error);
      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to fetch publication',
        'FETCH_FAILED',
        500
      );
    }
  });

  /**
   * Update publication
   * PUT /api/admin/publications/:id
   */
  updatePublication = asyncHandler(
    async (req: Request<{ id: string }, unknown, UpdatePublicationInput>, res: Response) => {
      const { id } = req.params;
      const data = req.body;

      try {
        const publication = await publicationService.updatePublication(id, data);
        sendSuccess(res, publication);
      } catch (error) {
        logger.error('Error updating publication:', error);
        sendError(
          res,
          error instanceof Error ? error.message : 'Failed to update publication',
          'UPDATE_FAILED',
          500
        );
      }
    }
  );

  /**
   * Delete publication
   * DELETE /api/admin/publications/:id
   */
  deletePublication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      // Get publication to delete files
      const publication = await publicationService.getPublicationById(id);

      if (!publication) {
        return sendError(res, 'Publication not found', 'NOT_FOUND', 404);
      }

      // Delete files
      await videoUploadService.deleteVideo(
        publication.videoPath,
        publication.thumbnailPath || undefined
      );

      // Delete from database
      await publicationService.deletePublication(id);

      sendSuccess(res, null);
    } catch (error) {
      logger.error('Error deleting publication:', error);
      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to delete publication',
        'DELETE_FAILED',
        500
      );
    }
  });

  /**
   * Publish to Make webhook
   * POST /api/admin/publications/:id/publish
   */
  publishToMake = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await makePublicationService.sendToMake(id);
      sendSuccess(res, null);
    } catch (error) {
      logger.error('Error publishing to Make:', error);
      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to publish to Make',
        'PUBLISH_FAILED',
        500
      );
    }
  });

  /**
   * Retry failed publication
   * POST /api/admin/publications/:id/retry
   */
  retryPublication = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      await makePublicationService.retryPublication(id);
      sendSuccess(res, null);
    } catch (error) {
      logger.error('Error retrying publication:', error);
      sendError(
        res,
        error instanceof Error ? error.message : 'Failed to retry publication',
        'RETRY_FAILED',
        500
      );
    }
  });
}

export const publicationController = new PublicationController();
