import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { actionService } from './action-service';
import { ActionType } from '@prisma/client';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export class MakeService {
  private webhookUrl: string;

  constructor() {
    const url = process.env.MAKE_WEBHOOK_URL;
    if (!url) {
      logger.warn('MAKE_WEBHOOK_URL is not configured');
      this.webhookUrl = '';
    } else {
      this.webhookUrl = url;
    }
  }

  /**
   * Send webhook to Make with retry logic
   */
  async sendWebhook(
    data: Record<string, unknown>,
    sessionId?: string,
    retries: number = MAX_RETRIES
  ): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Make webhook URL not configured, skipping webhook');
      return;
    }

    try {
      await axios.post(this.webhookUrl, data, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info('Webhook sent to Make successfully', { sessionId });

      // Log successful webhook
      if (sessionId) {
        await actionService.create({
          type: ActionType.WEBHOOK_SENT,
          ref: sessionId,
          payload: { data, webhookUrl: this.webhookUrl },
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to send webhook to Make', {
        error: axiosError.message,
        status: axiosError.response?.status,
        sessionId,
        retries,
      });

      // Retry logic with exponential backoff
      if (retries > 0) {
        const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
        logger.info(`Retrying webhook in ${delay}ms`, { sessionId, retries });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWebhook(data, sessionId, retries - 1);
      }

      // Log failed webhook after max retries
      if (sessionId) {
        await actionService.create({
          type: ActionType.WEBHOOK_FAILED,
          ref: sessionId,
          payload: {
            data,
            error: axiosError.message,
            status: axiosError.response?.status,
          },
        });
      }

      // Don't throw error - webhook failures shouldn't break the main flow
      logger.error('Webhook failed after max retries', { sessionId });
    }
  }

  /**
   * Send webhook for bot email collection
   */
  async sendBotWebhook(data: {
    sessionId: string;
    email: string;
    tgUserId: string;
    firstName?: string;
    lastName?: string;
    plan: string;
    amount: number;
  }): Promise<void> {
    await this.sendWebhook(
      {
        event: 'bot_email_collected',
        ...data,
      },
      data.sessionId
    );
  }

  /**
   * Send webhook for PayPal payment
   */
  async sendPayPalWebhook(data: {
    sessionId: string;
    txnId: string;
    emailPaypal?: string;
    amount: number;
    currency: string;
    paymentDate: string;
    status: string;
  }): Promise<void> {
    await this.sendWebhook(
      {
        event: 'paypal_payment_received',
        ...data,
      },
      data.sessionId
    );
  }
}

export const makeService = new MakeService();

