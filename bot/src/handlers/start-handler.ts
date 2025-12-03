import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';
import { getPlanKeyboard } from './plan-handler';

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

    // Start with plan selection
    ctx.session.waitingForPlan = true;

    logger.info('Session initialized for plan selection', {
      userId: ctx.from?.id,
      processingTime: Date.now() - startTime,
    });

    const welcomeMessage =
      `✋ Вітаю\n\n` +
      `Ви вже майже розпочали навчання!\n\n` +
      `Будь ласка, оберіть тариф, який вам підходить:\n\n` +
      `📦 **Базовий** - 64 GBP\n` +
      `⭐ **Стандарт** - 97 GBP\n` +
      `💎 **Преміум** - 147 GBP\n\n` +
      `Натисніть на кнопку з тарифом, який ви хочете обрати:`;

    const planKeyboard = getPlanKeyboard();

    logger.info('Sending welcome message', {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      messageLength: welcomeMessage.length,
      hasSession: !!ctx.session,
    });

    try {
      // Log before attempting to send
      logger.info('Attempting to send reply', {
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        messagePreview: welcomeMessage.substring(0, 50),
      });

      const replyResult = await ctx.reply(welcomeMessage, {
        reply_markup: planKeyboard,
        parse_mode: 'Markdown',
      });

      logger.info('✅ Welcome message sent successfully', {
        userId: ctx.from?.id,
        messageId: replyResult.message_id,
        chatId: replyResult.chat.id,
        totalTime: Date.now() - startTime,
      });
    } catch (replyError) {
      logger.error('❌ Failed to send welcome message', {
        error: replyError instanceof Error ? replyError.message : String(replyError),
        stack: replyError instanceof Error ? replyError.stack : undefined,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
        errorCode: (replyError as any)?.response?.error_code,
        errorDescription: (replyError as any)?.response?.description,
      });

      // Try to send error message to user
      try {
        await ctx.reply(
          '❌ Сталася помилка при відправці повідомлення. Будь ласка, спробуйте ще раз.'
        );
      } catch (errorReplyError) {
        logger.error('❌ Failed to send error message to user', {
          error:
            errorReplyError instanceof Error ? errorReplyError.message : String(errorReplyError),
        });
      }

      throw replyError; // Re-throw to be caught by outer try-catch
    }

    logger.info('Start command completed', {
      userId: ctx.from?.id,
      totalTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Error in start handler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      errorType: error?.constructor?.name,
    });

    // Try to send error message to user
    try {
      await ctx.reply(
        '❌ Сталася помилка. Будь ласка, спробуйте пізніше або зверніться до підтримки.'
      );
    } catch (errorReplyError) {
      logger.error('❌ Failed to send error message in catch block', {
        error: errorReplyError instanceof Error ? errorReplyError.message : String(errorReplyError),
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
