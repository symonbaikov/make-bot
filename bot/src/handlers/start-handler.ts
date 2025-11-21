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

    // If session ID provided, try to get session data (optional)
    if (sessionId) {
      await ctx.reply('⏳ Перевіряю вашу сесію...');

      const sessionData = await getSessionData(sessionId);
      if (sessionData) {
        // Store session data if found
        ctx.session.sessionId = sessionId;
        ctx.session.plan = sessionData.plan;
        ctx.session.amount = sessionData.amount;
        ctx.session.currency = sessionData.currency;

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
      }
    }

    // Start data collection regardless of session ID
    ctx.session.waitingForEmail = true;

    await ctx.reply(
      `👋 Вітаємо!\n\n` +
      `Цей бот допомагає вам завершити процес оплати.\n\n` +
      `Щоб продовжити, будь ласка, надайте вашу адресу електронної пошти.\n\n` +
      `📧 Будь ласка, надішліть мені вашу адресу електронної пошти:`
    );

    logger.info('Start command', { sessionId: sessionId || 'none', userId: ctx.from?.id });
  } catch (error) {
    logger.error('Error in start handler', error);
    await ctx.reply(
      '❌ Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.'
    );
  }
}

