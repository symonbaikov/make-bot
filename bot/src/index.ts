import { Telegraf } from 'telegraf';
import express from 'express';
import dotenv from 'dotenv';
import { sessionMiddleware, BotContext } from './middleware/session-middleware';
import { handleStart } from './handlers/start-handler';
import { handleEmailInput } from './handlers/email-handler';
import { handleFirstNameInput, handleLastNameInput } from './handlers/name-handler';
import { handlePhoneNumberInput } from './handlers/phone-handler';
import { handlePlanSelection } from './handlers/plan-handler';
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
const WEBHOOK_URL_PARSED = WEBHOOK_URL
  ? (() => {
      try {
        const parsed = new URL(WEBHOOK_URL);
        if (parsed.protocol !== 'https:') {
          logger.error('❌ TELEGRAM_WEBHOOK_URL must use HTTPS', { webhookUrl: WEBHOOK_URL });
          process.exit(1);
        }

        if (!parsed.pathname || parsed.pathname === '/') {
          logger.error(
            '❌ TELEGRAM_WEBHOOK_URL must include a path (e.g. https://example.com/webhook)',
            { webhookUrl: WEBHOOK_URL }
          );
          process.exit(1);
        }
        return parsed;
      } catch (error) {
        logger.error('❌ Invalid TELEGRAM_WEBHOOK_URL', {
          error: error instanceof Error ? error.message : String(error),
          webhookUrl: WEBHOOK_URL,
        });
        process.exit(1);
      }
    })()
  : null;
const WEBHOOK_PATH = WEBHOOK_URL_PARSED?.pathname || '/webhook';

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

interface WebhookStatus {
  url: string;
  pendingUpdates: number;
  lastError?: string;
  lastErrorDate?: number;
  maxConnections?: number;
  needsReset: boolean;
}

async function getWebhookStatus(): Promise<WebhookStatus> {
  const webhookInfo = await bot.telegram.getWebhookInfo();
  const needsReset =
    webhookInfo.url !== WEBHOOK_URL ||
    !!webhookInfo.last_error_message ||
    webhookInfo.pending_update_count > 0;

  return {
    url: webhookInfo.url || '',
    pendingUpdates: webhookInfo.pending_update_count,
    lastError: webhookInfo.last_error_message,
    lastErrorDate: webhookInfo.last_error_date,
    maxConnections: webhookInfo.max_connections,
    needsReset,
  };
}

async function ensureWebhook(reason: string): Promise<WebhookStatus> {
  if (!WEBHOOK_URL) {
    throw new Error('TELEGRAM_WEBHOOK_URL is not configured');
  }

  logger.info('Configuring Telegram webhook', {
    reason,
    webhookUrl: WEBHOOK_URL,
    path: WEBHOOK_PATH,
  });

  await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  await bot.telegram.setWebhook(WEBHOOK_URL, {
    drop_pending_updates: true,
  });

  const status = await getWebhookStatus();

  if (status.url !== WEBHOOK_URL) {
    throw new Error(
      `Webhook is not set correctly. Expected ${WEBHOOK_URL}, got ${status.url || 'empty'}`
    );
  }

  if (status.pendingUpdates > 0) {
    logger.warn('⚠️ Pending updates detected after webhook setup', {
      pendingUpdates: status.pendingUpdates,
    });
  }

  logger.info('✅ Webhook configured', {
    url: status.url,
    pendingUpdates: status.pendingUpdates,
    lastError: status.lastError,
    lastErrorDate: status.lastErrorDate,
  });

  return status;
}

// Session middleware - MUST be before handlers
bot.use(sessionMiddleware());

// Error handling - centralized error handler
bot.catch((err, ctx) => {
  logger.error('❌ Unhandled bot error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    update: ctx.update,
    userId: ctx.from?.id,
  });

  // Use centralized error handler
  handleError(ctx, err).catch(handleError => {
    logger.error('❌ Failed to handle error', {
      error: handleError instanceof Error ? handleError.message : String(handleError),
    });
  });
});

// Commands - wrapped in try-catch for safety
bot.start(async ctx => {
  const startTime = Date.now();
  const commandText = ctx.message?.text || '';
  const commandArgs = ctx.startPayload || '';

  logger.info('📥 /start command received in bot.start handler', {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    chatId: ctx.chat?.id,
    hasSession: !!ctx.session,
    commandText,
    commandArgs,
    messageId: ctx.message?.message_id,
    timestamp: new Date().toISOString(),
  });

  try {
    logger.info('🔄 Calling handleStart function', {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
    });

    await handleStart(ctx);

    const totalTime = Date.now() - startTime;
    logger.info('✅ /start command completed successfully', {
      userId: ctx.from?.id,
      totalTime: `${totalTime}ms`,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('❌ Error in start command wrapper', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      totalTime: `${totalTime}ms`,
      errorType: error?.constructor?.name,
    });

    // Try to send error message
    try {
      logger.info('🔄 Attempting to send error message to user', {
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
      });

      await ctx.reply(
        '❌ Сталася помилка при обробці команди /start. Будь ласка, спробуйте ще раз.'
      );

      logger.info('✅ Error message sent successfully', {
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
      });
    } catch (replyError) {
      logger.error('❌ Failed to send error message in start wrapper', {
        error: replyError instanceof Error ? replyError.message : String(replyError),
        stack: replyError instanceof Error ? replyError.stack : undefined,
        userId: ctx.from?.id,
        chatId: ctx.chat?.id,
      });
    }
  }
});

bot.help(async ctx => {
  try {
    await handleHelp(ctx);
  } catch (error) {
    logger.error('Error in help command', {
      error: error instanceof Error ? error.message : String(error),
      userId: ctx.from?.id,
    });
  }
});

// Handle callback queries (button clicks) - plan selection
bot.on('callback_query', async ctx => {
  try {
    // Type guard for callback query with data
    if (!('data' in ctx.callbackQuery)) {
      logger.warn('Callback query without data', {
        userId: ctx.from?.id,
        callbackQueryType: ctx.callbackQuery,
      });
      await ctx.answerCbQuery('❌ Невідома команда. Будь ласка, використайте /start.');
      return;
    }

    const callbackData = ctx.callbackQuery.data;

    logger.info('Callback query received', {
      callbackData,
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
    });

    // Handle plan selection
    if (callbackData && callbackData.startsWith('plan:')) {
      await handlePlanSelection(ctx);
    } else {
      logger.warn('Unknown callback query', {
        callbackData,
        userId: ctx.from?.id,
      });
      await ctx.answerCbQuery('❌ Невідома команда. Будь ласка, використайте /start.');
    }
  } catch (error) {
    logger.error('Error handling callback query', {
      error: error instanceof Error ? error.message : String(error),
      userId: ctx.from?.id,
    });
    try {
      await ctx.answerCbQuery('❌ Сталася помилка. Будь ласка, спробуйте ще раз.');
    } catch (replyError) {
      logger.error('Failed to answer callback query', replyError);
    }
  }
});

// Text messages (data collection)
bot.on('text', async ctx => {
  try {
    const messageText = ctx.message?.text || '';

    // Skip commands - they should be handled by command handlers (bot.start, bot.help)
    // Only handle /start as fallback if command handler didn't catch it
    if (messageText.trim().startsWith('/')) {
      if (
        messageText.trim().toLowerCase() === '/start' ||
        messageText.trim().toLowerCase().startsWith('/start ')
      ) {
        logger.info('📥 /start command detected in text handler (fallback)', {
          userId: ctx.from?.id,
          messageText,
          chatId: ctx.chat?.id,
        });
        await handleStart(ctx);
      }
      // Skip other commands - let them be handled by their handlers
      return;
    }

    // Check what data we're waiting for
    if (ctx.session?.waitingForPlan) {
      // User should select plan via button, not text
      await ctx.reply('👆 Будь ласка, оберіть тариф, натиснувши на одну з кнопок вище.');
    } else if (ctx.session?.waitingForEmail) {
      await handleEmailInput(ctx);
    } else if (ctx.session?.waitingForFirstName) {
      await handleFirstNameInput(ctx);
    } else if (ctx.session?.waitingForLastName) {
      await handleLastNameInput(ctx);
    } else if (ctx.session?.waitingForPhoneNumber) {
      await handlePhoneNumberInput(ctx);
    } else {
      // If not waiting for any data, suggest using /start
      await ctx.reply('👋 Будь ласка, використайте /start, щоб почати.');
    }
  } catch (error) {
    logger.error('Error handling text message', {
      error: error instanceof Error ? error.message : String(error),
      userId: ctx.from?.id,
    });
    // Don't rethrow - just log the error
  }
});

// Handle other message types (stickers, photos, etc.) - NOT text
bot.on('message', async ctx => {
  try {
    // Skip if this is a text message (already handled above)
    if ('text' in ctx.message) {
      return;
    }

    await ctx.reply(
      '📝 Будь ласка, надсилайте тільки текстові повідомлення.\n\n' +
        'Використайте /start, щоб почати, або /help для отримання додаткової інформації.'
    );
  } catch (error) {
    logger.error('Error handling non-text message', {
      error: error instanceof Error ? error.message : String(error),
      userId: ctx.from?.id,
    });
    // Don't rethrow - just log the error
  }
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

      // Log ALL incoming requests for debugging - MUST be first middleware
      app.use((req, _res, next) => {
        // Log immediately, before body parsing
        logger.info('📥 Incoming HTTP request (raw)', {
          method: req.method,
          path: req.path,
          url: req.url,
          originalUrl: req.originalUrl,
          headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            host: req.headers['host'],
          },
          bodySize: req.headers['content-length'],
          ip: req.ip,
          ips: req.ips,
        });
        next();
      });

      // Parse JSON body
      app.use(
        express.json({
          limit: '10mb', // Increase limit for large updates
          verify: (req, _res, buf) => {
            // Log raw body for debugging
            const path = req.url?.split('?')[0] || '/';
            if (path === WEBHOOK_PATH || path === '/') {
              try {
                const bodyStr = buf.toString('utf8');
                logger.info('📥 Raw webhook body received', {
                  path: path,
                  url: req.url,
                  bodyLength: bodyStr.length,
                  bodyPreview: bodyStr.substring(0, 200),
                  hasUpdateId: bodyStr.includes('update_id'),
                });
              } catch (err) {
                logger.warn('Failed to log raw body', { error: err });
              }
            }
          },
        })
      );

      // Log parsed body
      app.use((req, _res, next) => {
        if (req.path === WEBHOOK_PATH || req.path === '/') {
          logger.info('📥 Parsed webhook body', {
            method: req.method,
            path: req.path,
            hasBody: !!req.body,
            updateId: req.body?.update_id,
            messageText: req.body?.message?.text,
            userId: req.body?.message?.from?.id,
          });
        }
        next();
      });

      // Health check endpoint
      app.get('/health', (_req, res) => {
        res.json({ status: 'ok', mode: 'webhook', webhookPath: WEBHOOK_PATH });
      });

      // Root path handler - return bot info instead of 404
      app.get('/', (_req, res) => {
        res.json({
          status: 'ok',
          service: 'telegram-bot',
          mode: 'webhook',
          webhookPath: WEBHOOK_PATH,
          webhookUrl: WEBHOOK_URL,
          message: 'Telegram bot webhook endpoint. Use POST to send updates.',
        });
      });

      // Test endpoint to verify webhook is accessible and optionally refresh it
      app.get('/webhook-test', async (req, res) => {
        try {
          const shouldReset =
            String(
              (req.query?.reset ?? req.query?.fix ?? req.query?.refresh) || ''
            ).toLowerCase() === 'true';

          let webhookStatus = await getWebhookStatus();

          // Get full webhook info for debugging
          const fullWebhookInfo = await bot.telegram.getWebhookInfo();

          if (shouldReset || webhookStatus.needsReset) {
            try {
              webhookStatus = await ensureWebhook(
                shouldReset ? 'manual-webhook-test-reset' : 'auto-webhook-test-reset'
              );
            } catch (error) {
              logger.error('❌ Failed to refresh webhook from /webhook-test', {
                error: error instanceof Error ? error.message : String(error),
              });
              return res.status(500).json({
                status: 'error',
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          return res.json({
            status: 'ok',
            webhook: webhookStatus,
            fullWebhookInfo: {
              url: fullWebhookInfo.url,
              has_custom_certificate: fullWebhookInfo.has_custom_certificate,
              pending_update_count: fullWebhookInfo.pending_update_count,
              last_error_date: fullWebhookInfo.last_error_date,
              last_error_message: fullWebhookInfo.last_error_message,
              max_connections: fullWebhookInfo.max_connections,
              ip_address: fullWebhookInfo.ip_address,
            },
            expectedUrl: WEBHOOK_URL,
            path: WEBHOOK_PATH,
            reset: shouldReset,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          return res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      const resetWebhookHandler = async (_req: express.Request, res: express.Response) => {
        try {
          const webhookStatus = await ensureWebhook('manual-reset-endpoint');
          return res.json({
            status: 'ok',
            webhook: webhookStatus,
            expectedUrl: WEBHOOK_URL,
            path: WEBHOOK_PATH,
          });
        } catch (error) {
          logger.error('Failed to setup webhook', error);
          return res.status(500).json({
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      };

      // Force webhook setup endpoint (for debugging)
      app.post('/webhook-setup', resetWebhookHandler);
      app.post('/webhook/reset', resetWebhookHandler);

      // Webhook handler function - shared between / and WEBHOOK_PATH
      const webhookHandler = async (req: express.Request, res: express.Response) => {
        const startTime = Date.now();
        const updateId = req.body?.update_id;
        const requestPath = req.path || req.url;

        // Log ALL webhook requests (even if body is empty) with full details
        logger.info('📥 Webhook request received', {
          updateId,
          hasBody: !!req.body,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          requestPath,
          expectedPath: WEBHOOK_PATH,
          method: req.method,
          message: req.body?.message?.text,
          command: req.body?.message?.entities?.[0]?.type,
          userId: req.body?.message?.from?.id,
          chatId: req.body?.message?.chat?.id,
          timestamp: new Date().toISOString(),
          headers: {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-forwarded-proto': req.headers['x-forwarded-proto'],
            host: req.headers['host'],
          },
          rawBody: req.body ? JSON.stringify(req.body).substring(0, 500) : null, // First 500 chars for debugging
        });

        try {
          if (!req.body || !req.body.update_id) {
            logger.warn('⚠️ Invalid webhook request - missing body or update_id', {
              body: req.body,
            });
            return res.sendStatus(200); // Return 200 to avoid Telegram retries
          }

          // Add detailed logging before handling update
          const messageText = req.body.message?.text;
          const entities = req.body.message?.entities || [];
          const commandEntity = entities.find((e: any) => e.type === 'bot_command');

          logger.info('🔄 Processing update', {
            updateId,
            updateType: req.body.message
              ? 'message'
              : req.body.callback_query
                ? 'callback_query'
                : 'unknown',
            messageText,
            entities: entities.map((e: any) => ({
              type: e.type,
              offset: e.offset,
              length: e.length,
            })),
            commandEntity: commandEntity
              ? {
                  type: commandEntity.type,
                  offset: commandEntity.offset,
                  length: commandEntity.length,
                  command: messageText?.substring(
                    commandEntity.offset,
                    commandEntity.offset + commandEntity.length
                  ),
                }
              : null,
            userId: req.body.message?.from?.id,
            chatId: req.body.message?.chat?.id,
          });

          // Handle update with timeout to prevent hanging
          logger.info('🔄 Starting update processing', {
            updateId,
            userId: req.body?.message?.from?.id,
            chatId: req.body?.message?.chat?.id,
            updateType: req.body.message
              ? 'message'
              : req.body.callback_query
                ? 'callback_query'
                : 'unknown',
          });

          // Wrap bot.handleUpdate to catch all errors
          const updatePromise = (async () => {
            try {
              logger.info('🔄 Calling bot.handleUpdate', {
                updateId,
                hasMessage: !!req.body.message,
                hasCallbackQuery: !!req.body.callback_query,
              });

              await bot.handleUpdate(req.body);

              logger.info('🔄 bot.handleUpdate completed', {
                updateId,
              });
            } catch (handleError) {
              logger.error('❌ Error in bot.handleUpdate', {
                error: handleError instanceof Error ? handleError.message : String(handleError),
                stack: handleError instanceof Error ? handleError.stack : undefined,
                updateId,
                errorType: handleError?.constructor?.name,
              });
              throw handleError;
            }
          })();

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Update handling timeout after 10s')), 10000);
          });

          try {
            await Promise.race([updatePromise, timeoutPromise]);
            const processingTime = Date.now() - startTime;
            logger.info('✅ Webhook processed successfully', {
              updateId,
              processingTime: `${processingTime}ms`,
              userId: req.body?.message?.from?.id,
              chatId: req.body?.message?.chat?.id,
            });
          } catch (updateError) {
            const processingTime = Date.now() - startTime;
            logger.error('❌ Error during update processing', {
              error: updateError instanceof Error ? updateError.message : String(updateError),
              stack: updateError instanceof Error ? updateError.stack : undefined,
              updateId,
              processingTime: `${processingTime}ms`,
              userId: req.body?.message?.from?.id,
              chatId: req.body?.message?.chat?.id,
              errorType: updateError?.constructor?.name,
              isTimeout: updateError instanceof Error && updateError.message.includes('timeout'),
            });
            // Don't throw - we still want to return 200 to Telegram
          }

          // Always return 200 to Telegram to acknowledge receipt
          // This prevents Telegram from retrying the update
          logger.info('📤 Sending 200 response to Telegram', {
            updateId,
            processingTime: `${Date.now() - startTime}ms`,
          });
          return res.sendStatus(200);
        } catch (error) {
          const processingTime = Date.now() - startTime;
          logger.error('❌ Error handling webhook update', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            updateId,
            body: req.body ? JSON.stringify(req.body).substring(0, 1000) : null,
            processingTime: `${processingTime}ms`,
            errorType: error?.constructor?.name,
          });

          // Try to send error message to user if possible
          try {
            const userId = req.body?.message?.from?.id;
            const chatId = req.body?.message?.chat?.id;
            if (userId && chatId) {
              await bot.telegram.sendMessage(
                chatId,
                '❌ Сталася помилка при обробці вашого повідомлення. Будь ласка, спробуйте ще раз.'
              );
              logger.info('✅ Error message sent to user', { userId, chatId });
            }
          } catch (sendError) {
            logger.error('❌ Failed to send error message to user', {
              error: sendError instanceof Error ? sendError.message : String(sendError),
            });
          }

          // Always return 200 to Telegram to avoid retries
          // This acknowledges receipt even if processing failed
          return res.sendStatus(200);
        }
      };

      // Register webhook handler on both paths to handle different configurations
      // Some setups use root path, others use /webhook
      app.post('/', webhookHandler); // Fallback for root path
      app.post(WEBHOOK_PATH, webhookHandler); // Primary webhook path

      // Log which paths are registered
      logger.info('Webhook handlers registered', {
        rootPath: '/',
        webhookPath: WEBHOOK_PATH,
        webhookUrl: WEBHOOK_URL,
      });

      // Catch-all handler for unhandled routes - log for debugging
      app.use((req, res) => {
        logger.warn('⚠️ Unhandled route', {
          method: req.method,
          path: req.path,
          url: req.url,
          headers: req.headers,
          body: req.body,
        });
        res.status(404).json({
          status: 'error',
          message: 'Route not found',
          path: req.path,
          method: req.method,
          availablePaths: ['/', WEBHOOK_PATH, '/health', '/webhook-test', '/webhook-setup'],
        });
      });

      // Start Express server
      const portNumber = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
      const server = app.listen(portNumber, '0.0.0.0', async () => {
        const address = server.address();
        logger.info(`✅ Webhook server listening`, {
          port: portNumber,
          address: typeof address === 'string' ? address : `${address?.address}:${address?.port}`,
          family: typeof address === 'object' ? address?.family : undefined,
        });
        logger.info(`✅ Health endpoint available at: http://0.0.0.0:${portNumber}/health`);
        logger.info(`✅ Webhook endpoint should be: ${WEBHOOK_URL}`);
        logger.info(`✅ Webhook path: ${WEBHOOK_PATH}`);
        logger.info(`✅ Registered routes: POST /, POST ${WEBHOOK_PATH}, GET /health`);
        logger.info(`✅ Environment: ${NODE_ENV}, Production: ${IS_PRODUCTION}`);

        // Log all registered routes for debugging
        const routes: string[] = [];
        app._router?.stack?.forEach((middleware: any) => {
          if (middleware.route) {
            routes.push(
              `${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`
            );
          } else if (middleware.name === 'router') {
            middleware.handle?.stack?.forEach((handler: any) => {
              if (handler.route) {
                routes.push(
                  `${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`
                );
              }
            });
          }
        });
        logger.info(`✅ Registered Express routes:`, { routes });

        try {
          const webhookStatus = await ensureWebhook('startup');
          logger.info(`✅ Webhook status verified:`, {
            url: webhookStatus.url,
            pendingUpdateCount: webhookStatus.pendingUpdates,
            lastErrorDate: webhookStatus.lastErrorDate,
            lastErrorMessage: webhookStatus.lastError,
            path: WEBHOOK_PATH,
          });

          // Schedule periodic webhook status checks
          setInterval(async () => {
            try {
              const status = await getWebhookStatus();
              if (status.lastError) {
                logger.error('⚠️ Webhook error detected from Telegram', {
                  lastError: status.lastError,
                  lastErrorDate: status.lastErrorDate
                    ? new Date(status.lastErrorDate * 1000).toISOString()
                    : undefined,
                  url: status.url,
                  pendingUpdates: status.pendingUpdates,
                });

                // Try to reset webhook if there's an error
                if (status.lastError) {
                  logger.info('🔄 Attempting to reset webhook due to error');
                  try {
                    await ensureWebhook('periodic-reset-due-to-error');
                    logger.info('✅ Webhook reset successfully');
                  } catch (resetError) {
                    logger.error('❌ Failed to reset webhook', {
                      error: resetError instanceof Error ? resetError.message : String(resetError),
                    });
                  }
                }
              } else if (status.pendingUpdates > 0) {
                logger.warn('⚠️ Pending updates detected', {
                  pendingUpdates: status.pendingUpdates,
                });

                // If there are pending updates, try to clear them
                // This might indicate that updates are not being processed correctly
                if (status.pendingUpdates > 5) {
                  logger.info('🔄 Too many pending updates, attempting to clear them', {
                    pendingUpdates: status.pendingUpdates,
                  });
                  try {
                    await ensureWebhook('periodic-clear-pending-updates');
                    logger.info('✅ Pending updates cleared');
                  } catch (clearError) {
                    logger.error('❌ Failed to clear pending updates', {
                      error: clearError instanceof Error ? clearError.message : String(clearError),
                    });
                  }
                }
              }
            } catch (error) {
              logger.error('❌ Error checking webhook status', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }, 60000); // Check every minute
        } catch (error) {
          logger.error('❌ Failed to set webhook', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            webhookUrl: WEBHOOK_URL,
          });
          process.exit(1);
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
