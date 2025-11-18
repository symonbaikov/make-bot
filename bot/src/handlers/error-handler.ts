import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';

export async function handleError(ctx: BotContext, error: unknown): Promise<void> {
  logger.error('Bot error', error);

  try {
    await ctx.reply(
      '❌ Сталася неочікувана помилка.\n\n' +
      'Будь ласка, спробуйте ще раз або використайте /start, щоб перезапустити розмову.\n\n' +
      'Якщо проблема не зникає, будь ласка, зверніться до підтримки.'
    );
  } catch (replyError) {
    logger.error('Failed to send error message', replyError);
  }
}

