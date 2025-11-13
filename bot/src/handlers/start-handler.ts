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
      await ctx.reply('⏳ Checking your session...');

      const sessionData = await getSessionData(sessionId);

      if (!sessionData) {
        await ctx.reply(
          `❌ Session not found.\n\n` +
          `The session ID "${sessionId}" is invalid or expired.\n\n` +
          `Please contact support or use a valid session link.`
        );
        logger.warn('Invalid session_id', { sessionId, userId: ctx.from?.id });
        return;
      }

      // Check if payment already completed
      const session = await apiClient.getSession(sessionId);
      if (session?.status === 'COMPLETED') {
        await ctx.reply(
          `✅ Your payment has already been completed!\n\n` +
          `📧 Email: ${session.finalEmail || session.emailUser || session.emailPaypal || 'N/A'}\n` +
          `📋 Session ID: ${sessionId}\n\n` +
          `If you have any questions, please contact support.`
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
        `👋 Welcome!\n\n` +
        `I found your session: ${sessionId}\n\n` +
        `📋 Plan: ${sessionData.plan}\n` +
        `💵 Amount: $${sessionData.amount} ${sessionData.currency || 'USD'}\n\n` +
        `To proceed, please provide your email address.\n\n` +
        `📧 Please send me your email address:`
      );

      logger.info('Start command with session_id', { sessionId, userId: ctx.from?.id });
    } else {
      // No session ID - provide instructions
      await ctx.reply(
        `👋 Welcome!\n\n` +
        `This bot helps you complete your payment process.\n\n` +
        `To get started, please use the link provided to you, ` +
        `which includes your session ID.\n\n` +
        `If you have a session ID, you can use:\n` +
        `/start <your_session_id>`
      );

      logger.info('Start command without session_id', { userId: ctx.from?.id });
    }
  } catch (error) {
    logger.error('Error in start handler', error);
    await ctx.reply(
      '❌ An error occurred. Please try again later or contact support.'
    );
  }
}

