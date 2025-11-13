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

    // Show processing message
    await ctx.reply('⏳ Processing your email...');

    // Send data to backend API
    try {
      const tgUserId = ctx.from?.id?.toString();
      if (!tgUserId) {
        throw new Error('Telegram user ID is missing');
      }

      const result = await apiClient.sendBotWebhook({
        sessionId: ctx.session.sessionId,
        email: email,
        tgUserId: tgUserId,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        plan: ctx.session.plan || 'STANDARD',
        amount: ctx.session.amount || 99.99,
      });

      logger.info('Email sent to backend successfully', {
        sessionId: ctx.session.sessionId,
        email,
        userId: tgUserId,
      });

      // Generate PayPal link
      const paypalUrl = getPayPalPaymentUrl({
        sessionId: ctx.session.sessionId,
        plan: ctx.session.plan || 'STANDARD',
        amount: ctx.session.amount || 99.99,
        currency: ctx.session.currency,
      });

      await ctx.reply(
        `✅ Email received and saved!\n\n` +
        `📧 Email: ${email}\n` +
        `📋 Session ID: ${ctx.session.sessionId}\n` +
        `💰 Plan: ${ctx.session.plan}\n` +
        `💵 Amount: $${ctx.session.amount}\n\n` +
        `🔗 Payment Link:\n${paypalUrl}\n\n` +
        `Please complete your payment using the link above.`
      );

      // Clear session after successful processing
      ctx.session = {};
    } catch (error) {
      logger.error('Failed to send email to backend', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await ctx.reply(
        `❌ Failed to process your email.\n\n` +
        `Error: ${errorMessage}\n\n` +
        `Please try again or contact support.`
      );

      // Reset waiting state to allow retry
      ctx.session.waitingForEmail = true;
    }
  } catch (error) {
    logger.error('Error in email handler', error);
    await ctx.reply(
      '❌ An error occurred while processing your email. Please try again.'
    );
  }
}

