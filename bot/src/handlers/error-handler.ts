import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';
import { captureException, setUser } from '../utils/sentry';

export async function handleError(ctx: BotContext, error: unknown): Promise<void> {
  logger.error('Bot error', error);

  // Send to Sentry with context
  if (error instanceof Error) {
    // Set user context if available
    if (ctx.from) {
      setUser({
        id: ctx.from.id.toString(),
        username: ctx.from.username,
        telegramId: ctx.from.id,
      });
    }

    captureException(error, {
      bot: {
        chatId: ctx.chat?.id,
        messageId: ctx.message?.message_id,
        sessionId: ctx.session?.sessionId,
        waitingFor: ctx.session?.waitingForEmail
          ? 'email'
          : ctx.session?.waitingForFirstName
          ? 'firstName'
          : ctx.session?.waitingForLastName
          ? 'lastName'
          : ctx.session?.waitingForPhoneNumber
          ? 'phoneNumber'
          : 'none',
      },
    });
  }

  try {
    await ctx.reply(
      '❌ Сталася неочікувана помилка.\n\n' +
      'Будь ласка, спробуйте ще раз або використайте /start, щоб перезапустити розмову.\n\n' +
      'Якщо проблема не зникає, будь ласка, зверніться до підтримки.'
    );
  } catch (replyError) {
    logger.error('Failed to send error message', replyError);
    // Also send reply error to Sentry
    if (replyError instanceof Error) {
      captureException(replyError, {
        bot: {
          originalError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

