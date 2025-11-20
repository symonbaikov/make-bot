import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
// Sentry is initialized in utils/sentry.ts
import { logger } from './utils/logger';
import { initSentry } from './utils/sentry';
import { requestLogger } from './middleware/request-logger';
import { apiLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { sendError } from './utils/response';

dotenv.config();

// Initialize Sentry BEFORE any other middleware
initSentry();

// Initialize database connection early to set DATABASE_URL for Prisma
// This allows auto-detection of Docker or local PostgreSQL
async function initializeDatabase(): Promise<void> {
  // Check if DATABASE_URL is set and valid
  const hasValidDatabaseUrl = (): boolean => {
    if (!process.env.DATABASE_URL) {
      return false;
    }

    // Check if it's a placeholder/template string
    const placeholderPatterns = [
      /user:password@host:port/,
      /user:.*@host:port/,
      /postgresql:\/\/user:/,
      /postgresql:\/\/.*@host:/,
      /@host:port/,
      /host:port/,
      /:\/\/.*@host:/,
      /:\/\/user:.*@host/,
    ];

    const dbUrl = process.env.DATABASE_URL.toLowerCase();
    for (const pattern of placeholderPatterns) {
      if (pattern.test(dbUrl)) {
        logger.warn('DATABASE_URL contains placeholder, will auto-detect', {
          databaseUrl: process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
        });
        return false;
      }
    }

    // Also check for literal placeholder strings
    if (
      dbUrl.includes('host:port') ||
      dbUrl.includes('user:password') ||
      (dbUrl.includes('host') && dbUrl.includes('port') && !dbUrl.match(/\d+\.\d+\.\d+\.\d+/))
    ) {
      logger.warn('DATABASE_URL appears to be a template/placeholder, will auto-detect', {
        databaseUrl: process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
      });
      return false;
    }

    // Validate URL format
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (!url.port || isNaN(parseInt(url.port))) {
        logger.warn('DATABASE_URL has invalid port, will auto-detect', {
          port: url.port,
        });
        return false;
      }
      // Check if hostname is not a placeholder
      if (url.hostname === 'host' || (url.hostname === 'localhost' && url.port === 'port')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  // Auto-detect if DATABASE_URL is not set or invalid
  if (!hasValidDatabaseUrl()) {
    if (process.env.NODE_ENV === 'production') {
      // In production, if DATABASE_URL is set but invalid, try to use it anyway
      // Railway and other platforms may provide valid URLs that don't pass strict validation
      // Check if DATABASE_URL contains placeholder values
      const dbUrlLower = (process.env.DATABASE_URL || '').toLowerCase();
      const hasPlaceholder =
        dbUrlLower.includes('host:port') ||
        dbUrlLower.includes('username:password') ||
        dbUrlLower.includes('user:password') ||
        dbUrlLower.includes('database_name') ||
        dbUrlLower.includes('@host:') ||
        dbUrlLower.includes(':port/');

      if (process.env.DATABASE_URL && !hasPlaceholder) {
        logger.warn(
          'DATABASE_URL may not pass strict validation, but using it anyway in production',
          {
            databaseUrl: process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
          }
        );
        // Accept the DATABASE_URL as-is in production
      } else {
        // In production, DATABASE_URL must be set
        const errorMsg =
          'DATABASE_URL is required in production mode. Please set the DATABASE_URL environment variable.\n' +
          'If you are using Railway PostgreSQL service, copy the DATABASE_URL from PostgreSQL service variables.\n' +
          'Current DATABASE_URL value: ' +
          (process.env.DATABASE_URL || 'not set');
        logger.error(errorMsg, {
          databaseUrl: process.env.DATABASE_URL || 'not set',
          nodeEnv: process.env.NODE_ENV,
        });
        throw new Error(errorMsg);
      }
    } else {
      // Development: try auto-detection
      try {
        logger.info('Auto-detecting database connection...');
        const { detectDatabaseConnection } = await import('./utils/db-connection');
        const config = await detectDatabaseConnection();
        if (config) {
          process.env.DATABASE_URL = config.connectionString;
          logger.info('✅ Auto-detected database connection and set DATABASE_URL', {
            host: config.host,
            port: config.port,
            database: config.database,
          });
        } else {
          // Use fallback if detection fails (only in development)
          process.env.DATABASE_URL =
            'postgresql://makebot:makebot123@127.0.0.1:5433/make_bot?schema=public';
          logger.warn(
            '⚠️ Database detection failed, using fallback connection (Docker PostgreSQL)'
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn('⚠️ Failed to auto-detect database connection, using fallback', {
          error: errorMessage,
        });
        // Only use fallback in development
        process.env.DATABASE_URL =
          'postgresql://makebot:makebot123@127.0.0.1:5433/make_bot?schema=public';
      }
    }
  }

  // Final validation
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set and could not be auto-detected');
  }

  // Validate connection string format (more lenient in production)
  try {
    const url = new URL(process.env.DATABASE_URL);
    // In production, be more lenient - some providers may use default ports
    if (process.env.NODE_ENV === 'production') {
      // Just check that it's a valid URL format
      logger.info('✅ DATABASE_URL format validated (production mode)', {
        host: url.hostname,
        port: url.port || 'default',
        database: url.pathname.split('/')[1]?.split('?')[0] || 'unknown',
      });
    } else {
      // In development, be more strict
      if (!url.port || isNaN(parseInt(url.port))) {
        throw new Error(`Invalid port in DATABASE_URL: ${url.port}`);
      }
      logger.info('✅ DATABASE_URL validated successfully', {
        host: url.hostname,
        port: url.port,
        database: url.pathname.split('/')[1]?.split('?')[0],
      });
    }
  } catch (error) {
    // In production, log warning but don't fail if URL format is slightly off
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
      logger.warn('⚠️ DATABASE_URL format validation warning (but will try to use it)', {
        error: error instanceof Error ? error.message : String(error),
        databaseUrl: process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
      });
      // Continue - let Prisma/PostgreSQL handle the connection
    } else {
      logger.error('❌ Invalid DATABASE_URL format', {
        error: error instanceof Error ? error.message : String(error),
        databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'),
      });
      throw error;
    }
  }
}

// Initialize database and start server
(async () => {
  try {
    await initializeDatabase();
    // Import Prisma after DATABASE_URL is set
    // This ensures Prisma Client uses the correct connection string
    await import('./utils/prisma');
    startServer();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Failed to start server', {
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error,
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'set' : 'not set',
    });
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

function startServer() {
  // Generate JWT_SECRET for development if not set
  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ JWT_SECRET is required in production mode');
      throw new Error('JWT_SECRET environment variable is required');
    } else {
      // Generate a random secret for development
      const crypto = require('crypto');
      process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
      logger.warn('⚠️ JWT_SECRET not set, generated random secret for development');
      logger.warn(
        '⚠️ WARNING: This secret will change on each restart. Set JWT_SECRET in .env for production!'
      );
    }
  }

  // Validate required environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingEnvVars.length > 0) {
    logger.error('Missing required environment variables:', { missing: missingEnvVars });
    logger.warn('Server will start but some features may not work correctly');
  }

  const app = express();
  const PORT = process.env.PORT || 3000;

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // CORS middleware (must be before helmet)
  // In production, allow same-origin requests (monolithic app)
  // In development, allow Vite dev server
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
      ? [] // Same-origin in production (monolithic app)
      : ['http://localhost:5173', 'http://localhost:3000'];

  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
      if (!origin) {
        return callback(null, true);
      }

      // In production (monolithic app), allow same-origin requests
      if (process.env.NODE_ENV === 'production') {
        // Allow same-origin (no origin header means same-origin)
        callback(null, true);
        return;
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow localhost on any port
        if (origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));

  // Security middleware (configured to work with CORS)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Sentry request handler (must be before other middleware)
  // Note: Sentry handlers are set up via initSentry() in utils/sentry.ts

  // Request logging
  app.use(requestLogger);

  // Rate limiting
  app.use('/api', apiLimiter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes (must be before static files)
  const webhookRoutes = require('./routes/webhook-routes').default;
  const adminRoutes = require('./routes/admin-routes').default;
  app.use('/api/webhook', webhookRoutes);
  app.use('/api/admin', adminRoutes);

  // Serve static files from frontend build (in production)
  // In development, frontend is served by Vite dev server
  if (process.env.NODE_ENV === 'production') {
    // In CommonJS, __dirname is available
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');

    // Serve static assets (JS, CSS, images, etc.)
    app.use(
      express.static(frontendDistPath, {
        maxAge: '1y', // Cache static assets for 1 year
        etag: true,
      })
    );

    // SPA routing: serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      // Serve index.html for all other routes (SPA routing)
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  // 404 handler for API routes only
  app.use('/api/*', (_req, res) => {
    sendError(res, 'Not found', 'NOT_FOUND', 404);
  });

  // Sentry error handler is handled in error-handler middleware

  // Error handling middleware (must be last)
  app.use(errorHandler);

  const server = app.listen(PORT, () => {
    logger.info(`✅ Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(
      `Database: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'not set'}`
    );
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use`);
      logger.info(`💡 Try one of these solutions:`);
      logger.info(`   1. Stop the process using port ${PORT}: lsof -ti:${PORT} | xargs kill -9`);
      logger.info(`   2. Use a different port: PORT=3001 npm run dev`);
      process.exit(1);
    } else {
      logger.error('Server error:', { error });
      throw error;
    }
  });
}
