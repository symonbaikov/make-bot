import { BotContext } from '../middleware/session-middleware';
import { logger } from '../utils/logger';

// Plan configuration with Ukrainian names and prices
const PLAN_CONFIG = {
  BASIC: {
    name: 'Базовий',
    amount: 64,
  },
  STANDARD: {
    name: 'Стандарт',
    amount: 97,
  },
  PREMIUM: {
    name: 'Преміум',
    amount: 147,
  },
} as const;

export async function handlePlanSelection(ctx: BotContext): Promise<void> {
  try {
    if (!ctx.session) {
      await ctx.reply('❌ Будь ласка, спочатку почніть розмову командою /start.');
      return;
    }

    if (!ctx.session.waitingForPlan) {
      return;
    }

    // Get plan from callback data
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      logger.warn('Callback query without data', {
        userId: ctx.from?.id,
      });
      await ctx.answerCbQuery('❌ Невірний вибір тарифу. Будь ласка, спробуйте ще раз.');
      return;
    }

    const callbackData = ctx.callbackQuery.data;
    if (!callbackData || !callbackData.startsWith('plan:')) {
      logger.warn('Invalid plan selection callback data', {
        callbackData,
        userId: ctx.from?.id,
      });
      await ctx.answerCbQuery('❌ Невірний вибір тарифу. Будь ласка, спробуйте ще раз.');
      return;
    }

    const planType = callbackData.replace('plan:', '') as 'BASIC' | 'STANDARD' | 'PREMIUM';

    // Validate plan type
    if (!['BASIC', 'STANDARD', 'PREMIUM'].includes(planType)) {
      logger.warn('Invalid plan type', {
        planType,
        userId: ctx.from?.id,
      });
      await ctx.answerCbQuery('❌ Невірний тариф. Будь ласка, виберіть один з доступних тарифів.');
      return;
    }

    const planConfig = PLAN_CONFIG[planType];

    // Store plan in session
    ctx.session.plan = planType;
    ctx.session.amount = planConfig.amount;
    ctx.session.currency = 'GBP'; // Set currency to GBP
    ctx.session.waitingForPlan = false;
    ctx.session.waitingForEmail = true;

    logger.info('Plan selected', {
      plan: planType,
      amount: planConfig.amount,
      userId: ctx.from?.id,
    });

    // Answer callback query
    await ctx.answerCbQuery(`✅ Вибрано тариф: ${planConfig.name}`);

    // Send confirmation and request email
    const emailRequestMessage =
      `✅ Тариф вибрано: **${planConfig.name}**\n\n` +
      `💰 Вартість: ${planConfig.amount} GBP\n\n` +
      `Тепер, будь ласка, надайте вашу адресу електронної пошти:\n\n` +
      `📧 Будь ласка, надішліть мені вашу адресу електронної пошти:`;

    await ctx.reply(emailRequestMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in plan selection handler', error);
    try {
      await ctx.answerCbQuery('❌ Сталася помилка. Будь ласка, спробуйте ще раз.');
      await ctx.reply(
        '❌ Сталася помилка під час обробки вашого вибору. Будь ласка, спробуйте ще раз або використайте /start.'
      );
    } catch (replyError) {
      logger.error('Failed to send error message in plan handler', replyError);
    }
  }
}

/**
 * Get plan selection keyboard with Ukrainian names
 */
export function getPlanKeyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: '📦 Базовий',
          callback_data: 'plan:BASIC',
        },
      ],
      [
        {
          text: '⭐ Стандарт',
          callback_data: 'plan:STANDARD',
        },
      ],
      [
        {
          text: '💎 Преміум',
          callback_data: 'plan:PREMIUM',
        },
      ],
    ],
  };
}

/**
 * Get plan configuration
 */
export function getPlanConfig(plan: 'BASIC' | 'STANDARD' | 'PREMIUM') {
  return PLAN_CONFIG[plan];
}
