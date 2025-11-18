import { BotContext } from '../middleware/session-middleware';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone-validator';
import { apiClient } from '../utils/api-client';
import { getPayPalPaymentUrl } from '../utils/paypal';
import { logger } from '../utils/logger';

export async function handlePhoneNumberInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply(
        '❌ Будь ласка, спочатку почніть розмову командою /start.'
      );
      return;
    }

    if (!ctx.session.waitingForPhoneNumber) {
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
      await ctx.reply('❌ Будь ласка, надішліть валідний номер телефону.');
      return;
    }

    const phoneNumber = normalizePhoneNumber(messageText);

    // Validate phone number
    if (!isValidPhoneNumber(phoneNumber)) {
      await ctx.reply(
        '❌ Невірний формат номера телефону. Будь ласка, надайте валідний номер телефону.\n\n' +
        'Приклади:\n' +
        '• +380123456789\n' +
        '• +79123456789\n' +
        '• +441234567890'
      );
      return;
    }

    // Store phone number in session
    ctx.session.phoneNumber = phoneNumber;
    ctx.session.waitingForPhoneNumber = false;

    // Show processing message
    await ctx.reply('⏳ Обробляю вашу інформацію...');

    // Send all data to backend API
    try {
      const tgUserId = ctx.from?.id?.toString();
      if (!tgUserId) {
        throw new Error('Telegram user ID is missing');
      }

      await apiClient.sendBotWebhook({
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
        `✅ Вся інформація отримана та збережена!\n\n` +
        `📧 Email: ${ctx.session.email}\n` +
        `👤 Ім'я: ${ctx.session.firstName || ''} ${ctx.session.lastName || ''}\n` +
        `📱 Телефон: ${ctx.session.phoneNumber}\n` +
        `📋 ID сесії: ${ctx.session.sessionId}\n` +
        `💰 План: ${ctx.session.plan}\n` +
        `💵 Сума: $${ctx.session.amount}\n\n` +
        `🔗 Посилання на оплату:\n${paypalUrl}\n\n` +
        `Будь ласка, завершіть оплату, використовуючи посилання вище.`
      );

      // Clear session after successful processing
      ctx.session = {};
    } catch (error) {
      logger.error('Failed to send data to backend', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await ctx.reply(
        `❌ Не вдалося обробити вашу інформацію.\n\n` +
        `Помилка: ${errorMessage}\n\n` +
        `Будь ласка, спробуйте ще раз або зверніться до підтримки.`
      );

      // Reset waiting state to allow retry
      ctx.session.waitingForPhoneNumber = true;
    }
  } catch (error) {
    logger.error('Error in phone number handler', error);
    await ctx.reply(
      '❌ Сталася помилка під час обробки вашого номера телефону. Будь ласка, спробуйте ще раз.'
    );
  }
}

