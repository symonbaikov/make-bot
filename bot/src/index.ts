import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { sessionMiddleware, BotContext } from './middleware/session-middleware';
import { handleStart } from './handlers/start-handler';
import { handleEmailInput } from './handlers/email-handler';
import { handleHelp } from './handlers/help-handler';
import { handleError } from './handlers/error-handler';
import { logger } from './utils/logger';
import { apiClient } from './utils/api-client';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Session middleware
bot.use(sessionMiddleware());

// Error handling
bot.catch((err, ctx) => {
  logger.error('Bot error caught', err);
  handleError(ctx, err);
});

// Commands
bot.start(handleStart);
bot.help(handleHelp);

// Text messages (email input)
bot.on('text', async ctx => {
  // Check if user is waiting for email
  if (ctx.session?.waitingForEmail) {
    await handleEmailInput(ctx);
  } else {
    // If not waiting for email, suggest using /start
    await ctx.reply(
      '👋 Please use /start to begin.\n\n' +
        'If you have a session ID, use:\n' +
        '/start <your_session_id>'
    );
  }
});

// Handle other message types
bot.on('message', async ctx => {
  await ctx.reply(
    '📝 Please send text messages only.\n\n' + 'Use /start to begin or /help for more information.'
  );
});

// Launch bot
bot
  .launch()
  .then(() => {
    logger.info('Telegram bot started successfully');

    // Check backend API availability
    apiClient.healthCheck().then(isAvailable => {
      if (isAvailable) {
        logger.info('Backend API is available');
      } else {
        logger.warn('Backend API is not available - some features may not work');
      }
    });
  })
  .catch(error => {
    logger.error('Failed to start bot', error);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  logger.info('Shutting down bot...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  logger.info('Shutting down bot...');
  bot.stop('SIGTERM');
  process.exit(0);
});
