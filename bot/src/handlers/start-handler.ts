import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse session_id from /start command parameter (optional)
 */
function parseSessionId(text: string): string | null {
  // Format: /start <session_id>
  const parts = text.split(' ');
  if (parts.length > 1) {
    return parts[1];
  }
  return null;
}

export async function handleStart(ctx: BotContext): Promise<void> {
  try {
    const startTime = Date.now();
    logger.info('Start command received', {
      userId: ctx.from?.id,
      username: ctx.from?.username,
      messageText: ctx.message && 'text' in ctx.message ? ctx.message.text : null,
      timestamp: new Date().toISOString(),
    });

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const providedSessionId = messageText ? parseSessionId(messageText) : null;

    if (!ctx.session) {
      ctx.session = {};
    }

    // Generate session ID if not provided
    const sessionId = providedSessionId || `tg-${ctx.from?.id}-${uuidv4()}`;
    ctx.session.sessionId = sessionId;
    ctx.session.waitingForEmail = true;
    
    // Set default plan and amount if not provided
    ctx.session.plan = ctx.session.plan || 'STANDARD';
    ctx.session.amount = ctx.session.amount || 99.99;

    logger.info('Session initialized', {
      sessionId,
      providedSessionId: providedSessionId || 'auto-generated',
      userId: ctx.from?.id,
      processingTime: Date.now() - startTime,
    });

    await ctx.reply(
      `👋 Вітаємо!\n\n` +
        `Цей бот допоможе вам зібрати необхідну інформацію.\n\n` +
        `Щоб продовжити, будь ласка, надайте вашу адресу електронної пошти.\n\n` +
        `📧 Будь ласка, надішліть мені вашу адресу електронної пошти:`
    );

    logger.info('Start command completed', {
      sessionId,
      userId: ctx.from?.id,
      totalTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Error in start handler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.from?.id,
    });
    await ctx.reply(
      '❌ Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.'
    );
  }
}
