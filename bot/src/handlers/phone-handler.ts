import { BotContext } from '../middleware/session-middleware';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/phone-validator';
import { apiClient } from '../utils/api-client';
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

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Будь ласка, надішліть валідний номер телефону.');
      return;
    }

    const phoneNumber = normalizePhoneNumber(messageText);

    // Validate phone number (accept any non-empty string)
    if (!isValidPhoneNumber(phoneNumber)) {
      await ctx.reply('❌ Будь ласка, введіть номер телефону.');
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

      if (!ctx.session.email) {
        throw new Error('Email is missing');
      }

      // Generate session ID only when sending to webhook (backend requires it)
      const sessionId = `tg-${tgUserId}-${Date.now()}`;

      await apiClient.sendBotWebhook({
        sessionId: sessionId,
        email: ctx.session.email,
        tgUserId: tgUserId,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        phoneNumber: ctx.session.phoneNumber,
        plan: ctx.session.plan || 'STANDARD',
        amount: ctx.session.amount || 99.99,
      });

      logger.info('User data sent to backend successfully', {
        sessionId: sessionId,
        email: ctx.session.email,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        phoneNumber: ctx.session.phoneNumber,
        userId: tgUserId,
      });

      await ctx.reply(
        `✅ Дякуємо! Ваша інформація отримана та збережена.\n\n` +
        `📧 Email: ${ctx.session.email}\n` +
        `👤 Ім'я: ${ctx.session.firstName || ''} ${ctx.session.lastName || ''}\n` +
        `📱 Телефон: ${ctx.session.phoneNumber}\n\n` +
        `Ви можете повернутися на сторінку для завершення оплати.\n\n` +
        `Я надішлю доступ до вашого тарифу на курс одразу після оплати.`
      );

      // Clear session after successful processing
      ctx.session = {};
    } catch (error) {
      logger.error('Failed to send data to backend', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Невідома помилка';
      
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

