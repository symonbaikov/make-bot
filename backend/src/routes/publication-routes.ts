/**
 * Publication Routes
 * API routes for publications
 */

import { Router } from 'express';
import { publicationController } from '../controllers/publication-controller';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload-middleware';
import { validateBody, validateQuery } from '../utils/validation';
import {
  createPublicationSchema,
  updatePublicationSchema,
  listPublicationsSchema,
} from '../validators/publication-validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Upload video file
router.post('/upload', upload.single('video'), publicationController.uploadVideo);

// CRUD operations
router.post('/', validateBody(createPublicationSchema), publicationController.createPublication);

router.get(
  '/',
  validateQuery(listPublicationsSchema as any),
  publicationController.getPublications
);

router.get('/:id', publicationController.getPublicationById);

router.put('/:id', validateBody(updatePublicationSchema), publicationController.updatePublication);

router.delete('/:id', publicationController.deletePublication);

// Publish to Make
router.post('/:id/publish', publicationController.publishToMake);

// Retry failed publication
router.post('/:id/retry', publicationController.retryPublication);

export default router;
