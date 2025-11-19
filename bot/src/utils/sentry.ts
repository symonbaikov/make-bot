import * as Sentry from '@sentry/node';
import { logger } from './logger';

/**
 * Initialize Sentry for error tracking
 * Should be called before bot initialization
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || 'development';

  if (!dsn) {
    logger.warn('SENTRY_DSN is not set - Sentry error tracking is disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    // Filter out common errors
    ignoreErrors: ['ECONNRESET', 'ECONNREFUSED'],
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
      }
      return event;
    },
  });

  logger.info('Sentry initialized successfully', { environment });
}

/**
 * Capture exception and send to Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope(scope => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, { value });
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture message and send to Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 */
export function setUser(user: { id?: string; username?: string; telegramId?: number }): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}


