import { BotContext } from '../middleware/session-middleware';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone-validator';
import { apiClient } from '../utils/api-client';
import { getPayPalPaymentUrl } from '../utils/paypal';
import { logger } from '../utils/logger';

export async function handlePhoneNumberInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply(
        '❌ Please start the conversation with /start command first.'
      );
      return;
    }

    if (!ctx.session.waitingForPhoneNumber) {
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
      await ctx.reply('❌ Please send a valid phone number.');
      return;
    }

    const phoneNumber = normalizePhoneNumber(messageText);

    // Validate phone number
    if (!isValidPhoneNumber(phoneNumber)) {
      await ctx.reply(
        '❌ Invalid phone number format. Please provide a valid phone number.\n\n' +
        'Examples:\n' +
        '• +1234567890\n' +
        '• +79123456789\n' +
        '• +441234567890'
      );
      return;
    }

    // Store phone number in session
    ctx.session.phoneNumber = phoneNumber;
    ctx.session.waitingForPhoneNumber = false;

    // Show processing message
    await ctx.reply('⏳ Processing your information...');

    // Send all data to backend API
    try {
      const tgUserId = ctx.from?.id?.toString();
      if (!tgUserId) {
        throw new Error('Telegram user ID is missing');
      }

      const result = await apiClient.sendBotWebhook({
        sessionId: ctx.session.sessionId,
        email: ctx.session.email!,
        tgUserId: tgUserId,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        phoneNumber: ctx.session.phoneNumber,
        plan: ctx.session.plan || 'STANDARD',
        amount: ctx.session.amount || 99.99,
      });

      logger.info('All user data sent to backend successfully', {
        sessionId: ctx.session.sessionId,
        email: ctx.session.email,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        phoneNumber: ctx.session.phoneNumber,
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
        `✅ All information received and saved!\n\n` +
        `📧 Email: ${ctx.session.email}\n` +
        `👤 Name: ${ctx.session.firstName || ''} ${ctx.session.lastName || ''}\n` +
        `📱 Phone: ${ctx.session.phoneNumber}\n` +
        `📋 Session ID: ${ctx.session.sessionId}\n` +
        `💰 Plan: ${ctx.session.plan}\n` +
        `💵 Amount: $${ctx.session.amount}\n\n` +
        `🔗 Payment Link:\n${paypalUrl}\n\n` +
        `Please complete your payment using the link above.`
      );

      // Clear session after successful processing
      ctx.session = {};
    } catch (error) {
      logger.error('Failed to send data to backend', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await ctx.reply(
        `❌ Failed to process your information.\n\n` +
        `Error: ${errorMessage}\n\n` +
        `Please try again or contact support.`
      );

      // Reset waiting state to allow retry
      ctx.session.waitingForPhoneNumber = true;
    }
  } catch (error) {
    logger.error('Error in phone number handler', error);
    await ctx.reply(
      '❌ An error occurred while processing your phone number. Please try again.'
    );
  }
}

