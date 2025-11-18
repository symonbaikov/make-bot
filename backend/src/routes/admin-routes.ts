import { Router } from 'express';
import { adminController } from '../controllers/admin-controller';
import { authMiddleware, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../utils/validation';
import {
  loginSchema,
  requestPasswordResetSchema,
  loginWithResetCodeSchema,
  createSessionSchema,
  updateEmailSchema,
  listSessionsSchema,
  listActionsSchema,
} from '../validators/admin-validators';
import { authLimiter } from '../middleware/rate-limiter';
import { Role } from '@prisma/client';

const router = Router();

// POST /api/admin/auth/login
router.post(
  '/auth/login',
  authLimiter,
  validateBody(loginSchema),
  adminController.login
);

// POST /api/admin/auth/forgot-password
router.post(
  '/auth/forgot-password',
  authLimiter,
  validateBody(requestPasswordResetSchema),
  adminController.requestPasswordReset
);

// POST /api/admin/auth/reset-password
router.post(
  '/auth/reset-password',
  authLimiter,
  validateBody(loginWithResetCodeSchema),
  adminController.loginWithResetCode
);

// All routes below require authentication
router.use(authMiddleware);

// GET /api/admin/payments
router.get(
  '/payments',
  validateQuery(listSessionsSchema),
  adminController.listPayments
);

// GET /api/admin/payments/:id
router.get('/payments/:id', adminController.getPayment);

// POST /api/admin/payments/:id/resend
router.post('/payments/:id/resend', adminController.resendEmail);

// PUT /api/admin/payments/:id/email
router.put(
  '/payments/:id/email',
  validateBody(updateEmailSchema),
  adminController.updateEmail
);

// POST /api/admin/payments/:id/grant-access
router.post('/payments/:id/grant-access', adminController.grantAccess);

// GET /api/admin/stats
router.get('/stats', adminController.getStats);

// GET /api/admin/actions
router.get(
  '/actions',
  validateQuery(listActionsSchema),
  adminController.listActions
);

// POST /api/admin/sessions
router.post(
  '/sessions',
  requireRole(Role.ADMIN),
  validateBody(createSessionSchema),
  adminController.createSession
);

// GET /api/admin/export
router.get('/export', adminController.exportData);

export default router;

