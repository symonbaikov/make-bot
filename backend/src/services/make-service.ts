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
      logger.warn('MAKE_WEBHOOK_URL is not configured - Make webhooks will be skipped');
      logger.warn('To enable Make integration, set MAKE_WEBHOOK_URL in Railway environment variables');
      this.webhookUrl = '';
    } else {
      this.webhookUrl = url;
      logger.info('Make webhook URL configured', { 
        url: url.replace(/\/[^\/]+$/, '/****') // Mask the last part of URL for security
      });
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
      logger.warn('Make webhook URL not configured, skipping webhook', { sessionId });
      return;
    }

    logger.info('Sending webhook to Make', { 
      sessionId, 
      event: (data as any).event,
      webhookUrl: this.webhookUrl.replace(/\/[^\/]+$/, '/****'), // Mask URL for logging
      dataSize: JSON.stringify(data).length,
      dataKeys: Object.keys(data),
    });

    try {
      // Log the exact payload being sent
      logger.debug('Make webhook payload', {
        sessionId,
        payload: JSON.stringify(data),
      });

      const response = await axios.post(this.webhookUrl, data, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });

      logger.info('Make webhook response received', {
        sessionId,
        status: response.status,
        statusText: response.statusText,
      });

      logger.info('✅ Webhook sent to Make successfully', { 
        sessionId,
        responseStatus: response.status,
      });

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
      logger.error('❌ Failed to send webhook to Make', {
        error: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        responseData: axiosError.response?.data,
        sessionId,
        retries,
        payload: JSON.stringify(data),
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
    phoneNumber?: string;
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

