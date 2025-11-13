import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';

export async function handleError(ctx: BotContext, error: unknown): Promise<void> {
  logger.error('Bot error', error);

  try {
    await ctx.reply(
      '❌ An unexpected error occurred.\n\n' +
      'Please try again or use /start to restart the conversation.\n\n' +
      'If the problem persists, please contact support.'
    );
  } catch (replyError) {
    logger.error('Failed to send error message', replyError);
  }
}

