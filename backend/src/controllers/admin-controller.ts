import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { webUserService } from '../services/web-user-service';
import { sessionService } from '../services/session-service';
import { actionService } from '../services/action-service';
import { makeService } from '../services/make-service';
import { statsService } from '../services/stats-service';
import { exportService } from '../services/export-service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/async-handler';
import {
  LoginInput,
  CreateSessionInput,
  UpdateEmailInput,
  ListSessionsInput,
  ListActionsInput,
} from '../validators/admin-validators';
import { SessionStatus, ActionType, Plan } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class AdminController {
  /**
   * POST /api/admin/auth/login
   * Admin login
   */
  login = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
    const { email, password } = req.body;

    const result = await webUserService.login(email, password);

    sendSuccess(res, result, 200);
  });

  /**
   * GET /api/admin/payments
   * List payments/sessions with filters
   */
  listPayments = asyncHandler(async (req: Request<unknown, unknown, unknown, ListSessionsInput>, res: Response) => {
    const query = req.query;

    const result = await sessionService.list({
      page: query.page,
      limit: query.limit,
      status: query.status,
      plan: query.plan,
      search: query.search,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    sendSuccess(res, result);
  });

  /**
   * GET /api/admin/payments/:id
   * Get payment/session details
   */
  getPayment = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;

    // Try to find by sessionId first, then by id
    let session = await sessionService.findBySessionId(id);
    if (!session) {
      session = await sessionService.findById(id);
    }

    if (!session) {
      throw new Error('Session not found');
    }

    // Get final email
    const finalEmail = sessionService.getFinalEmail(session);

    sendSuccess(res, {
      ...session,
      finalEmail,
    });
  });

  /**
   * POST /api/admin/payments/:id/resend
   * Resend email (trigger provisioning)
   */
  resendEmail = asyncHandler(async (req: AuthRequest<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const session = await sessionService.findBySessionId(id) || await sessionService.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const finalEmail = sessionService.getFinalEmail(session);
    if (!finalEmail) {
      throw new Error('No email available for this session');
    }

    // Log action
    await actionService.create({
      type: ActionType.EMAIL_RESENT,
      ref: session.sessionId,
      sessionId: session.id,
      payload: {
        email: finalEmail,
        adminId: req.user?.id,
      },
    });

    // Send webhook to Make for reprovisioning
    await makeService.sendWebhook({
      event: 'resend_email',
      sessionId: session.sessionId,
      email: finalEmail,
      adminId: req.user?.id,
    }, session.sessionId);

    sendSuccess(res, {
      message: 'Email resend triggered',
      sessionId: session.sessionId,
      email: finalEmail,
    });
  });

  /**
   * PUT /api/admin/payments/:id/email
   * Update email address
   */
  updateEmail = asyncHandler(async (
    req: AuthRequest<{ id: string }, unknown, UpdateEmailInput>,
    res: Response
  ) => {
    const { id } = req.params;
    const { email } = req.body;

    const session = await sessionService.findBySessionId(id) || await sessionService.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession = await sessionService.updateEmail(id, email);

    sendSuccess(res, {
      message: 'Email updated successfully',
      session: updatedSession,
    });
  });

  /**
   * POST /api/admin/payments/:id/grant-access
   * Manually grant access
   */
  grantAccess = asyncHandler(async (req: AuthRequest<{ id: string }>, res: Response) => {
    const { id } = req.params;

    const session = await sessionService.findBySessionId(id) || await sessionService.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.paymentDate) {
      throw new Error('Payment date is required');
    }

    const finalEmail = sessionService.getFinalEmail(session);
    if (!finalEmail) {
      throw new Error('No email available for this session');
    }

    // Calculate end date
    const endDate = sessionService.calculateEndDate(session.paymentDate);

    // Update session status
    const updatedSession = await sessionService.updateStatus(
      session.sessionId,
      SessionStatus.COMPLETED,
      {
        endDate: endDate.toISOString(),
        manuallyGranted: true,
        grantedBy: req.user?.id,
      }
    );

    // Log action
    await actionService.create({
      type: ActionType.ACCESS_MANUALLY_GRANTED,
      ref: session.sessionId,
      sessionId: session.id,
      payload: {
        email: finalEmail,
        endDate: endDate.toISOString(),
        adminId: req.user?.id,
      },
    });

    // Send webhook to Make
    await makeService.sendWebhook({
      event: 'access_granted',
      sessionId: session.sessionId,
      email: finalEmail,
      endDate: endDate.toISOString(),
      adminId: req.user?.id,
    }, session.sessionId);

    sendSuccess(res, {
      message: 'Access granted successfully',
      session: updatedSession,
      endDate: endDate.toISOString(),
    });
  });

  /**
   * GET /api/admin/stats
   * Get statistics
   */
  getStats = asyncHandler(async (req: Request<unknown, unknown, unknown, { startDate?: string; endDate?: string }>, res: Response) => {
    const query = req.query;

    const stats = await statsService.getStats({
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    sendSuccess(res, stats);
  });

  /**
   * GET /api/admin/actions
   * List activity log
   */
  listActions = asyncHandler(async (req: Request<unknown, unknown, unknown, ListActionsInput>, res: Response) => {
    const query = req.query;

    const result = await actionService.list({
      page: query.page,
      limit: query.limit,
      type: query.type as any,
      ref: query.ref,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    sendSuccess(res, result);
  });

  /**
   * POST /api/admin/sessions
   * Create session manually
   */
  createSession = asyncHandler(async (
    req: AuthRequest<unknown, unknown, CreateSessionInput>,
    res: Response
  ) => {
    const data = req.body;
    const sessionId = `manual-${uuidv4()}`;

    const session = await sessionService.create({
      sessionId,
      plan: data.plan,
      amount: data.amount,
      currency: data.currency,
      meta: {
        createdBy: req.user?.id,
        manual: true,
      },
    });

    sendSuccess(res, {
      session,
      botLink: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || 'your_bot'}?start=${sessionId}`,
    }, 201);
  });

  /**
   * GET /api/admin/export
   * Export data (CSV/Excel)
   */
  exportData = asyncHandler(async (req: Request<unknown, unknown, unknown, {
    status?: SessionStatus;
    plan?: Plan;
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'excel';
  }>, res: Response) => {
    const query = req.query;

    await exportService.exportSessions(
      {
        status: query.status,
        plan: query.plan,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        format: query.format || 'csv',
      },
      res
    );
  });
}

export const adminController = new AdminController();

