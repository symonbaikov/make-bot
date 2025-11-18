import { BotContext } from '../middleware/session-middleware';
import { SessionData } from '../types';
import { logger } from '../utils/logger';
import { apiClient } from '../utils/api-client';

/**
 * Parse session_id from /start command parameter
 */
function parseSessionId(text: string): string | null {
  // Format: /start <session_id>
  const parts = text.split(' ');
  if (parts.length > 1) {
    return parts[1];
  }
  return null;
}

/**
 * Get session data from backend API
 */
async function getSessionData(sessionId: string): Promise<SessionData | null> {
  try {
    const session = await apiClient.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      plan: session.plan as 'BASIC' | 'STANDARD' | 'PREMIUM',
      amount: session.amount,
      currency: session.currency,
    };
  } catch (error) {
    logger.error('Failed to get session data', error);
    return null;
  }
}

export async function handleStart(ctx: BotContext): Promise<void> {
  try {
    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const sessionId = messageText ? parseSessionId(messageText) : null;

    if (!ctx.session) {
      ctx.session = {};
    }

    if (sessionId) {
      // Session ID provided - get session data from backend
      await ctx.reply('⏳ Перевіряю вашу сесію...');

      const sessionData = await getSessionData(sessionId);

      if (!sessionData) {
        await ctx.reply(
          `❌ Сесію не знайдено.\n\n` +
          `ID сесії "${sessionId}" недійсний або закінчився.\n\n` +
          `Будь ласка, зверніться до підтримки або використайте дійсне посилання на сесію.`
        );
        logger.warn('Invalid session_id', { sessionId, userId: ctx.from?.id });
        return;
      }

      // Check if payment already completed
      const session = await apiClient.getSession(sessionId);
      if (session?.status === 'COMPLETED') {
        await ctx.reply(
          `✅ Ваш платіж вже завершено!\n\n` +
          `📧 Email: ${session.finalEmail || session.emailUser || session.emailPaypal || 'N/A'}\n` +
          `📋 ID сесії: ${sessionId}\n\n` +
          `Якщо у вас є питання, будь ласка, зверніться до підтримки.`
        );
        return;
      }

      // Store session data and request email
      ctx.session.sessionId = sessionId;
      ctx.session.plan = sessionData.plan;
      ctx.session.amount = sessionData.amount;
      ctx.session.currency = sessionData.currency;
      ctx.session.waitingForEmail = true;

      await ctx.reply(
        `👋 Вітаємо!\n\n` +
        `Я знайшов вашу сесію: ${sessionId}\n\n` +
        `📋 План: ${sessionData.plan}\n` +
        `💵 Сума: $${sessionData.amount} ${sessionData.currency || 'USD'}\n\n` +
        `Щоб продовжити, будь ласка, надайте вашу адресу електронної пошти.\n\n` +
        `📧 Будь ласка, надішліть мені вашу адресу електронної пошти:`
      );

      logger.info('Start command with session_id', { sessionId, userId: ctx.from?.id });
    } else {
      // No session ID - provide instructions
      await ctx.reply(
        `👋 Вітаємо!\n\n` +
        `Цей бот допомагає вам завершити процес оплати.\n\n` +
        `Щоб почати, будь ласка, використайте посилання, яке вам надали, ` +
        `яке містить ваш ID сесії.\n\n` +
        `Якщо у вас є ID сесії, ви можете використати:\n` +
        `/start <ваш_id_сесії>`
      );

      logger.info('Start command without session_id', { userId: ctx.from?.id });
    }
  } catch (error) {
    logger.error('Error in start handler', error);
    await ctx.reply(
      '❌ Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.'
    );
  }
}

