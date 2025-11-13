import { BotContext } from '../middleware/session-middleware';
import { isValidEmail, normalizeEmail } from '../utils/email-validator';
import { apiClient } from '../utils/api-client';
import { getPayPalPaymentUrl } from '../utils/paypal';
import { logger } from '../utils/logger';

export async function handleEmailInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply(
        '❌ Please start the conversation with /start command first.'
      );
      return;
    }

    if (!ctx.session.waitingForEmail) {
      // Not waiting for email - ignore
      return;
    }

    if (!ctx.session.sessionId) {
      await ctx.reply(
        '❌ Session ID is missing. Please use /start command with your session ID.'
      );
      return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Please send a valid email address.');
      return;
    }

    const email = normalizeEmail(messageText);

    // Validate email
    if (!isValidEmail(email)) {
      await ctx.reply(
        '❌ Invalid email format. Please send a valid email address.\n\n' +
        'Example: user@example.com'
      );
      return;
    }

    // Store email in session
    ctx.session.email = email;
    ctx.session.waitingForEmail = false;
    ctx.session.waitingForFirstName = true;

    await ctx.reply(
      `✅ Email received!\n\n` +
      `📧 Email: ${email}\n\n` +
      `Now, please provide your first name:`
    );
  } catch (error) {
    logger.error('Error in email handler', error);
    await ctx.reply(
      '❌ An error occurred while processing your email. Please try again.'
    );
  }
}

