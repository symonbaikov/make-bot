import { Request, Response } from 'express';
import { sessionService } from '../services/session-service';
import { makeService } from '../services/make-service';
import { emailService } from '../services/email-service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/async-handler';
import { BotWebhookInput, PayPalWebhookInput } from '../validators/webhook-validators';
import { Plan, SessionStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * POST /api/webhook/bot
   * Webhook from Telegram bot for email collection
   */
  botWebhook = asyncHandler(async (req: Request<unknown, unknown, BotWebhookInput>, res: Response) => {
    const data = req.body;

    // Log incoming webhook data for debugging
    logger.info('📥 Bot webhook received', {
      body: JSON.stringify(data),
      bodyKeys: Object.keys(data),
      contentType: req.get('content-type'),
      bodyType: typeof data,
      isEmpty: !data || Object.keys(data).length === 0,
    });

    // Upsert session with email
    const session = await sessionService.upsertBySessionId({
      sessionId: data.sessionId as string,
      plan: data.plan as Plan,
      amount: data.amount as number,
      emailUser: data.email as string | undefined,
      tgUserId: data.tgUserId as string | undefined,
      firstName: data.firstName as string | undefined,
      lastName: data.lastName as string | undefined,
      phoneNumber: data.phoneNumber as string | undefined,
    });

    // Send webhook to Make
    await makeService.sendBotWebhook({
      sessionId: data.sessionId as string,
      email: data.email as string,
      tgUserId: data.tgUserId as string,
      firstName: data.firstName as string | undefined,
      lastName: data.lastName as string | undefined,
      phoneNumber: data.phoneNumber as string | undefined,
      plan: data.plan as string,
      amount: data.amount as number,
    });

    // Send notification to admin (non-blocking)
    emailService.sendNewUserNotification({
      sessionId: data.sessionId as string,
      email: data.email as string,
      firstName: data.firstName as string | undefined,
      lastName: data.lastName as string | undefined,
      phoneNumber: data.phoneNumber as string | undefined,
      plan: data.plan as string,
      amount: data.amount as number,
    }).catch(error => {
      logger.error('Failed to send admin notification', {
        sessionId: data.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    sendSuccess(res, {
      sessionId: session.sessionId,
      status: session.status,
      message: 'User data collected successfully',
    });
  });

  /**
   * POST /api/webhook/paypal
   * Webhook from PayPal for payment notifications
   */
  paypalWebhook = asyncHandler(async (req: Request<unknown, unknown, PayPalWebhookInput>, res: Response) => {
    const data = req.body;

    // Log incoming webhook data for debugging
    logger.info('📥 PayPal webhook received', {
      body: JSON.stringify(data),
      bodyKeys: Object.keys(data),
      contentType: req.get('content-type'),
      bodyType: typeof data,
      isEmpty: !data || Object.keys(data).length === 0,
    });

    // Extract session_id from custom parameter or request body
    const sessionId = data.custom || data.sessionId;
    if (!sessionId) {
      throw new Error('Session ID is required (from custom parameter or sessionId)');
    }

    // Check for duplicate transaction
    const existingSession = await sessionService.findByTxnId(data.txnId);
    if (existingSession) {
      logger.warn('Duplicate PayPal transaction', { txnId: data.txnId });
      sendSuccess(res, {
        message: 'Transaction already processed',
        sessionId: existingSession.sessionId,
      });
      return;
    }

    // Update session with payment information
    const paymentDate = typeof data.paymentDate === 'string' 
      ? new Date(data.paymentDate) 
      : data.paymentDate;

    let status: SessionStatus = SessionStatus.PAID;
    if (data.status === 'pending') {
      status = SessionStatus.PAID;
    } else if (data.status === 'refunded') {
      status = SessionStatus.REFUNDED;
    } else if (data.status === 'failed') {
      status = SessionStatus.FAILED;
    }

    const session = await sessionService.updatePayment({
      sessionId,
      txnId: data.txnId,
      emailPaypal: data.emailPaypal,
      paymentDate,
      status,
      meta: {
        currency: data.currency,
        paypalStatus: data.status,
      },
    });

    // Send webhook to Make
    await makeService.sendPayPalWebhook({
      sessionId,
      txnId: data.txnId,
      emailPaypal: data.emailPaypal,
      amount: data.amount,
      currency: data.currency,
      paymentDate: paymentDate.toISOString(),
      status: data.status,
    });

    sendSuccess(res, {
      sessionId: session.sessionId,
      status: session.status,
      message: 'Payment processed successfully',
    });
  });
}

export const webhookController = new WebhookController();

