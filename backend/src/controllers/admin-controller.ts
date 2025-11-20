import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { webUserService } from '../services/web-user-service';
import { sessionService } from '../services/session-service';
import { actionService } from '../services/action-service';
import { makeService } from '../services/make-service';
import { statsService } from '../services/stats-service';
import { exportService } from '../services/export-service';
import { emailService } from '../services/email-service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/async-handler';
import {
  LoginInput,
  RequestPasswordResetInput,
  LoginWithResetCodeInput,
  CreateSessionInput,
  UpdateEmailInput,
  SendEmailInput,
  ListSessionsInput,
  ListActionsInput,
} from '../validators/admin-validators';
import { Plan, SessionStatus, ActionType } from '@prisma/client';
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
   * POST /api/admin/auth/forgot-password
   * Request password reset code
   */
  requestPasswordReset = asyncHandler(async (req: Request<unknown, unknown, RequestPasswordResetInput>, res: Response) => {
    const { email } = req.body;

    await webUserService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    sendSuccess(res, {
      message: 'If the email exists, a reset code has been sent',
    }, 200);
  });

  /**
   * POST /api/admin/auth/reset-password
   * Login with password reset code
   */
  loginWithResetCode = asyncHandler(async (req: Request<unknown, unknown, LoginWithResetCodeInput>, res: Response) => {
    const { email, code } = req.body;

    const result = await webUserService.loginWithResetCode(email, code);

    sendSuccess(res, result, 200);
  });

  /**
   * GET /api/admin/payments
   * List payments/sessions with filters
   */
  listPayments = asyncHandler<unknown, unknown, unknown, ListSessionsInput>(async (req: Request<unknown, unknown, unknown, ListSessionsInput>, res: Response) => {
    const query = req.query;

    const result = await sessionService.list({
      page: query.page as number | undefined,
      limit: query.limit as number | undefined,
      status: query.status as SessionStatus | undefined,
      plan: query.plan as Plan | undefined,
      search: query.search as string | undefined,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
    });

    sendSuccess(res, result);
  });

  /**
   * GET /api/admin/payments/:id
   * Get payment/session details
   */
  getPayment = asyncHandler<{ id: string }>(async (req: Request<{ id: string }>, res: Response) => {
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
  resendEmail = asyncHandler<{ id: string }>(async (req: AuthRequest<{ id: string }>, res: Response) => {
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
  updateEmail = asyncHandler<{ id: string }, unknown, UpdateEmailInput>(async (
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
   * POST /api/admin/payments/:id/send-email
   * Send custom email to user
   */
  sendEmail = asyncHandler<{ id: string }, unknown, SendEmailInput>(async (
    req: AuthRequest<{ id: string }, unknown, SendEmailInput>,
    res: Response
  ) => {
    const { id } = req.params;
    const { subject, body } = req.body;

    const session = await sessionService.findBySessionId(id) || await sessionService.findById(id);
    if (!session) {
      throw new Error('Session not found');
    }

    const finalEmail = sessionService.getFinalEmail(session);
    if (!finalEmail) {
      throw new Error('No email available for this session');
    }

    // Send email
    await emailService.sendEmailToUser(finalEmail, subject, body);

    // Log action
    await actionService.create({
      type: ActionType.EMAIL_SENT_ADMIN,
      ref: session.sessionId,
      sessionId: session.id,
      payload: {
        email: finalEmail,
        subject,
        adminId: req.user?.id,
        adminEmail: req.user?.email,
      },
    });

    sendSuccess(res, {
      message: 'Email sent successfully',
      sessionId: session.sessionId,
      email: finalEmail,
      subject,
    });
  });

  /**
   * POST /api/admin/payments/:id/grant-access
   * Manually grant access
   */
  grantAccess = asyncHandler<{ id: string }>(async (req: AuthRequest<{ id: string }>, res: Response) => {
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
  listActions = asyncHandler<unknown, unknown, unknown, ListActionsInput>(async (req: Request<unknown, unknown, unknown, ListActionsInput>, res: Response) => {
    const query = req.query;

    const result = await actionService.list({
      page: query.page as number | undefined,
      limit: query.limit as number | undefined,
      type: query.type ? (query.type as ActionType) : undefined,
      ref: query.ref as string | undefined,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
    });

    sendSuccess(res, result);
  });

  /**
   * POST /api/admin/sessions
   * Create session manually
   */
  createSession = asyncHandler<unknown, unknown, CreateSessionInput>(async (
    req: AuthRequest<unknown, unknown, CreateSessionInput>,
    res: Response
  ) => {
    const data = req.body;
    const sessionId = `manual-${uuidv4()}`;

    const session = await sessionService.create({
      sessionId,
      plan: data.plan as Plan,
      amount: data.amount as number,
      currency: data.currency as string | undefined,
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
        status: query.status as SessionStatus | undefined,
        plan: query.plan as Plan | undefined,
        startDate: query.startDate ? new Date(query.startDate as string) : undefined,
        endDate: query.endDate ? new Date(query.endDate as string) : undefined,
        format: (query.format as 'csv' | 'excel') || 'csv',
      },
      res
    );
  });
}

export const adminController = new AdminController();

