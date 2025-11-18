import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';

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
    ctx.session.waitingForPhoneNumber = true;

    await ctx.reply(
      `✅ Прізвище отримано!\n\n` +
      `👤 Прізвище: ${lastName}\n\n` +
      `Тепер, будь ласка, надайте ваш номер телефону (міжнародний формат з +):\n\n` +
      `Приклад: +380123456789, +79123456789`
    );

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

