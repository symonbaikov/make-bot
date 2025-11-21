import { Telegraf } from 'telegraf';
import express from 'express';
import dotenv from 'dotenv';
import { sessionMiddleware, BotContext } from './middleware/session-middleware';
import { handleStart } from './handlers/start-handler';
import { handleEmailInput } from './handlers/email-handler';
import { handleFirstNameInput, handleLastNameInput } from './handlers/name-handler';
import { handlePhoneNumberInput } from './handlers/phone-handler';
import { handleHelp } from './handlers/help-handler';
import { handleError } from './handlers/error-handler';
import { logger } from './utils/logger';
import { apiClient } from './utils/api-client';
import { initSentry } from './utils/sentry';

dotenv.config();

// Initialize Sentry BEFORE bot initialization
initSentry();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const USE_WEBHOOK = !!WEBHOOK_URL;

if (!BOT_TOKEN) {
  logger.error('TELEGRAM_BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

// In production, webhook is required
// But allow fallback to polling if explicitly disabled via env var
if (IS_PRODUCTION && !WEBHOOK_URL && process.env.ALLOW_POLLING_IN_PRODUCTION !== 'true') {
  logger.error(
    'TELEGRAM_WEBHOOK_URL is required in production environment. ' +
      'Please set TELEGRAM_WEBHOOK_URL environment variable. ' +
      'Or set ALLOW_POLLING_IN_PRODUCTION=true to use polling mode (not recommended).'
  );
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

// Text messages (data collection)
bot.on('text', async ctx => {
  // Check what data we're waiting for
  if (ctx.session?.waitingForEmail) {
    await handleEmailInput(ctx);
  } else if (ctx.session?.waitingForFirstName) {
    await handleFirstNameInput(ctx);
  } else if (ctx.session?.waitingForLastName) {
    await handleLastNameInput(ctx);
  } else if (ctx.session?.waitingForPhoneNumber) {
    await handlePhoneNumberInput(ctx);
  } else {
    // If not waiting for any data, suggest using /start
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
async function startBot() {
  try {
    if (USE_WEBHOOK) {
      // Webhook mode for production
      logger.info(`Starting bot in webhook mode: ${WEBHOOK_URL}`);

      // Create Express app for webhook
      const app = express();
      app.use(express.json());

      // Health check endpoint
      app.get('/health', (_req, res) => {
        res.json({ status: 'ok', mode: 'webhook' });
      });

      // Webhook endpoint - use webhookCallback for proper request handling
      app.post('/webhook', async (req, res) => {
        try {
          await bot.handleUpdate(req.body);
          res.sendStatus(200);
        } catch (error) {
          logger.error('Error handling webhook update', error);
          res.sendStatus(200); // Always return 200 to Telegram to avoid retries
        }
      });

      // Start Express server
      app.listen(PORT, async () => {
        logger.info(`Webhook server listening on port ${PORT}`);

        // Delete existing webhook first to avoid conflicts, then set new one
        try {
          await bot.telegram.deleteWebhook({ drop_pending_updates: false });
          logger.info('Deleted existing webhook (if any)');
        } catch (error) {
          logger.warn('Failed to delete existing webhook (may not exist)', error);
        }

        // Set webhook URL
        try {
          await bot.telegram.setWebhook(WEBHOOK_URL);
          logger.info(`Webhook set to: ${WEBHOOK_URL}`);
        } catch (error) {
          logger.error('Failed to set webhook', error);
          throw error;
        }

        // Check backend API availability (non-blocking)
        const apiUrl = process.env.API_URL || 'http://localhost:3000';
        logger.info(`Checking backend API availability at: ${apiUrl}`);
        apiClient.healthCheck().then(isAvailable => {
          if (isAvailable) {
            logger.info('✅ Backend API is available');
          } else {
            logger.warn('⚠️ Backend API is not available - some features may not work');
            logger.warn(`Backend URL: ${apiUrl}`);
            logger.warn('This is normal if backend is still starting up. Bot will continue to work.');
            logger.warn('To fix: Set API_URL environment variable in Railway to your backend URL');
          }
        }).catch(err => {
          logger.warn('Failed to check backend API availability', err);
        });
      });
    } else {
      // Polling mode for development only
      if (IS_PRODUCTION) {
        logger.error(
          'Polling mode cannot be used in production. ' +
            'Please set TELEGRAM_WEBHOOK_URL environment variable.'
        );
        process.exit(1);
      }

      logger.info('Starting bot in polling mode (development only)');

      // Delete any existing webhook before starting polling to avoid conflicts
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        logger.info('Deleted existing webhook before starting polling');
      } catch (error) {
        logger.warn('Failed to delete webhook (may not exist)', error);
      }

      await bot.launch();
      logger.info('Telegram bot started successfully (polling mode)');

      // Check backend API availability
      apiClient.healthCheck().then(isAvailable => {
        if (isAvailable) {
          logger.info('Backend API is available');
        } else {
          logger.warn('Backend API is not available - some features may not work');
        }
      });
    }
  } catch (error: any) {
    // Handle specific Telegram API errors
    if (error?.response?.error_code === 409) {
      logger.error(
        'Telegram API Error 409: Conflict - Another bot instance is running.\n' +
          'This usually means:\n' +
          '1. Another instance of the bot is using polling mode\n' +
          '2. A webhook is already set and conflicting with polling\n' +
          'Solution: Make sure only one bot instance is running, or use webhook mode in production.'
      );
    } else {
      logger.error('Failed to start bot', error);
    }
    process.exit(1);
  }
}

startBot();

// Graceful shutdown
process.once('SIGINT', async () => {
  logger.info('Shutting down bot...');
  if (USE_WEBHOOK) {
    await bot.telegram.deleteWebhook();
    logger.info('Webhook deleted');
  } else {
    bot.stop('SIGINT');
  }
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Shutting down bot...');
  if (USE_WEBHOOK) {
    await bot.telegram.deleteWebhook();
    logger.info('Webhook deleted');
  } else {
    bot.stop('SIGTERM');
  }
  process.exit(0);
});
