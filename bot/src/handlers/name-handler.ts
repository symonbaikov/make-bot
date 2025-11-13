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
        '❌ Please start the conversation with /start command first.'
      );
      return;
    }

    if (!ctx.session.waitingForFirstName) {
      return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Please send a valid first name.');
      return;
    }

    const firstName = normalizeName(messageText);

    // Validate first name
    if (!isValidName(firstName)) {
      await ctx.reply(
        '❌ Invalid first name format. Please use only letters, spaces, hyphens, and apostrophes.\n\n' +
        'Example: John, Maria, Jean-Pierre'
      );
      return;
    }

    // Store first name in session
    ctx.session.firstName = firstName;
    ctx.session.waitingForFirstName = false;
    ctx.session.waitingForLastName = true;

    await ctx.reply(
      `✅ First name received!\n\n` +
      `👤 First name: ${firstName}\n\n` +
      `Now, please provide your last name:`
    );

    logger.info('First name collected', {
      sessionId: ctx.session.sessionId,
      firstName,
      userId: ctx.from?.id,
    });
  } catch (error) {
    logger.error('Error in first name handler', error);
    await ctx.reply(
      '❌ An error occurred while processing your first name. Please try again.'
    );
  }
}

export async function handleLastNameInput(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply(
        '❌ Please start the conversation with /start command first.'
      );
      return;
    }

    if (!ctx.session.waitingForLastName) {
      return;
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!messageText) {
      await ctx.reply('❌ Please send a valid last name.');
      return;
    }

    const lastName = normalizeName(messageText);

    // Validate last name
    if (!isValidName(lastName)) {
      await ctx.reply(
        '❌ Invalid last name format. Please use only letters, spaces, hyphens, and apostrophes.\n\n' +
        'Example: Smith, Garcia, O\'Connor'
      );
      return;
    }

    // Store last name in session
    ctx.session.lastName = lastName;
    ctx.session.waitingForLastName = false;
    ctx.session.waitingForPhoneNumber = true;

    await ctx.reply(
      `✅ Last name received!\n\n` +
      `👤 Last name: ${lastName}\n\n` +
      `Now, please provide your phone number (international format with +):\n\n` +
      `Example: +1234567890, +79123456789`
    );

    logger.info('Last name collected', {
      sessionId: ctx.session.sessionId,
      lastName,
      userId: ctx.from?.id,
    });
  } catch (error) {
    logger.error('Error in last name handler', error);
    await ctx.reply(
      '❌ An error occurred while processing your last name. Please try again.'
    );
  }
}

