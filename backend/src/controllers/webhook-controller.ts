import { Request, Response } from 'express';
import { sessionService } from '../services/session-service';
import { makeService } from '../services/make-service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/async-handler';
import { BotWebhookInput, PayPalWebhookInput } from '../validators/webhook-validators';
import { SessionStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export class WebhookController {
  /**
   * POST /api/webhook/bot
   * Webhook from Telegram bot for email collection
   */
  botWebhook = asyncHandler(async (req: Request<unknown, unknown, BotWebhookInput>, res: Response) => {
    const data = req.body;

    // Upsert session with email
    const session = await sessionService.upsertBySessionId({
      sessionId: data.sessionId,
      plan: data.plan,
      amount: data.amount,
      emailUser: data.email,
      tgUserId: data.tgUserId,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
    });

    // Send webhook to Make
    await makeService.sendBotWebhook({
      sessionId: data.sessionId,
      email: data.email,
      tgUserId: data.tgUserId,
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      plan: data.plan,
      amount: data.amount,
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

    let status = SessionStatus.PAID;
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

