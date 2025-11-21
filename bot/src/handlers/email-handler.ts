import { BotContext } from '../middleware/session-middleware';
import { isValidEmail, normalizeEmail } from '../utils/email-validator';
import { logger } from '../utils/logger';

import { BotContext } from '../middleware/session-middleware';
import { isValidEmail, normalizeEmail } from '../utils/email-validator';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export async function handleEmailInput(ctx: BotContext): Promise<void> {
  try {
    const startTime = Date.now();
    logger.info('Email input received', {
      userId: ctx.from?.id,
      hasSession: !!ctx.session,
      waitingForEmail: ctx.session?.waitingForEmail,
      timestamp: new Date().toISOString(),
    });

    if (!ctx.session) {
      logger.warn('No session found, initializing new session');
      ctx.session = {};
    }

    if (!ctx.session.waitingForEmail) {
      // Not waiting for email - ignore silently or suggest /start
      logger.debug('Not waiting for email, ignoring message');
      return;
    }

    // Generate session ID if not present (shouldn't happen, but safety check)
    if (!ctx.session.sessionId) {
      const tgUserId = ctx.from?.id?.toString() || 'unknown';
      ctx.session.sessionId = `tg-${tgUserId}-${uuidv4()}`;
      logger.info('Generated session ID for email handler', {
        sessionId: ctx.session.sessionId,
        userId: ctx.from?.id,
      });
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Будь ласка, надішліть валідну адресу електронної пошти.');
      return;
    }

    const email = normalizeEmail(messageText);

    // Validate email
    if (!isValidEmail(email)) {
      logger.warn('Invalid email format', { email, userId: ctx.from?.id });
      await ctx.reply(
        '❌ Невірний формат email. Будь ласка, надішліть валідну адресу електронної пошти.\n\n' +
          'Приклад: user@example.com'
      );
      return;
    }

    // Store email in session
    ctx.session.email = email;
    ctx.session.waitingForEmail = false;
    ctx.session.waitingForFirstName = true;

    logger.info('Email collected successfully', {
      email,
      sessionId: ctx.session.sessionId,
      userId: ctx.from?.id,
      processingTime: Date.now() - startTime,
    });

    await ctx.reply(
      `✅ Email отримано!\n\n` +
        `📧 Email: ${email}\n\n` +
        `Тепер, будь ласка, надайте ваше ім'я:`
    );
  } catch (error) {
    logger.error('Error in email handler', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.from?.id,
    });
    await ctx.reply(
      '❌ Сталася помилка під час обробки вашого email. Будь ласка, спробуйте ще раз.'
    );
  }
}
