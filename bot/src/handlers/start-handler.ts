import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';

export async function handleStart(ctx: BotContext): Promise<void> {
  try {
    const startTime = Date.now();
    logger.info('Start command received', {
      userId: ctx.from?.id,
      username: ctx.from?.username,
      timestamp: new Date().toISOString(),
    });

    if (!ctx.session) {
      ctx.session = {};
    }

    // Start data collection - no sessionId needed
    ctx.session.waitingForEmail = true;
    
    // Set default plan and amount
    ctx.session.plan = 'STANDARD';
    ctx.session.amount = 99.99;

    logger.info('Session initialized for data collection', {
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
