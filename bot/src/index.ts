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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const USE_WEBHOOK = !!WEBHOOK_URL;

// Log environment check
logger.info('Environment check:', {
  hasBotToken: !!TELEGRAM_BOT_TOKEN,
  hasWebhookUrl: !!WEBHOOK_URL,
  webhookUrl: WEBHOOK_URL || 'NOT SET',
  port: PORT,
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  useWebhook: USE_WEBHOOK,
});

if (!TELEGRAM_BOT_TOKEN) {
  logger.error('❌ TELEGRAM_BOT_TOKEN is not set in environment variables');
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

const bot = new Telegraf<BotContext>(TELEGRAM_BOT_TOKEN);

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
      '👋 Будь ласка, використайте /start, щоб почати.\n\n' +
        'Якщо у вас є ID сесії, використайте:\n' +
        '/start <ваш_id_сесії>'
    );
  }
});

// Handle other message types
bot.on('message', async ctx => {
  await ctx.reply(
    '📝 Будь ласка, надсилайте тільки текстові повідомлення.\n\n' +
      'Використайте /start, щоб почати, або /help для отримання додаткової інформації.'
  );
});

// Launch bot
async function startBot() {
  try {
    // Log startup information
    logger.info('🚀 Bot starting...', {
      nodeEnv: process.env.NODE_ENV,
      useWebhook: USE_WEBHOOK,
      webhookUrl: WEBHOOK_URL || 'NOT SET',
      botToken: TELEGRAM_BOT_TOKEN ? `${TELEGRAM_BOT_TOKEN.substring(0, 10)}...` : 'NOT SET',
      port: PORT,
      apiUrl: process.env.API_URL || 'NOT SET',
    });

    logger.info('✅ Bot instance created successfully');

    if (USE_WEBHOOK) {
      // Webhook mode for production
      logger.info(`Starting bot in webhook mode: ${WEBHOOK_URL}`);

      if (!WEBHOOK_URL) {
        logger.error('❌ TELEGRAM_WEBHOOK_URL is not set! Cannot start in webhook mode.');
        process.exit(1);
      }

      // Bot token already checked at startup, but double-check
      if (!TELEGRAM_BOT_TOKEN) {
        logger.error('❌ TELEGRAM_BOT_TOKEN is not set! Cannot start bot.');
        process.exit(1);
      }

      logger.info('✅ All environment variables validated');

      // Create Express app for webhook
      const app = express();
      app.use(express.json());

      // Health check endpoint
      app.get('/health', (_req, res) => {
        res.json({ status: 'ok', mode: 'webhook' });
      });

      // Webhook endpoint - use webhookCallback for proper request handling
      app.post('/webhook', async (req, res) => {
        const startTime = Date.now();
        const updateId = req.body?.update_id;

        try {
          logger.info('📥 Webhook received', {
            updateId,
            message: req.body?.message?.text,
            command: req.body?.message?.entities?.[0]?.type,
            userId: req.body?.message?.from?.id,
            timestamp: new Date().toISOString(),
          });

          await bot.handleUpdate(req.body);

          const processingTime = Date.now() - startTime;
          logger.info('✅ Webhook processed successfully', {
            updateId,
            processingTime: `${processingTime}ms`,
          });

          res.sendStatus(200);
        } catch (error) {
          const processingTime = Date.now() - startTime;
          logger.error('❌ Error handling webhook update', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            updateId,
            body: req.body,
            processingTime: `${processingTime}ms`,
          });
          res.sendStatus(200); // Always return 200 to Telegram to avoid retries
        }
      });

      // Start Express server
      app.listen(PORT, async () => {
        logger.info(`✅ Webhook server listening on port ${PORT}`);
        logger.info(`✅ Health endpoint available at: http://0.0.0.0:${PORT}/health`);

        // Delete existing webhook first to avoid conflicts, then set new one
        try {
          await bot.telegram.deleteWebhook({ drop_pending_updates: false });
          logger.info('Deleted existing webhook (if any)');
        } catch (error) {
          logger.warn('Failed to delete existing webhook (may not exist)', error);
        }

        // Set webhook URL
        try {
          logger.info(`Setting webhook to: ${WEBHOOK_URL}`);
          const webhookInfo = await bot.telegram.setWebhook(WEBHOOK_URL);
          logger.info(`✅ Webhook set successfully!`, {
            webhookUrl: WEBHOOK_URL,
            result: webhookInfo,
          });

          // Verify webhook was set correctly
          const webhookStatus = await bot.telegram.getWebhookInfo();
          logger.info(`Webhook status:`, {
            url: webhookStatus.url,
            pendingUpdateCount: webhookStatus.pending_update_count,
            lastErrorDate: webhookStatus.last_error_date,
            lastErrorMessage: webhookStatus.last_error_message,
          });
        } catch (error) {
          logger.error('❌ Failed to set webhook', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            webhookUrl: WEBHOOK_URL,
          });
          throw error;
        }

        // Check backend API availability (non-blocking)
        const apiUrl = process.env.API_URL || 'http://localhost:3000';
        logger.info(`Checking backend API availability at: ${apiUrl}`);
        apiClient
          .healthCheck()
          .then(isAvailable => {
            if (isAvailable) {
              logger.info('✅ Backend API is available');
            } else {
              logger.warn('⚠️ Backend API is not available - some features may not work');
              logger.warn(`Backend URL: ${apiUrl}`);
              logger.warn(
                'This is normal if backend is still starting up. Bot will continue to work.'
              );
              logger.warn(
                'To fix: Set API_URL environment variable in Railway to your backend URL'
              );
            }
          })
          .catch(err => {
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

// Start bot with error handling
startBot().catch(error => {
  logger.error('❌ Fatal error starting bot:', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});

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
