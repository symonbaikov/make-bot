import { BotContext } from '../middleware/session-middleware';
import { isValidEmail, normalizeEmail } from '../utils/email-validator';
import { logger } from '../utils/logger';

export async function handleEmailInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply('❌ Будь ласка, спочатку почніть розмову командою /start.');
      return;
    }

    if (!ctx.session.waitingForEmail) {
      // Not waiting for email - ignore
      return;
    }

    if (!ctx.session.sessionId) {
      await ctx.reply(
        '❌ Відсутній ID сесії. Будь ласка, використайте команду /start з вашим ID сесії.'
      );
      return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Будь ласка, надішліть валідну адресу електронної пошти.');
      return;
    }

    const email = normalizeEmail(messageText);

    // Validate email
    if (!isValidEmail(email)) {
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

    await ctx.reply(
      `✅ Email отримано!\n\n` + `📧 Email: ${email}\n\n` + `Тепер, будь ласка, надайте ваше ім'я:`
    );
  } catch (error) {
    logger.error('Error in email handler', error);
    await ctx.reply(
      '❌ Сталася помилка під час обробки вашого email. Будь ласка, спробуйте ще раз.'
    );
  }
}
