import { Request, Response } from 'express';
import { sessionService } from '../services/session-service';
import { makeService } from '../services/make-service';
import { emailService } from '../services/email-service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../middleware/async-handler';
import {
  BotWebhookInput,
  PayPalWebhookInput,
  MakePaypalWebhookInput,
} from '../validators/webhook-validators';
import { Plan, SessionStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { userService } from '../services/user-service';

export class WebhookController {
  /**
   * POST /api/webhook/bot
   * Webhook from Telegram bot for email collection
   */
  botWebhook = asyncHandler(
    async (req: Request<unknown, unknown, BotWebhookInput>, res: Response) => {
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
      emailService
        .sendNewUserNotification({
          sessionId: data.sessionId as string,
          email: data.email as string,
          firstName: data.firstName as string | undefined,
          lastName: data.lastName as string | undefined,
          phoneNumber: data.phoneNumber as string | undefined,
          plan: data.plan as string,
          amount: data.amount as number,
        })
        .catch(error => {
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
    }
  );

  /**
   * POST /api/webhook/paypal
   * Webhook from PayPal for payment notifications
   */
  paypalWebhook = asyncHandler(
    async (req: Request<unknown, unknown, PayPalWebhookInput>, res: Response) => {
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
      const paymentDate =
        typeof data.paymentDate === 'string' ? new Date(data.paymentDate) : data.paymentDate;

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
        amount: data.amount,
        currency: data.currency,
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
    }
  );

  /**
   * POST /api/webhook/paypal/make
   * Webhook from Make scenario (PayPal IPN forwarded)
   */
  makePaypalWebhook = asyncHandler(
    async (req: Request<unknown, unknown, MakePaypalWebhookInput>, res: Response) => {
      const payloads = (Array.isArray(req.body) ? req.body : [req.body]) as Record<
        string,
        unknown
      >[];

      logger.info('📥 Make PayPal webhook received', {
        count: payloads.length,
        keys: payloads.map(p => Object.keys(p)),
      });

      const results: {
        sessionId: string;
        txnId: string;
        status: SessionStatus;
        matchedBy: string;
        emailPaypal?: string;
        amount: number;
        currency: string;
      }[] = [];

      const errors: {
        txnId?: string;
        error: string;
      }[] = [];

      const normalizeStatus = (statusRaw: string): SessionStatus => {
        const normalized = statusRaw?.toLowerCase() || '';
        if (['refunded', 'reversed', 'canceled_reversal'].includes(normalized)) {
          return SessionStatus.REFUNDED;
        }
        if (['failed', 'denied', 'expired', 'voided'].includes(normalized)) {
          return SessionStatus.FAILED;
        }
        if (['pending', 'in-progress', 'in_progress', 'pending_payment'].includes(normalized)) {
          return SessionStatus.AWAITING_PAYMENT;
        }
        return SessionStatus.PAID;
      };

      const detectPlan = (text?: string): Plan => {
        const normalized = (text || '').toLowerCase();
        if (normalized.includes('базов') || normalized.includes('basic')) {
          return Plan.BASIC;
        }
        if (normalized.includes('прем') || normalized.includes('premium')) {
          return Plan.PREMIUM;
        }
        return Plan.STANDARD;
      };

      const parseAmount = (value: unknown): number => {
        if (!value) return 0;
        const normalized = String(value)
          .replace(/[^0-9.,-]/g, '')
          .replace(',', '.');
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
      };

      const parsePaymentDate = (value?: string): Date => {
        if (!value) return new Date();
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        // Some PayPal dates may include timezone abbreviations - fallback to now if parsing fails
        return new Date();
      };

      for (const rawPayload of payloads) {
        try {
          const txnId = (rawPayload.txn_id as string) || '';
          if (!txnId) {
            throw new Error('Missing txn_id');
          }

          const paymentStatusRaw = (rawPayload.payment_status as string) || '';
          const payerEmail = rawPayload.payer_email as string | undefined;
          const sessionIdFromCustom = (rawPayload.custom as string | undefined)?.trim();
          const itemName =
            (rawPayload.item_name1 as string | undefined) ||
            (rawPayload.item_name as string | undefined) ||
            (rawPayload.transaction_subject as string | undefined);
          const paymentDate = parsePaymentDate(rawPayload.payment_date as string | undefined);
          const amount = parseAmount(
            rawPayload.mc_gross_1 || rawPayload.mc_gross || rawPayload.payment_gross
          );
          const currency =
            (rawPayload.mc_currency as string) || (rawPayload.currency as string) || 'USD';
          const status = normalizeStatus(paymentStatusRaw);
          const firstName = rawPayload.first_name as string | undefined;
          const lastName = rawPayload.last_name as string | undefined;
          const payerId = rawPayload.payer_id as string | undefined;
          const planFromPayload = detectPlan(itemName);

          let matchedBy = 'txnId';
          let session = (await sessionService.findByTxnId(txnId)) || null;

          if (!session && sessionIdFromCustom) {
            session = await sessionService.findBySessionId(sessionIdFromCustom);
            matchedBy = 'custom';
          }

          if (!session && payerEmail) {
            session = await sessionService.findLatestByEmail(payerEmail);
            matchedBy = 'email';
          }

          if (!session) {
            matchedBy = 'new';
          }

          // Link or create user by payer email
          let user = session?.user;
          if (!user && payerEmail) {
            user = (await userService.findByEmail(payerEmail)) || null;
          }
          if (!user && payerEmail) {
            user = await userService.create({
              email: payerEmail,
              firstName,
              lastName,
            });
          } else if (user && payerEmail && (firstName || lastName)) {
            if (!user.firstName || !user.lastName) {
              user = await userService.update(user.id, {
                firstName: user.firstName || firstName,
                lastName: user.lastName || lastName,
              });
            }
          }

          const sessionIdToUse = session?.sessionId || sessionIdFromCustom || `paypal-${txnId}`;
          const plan = session?.plan || planFromPayload;

          const meta: Record<string, unknown> = {
            source: 'paypal_ipn',
            payerId,
            itemName,
            transactionSubject: rawPayload.transaction_subject,
            ipnTrackId: rawPayload.ipn_track_id,
            paymentStatusRaw,
            makeWebhook: true,
            raw: rawPayload,
          };

          const updatedSession = session
            ? await sessionService.updatePayment({
                sessionId: session.sessionId,
                txnId,
                emailPaypal: payerEmail,
                paymentDate,
                status,
                amount,
                currency,
                userId: user?.id ?? session?.userId ?? undefined,
                meta: {
                  matchedBy,
                  ...meta,
                },
              })
            : await sessionService.createFromPayment({
                sessionId: sessionIdToUse,
                txnId,
                plan,
                amount,
                currency,
                emailPaypal: payerEmail,
                paymentDate,
                status,
                userId: user?.id,
                meta: {
                  matchedBy,
                  ...meta,
                },
              });

          results.push({
            sessionId: updatedSession.sessionId,
            txnId,
            status: updatedSession.status,
            matchedBy,
            emailPaypal: payerEmail,
            amount,
            currency,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({
            txnId: (rawPayload.txn_id as string) || undefined,
            error: errorMessage,
          });
          logger.error('❌ Failed to process Make PayPal webhook item', {
            error: errorMessage,
            payload: rawPayload,
          });
        }
      }

      sendSuccess(res, {
        processed: results.length,
        results,
        errors,
      });
    }
  );
}

export const webhookController = new WebhookController();
