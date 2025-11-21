import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';
import { apiClient } from '../utils/api-client';

/**
 * Validate name (should contain only letters, spaces, hyphens)
 */
function isValidName(name: string): boolean {
  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-']+$/;
  return nameRegex.test(name.trim()) && name.trim().length >= 2 && name.trim().length <= 50;
}

/**
 * Normalize name (trim and capitalize first letter)
 */
function normalizeName(name: string): string {
  return name.trim().split(' ').map(word => {
    if (word.length === 0) return '';
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

export async function handleFirstNameInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply(
        '❌ Будь ласка, спочатку почніть розмову командою /start.'
      );
      return;
    }

    if (!ctx.session.waitingForFirstName) {
      return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Будь ласка, надішліть валідне ім\'я.');
      return;
    }

    const firstName = normalizeName(messageText);

    // Validate first name
    if (!isValidName(firstName)) {
      await ctx.reply(
        '❌ Невірний формат імені. Будь ласка, використовуйте тільки літери, пробіли, дефіси та апострофи.\n\n' +
        'Приклад: Іван, Марія, Жан-П\'єр'
      );
      return;
    }

    // Store first name in session
    ctx.session.firstName = firstName;
    ctx.session.waitingForFirstName = false;
    ctx.session.waitingForLastName = true;

    await ctx.reply(
      `✅ Ім'я отримано!\n\n` +
      `👤 Ім'я: ${firstName}\n\n` +
      `Тепер, будь ласка, надайте ваше прізвище:`
    );

    logger.info('First name collected', {
      sessionId: ctx.session.sessionId,
      firstName,
      userId: ctx.from?.id,
    });
  } catch (error) {
    logger.error('Error in first name handler', error);
    await ctx.reply(
      '❌ Сталася помилка під час обробки вашого імені. Будь ласка, спробуйте ще раз.'
    );
  }
}

export async function handleLastNameInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply(
        '❌ Будь ласка, спочатку почніть розмову командою /start.'
      );
      return;
    }

    if (!ctx.session.waitingForLastName) {
      return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Будь ласка, надішліть валідне прізвище.');
      return;
    }

    const lastName = normalizeName(messageText);

    // Validate last name
    if (!isValidName(lastName)) {
      await ctx.reply(
        '❌ Невірний формат прізвища. Будь ласка, використовуйте тільки літери, пробіли, дефіси та апострофи.\n\n' +
        'Приклад: Іванов, Гарсія, О\'Коннор'
      );
      return;
    }

    // Store last name in session
    ctx.session.lastName = lastName;
    ctx.session.waitingForLastName = false;

    // Show processing message
    await ctx.reply('⏳ Обробляю вашу інформацію...');

    // Send all data to backend API
    try {
      const tgUserId = ctx.from?.id?.toString();
      if (!tgUserId) {
        throw new Error('Telegram user ID is missing');
      }

      if (!ctx.session.sessionId) {
        throw new Error('Session ID is missing');
      }

      if (!ctx.session.email) {
        throw new Error('Email is missing');
      }

      await apiClient.sendBotWebhook({
        sessionId: ctx.session.sessionId,
        email: ctx.session.email,
        tgUserId: tgUserId,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        plan: ctx.session.plan || 'STANDARD',
        amount: ctx.session.amount || 99.99,
      });

      logger.info('User data sent to backend successfully', {
        sessionId: ctx.session.sessionId,
        email: ctx.session.email,
        firstName: ctx.session.firstName,
        lastName: ctx.session.lastName,
        userId: tgUserId,
      });

      await ctx.reply(
        `✅ Дякуємо! Ваша інформація отримана та збережена.\n\n` +
        `📧 Email: ${ctx.session.email}\n` +
        `👤 Ім'я: ${ctx.session.firstName || ''} ${ctx.session.lastName || ''}\n\n` +
        `Ми зв'яжемося з вами найближчим часом.`
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
      ctx.session.waitingForLastName = true;
    }

    logger.info('Last name collected', {
      sessionId: ctx.session.sessionId,
      lastName,
      userId: ctx.from?.id,
    });
  } catch (error) {
    logger.error('Error in last name handler', error);
    await ctx.reply(
      '❌ Сталася помилка під час обробки вашого прізвища. Будь ласка, спробуйте ще раз.'
    );
  }
}

