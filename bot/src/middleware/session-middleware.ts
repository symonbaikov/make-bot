import { Context } from 'telegraf';

export interface BotSession {
  plan?: 'BASIC' | 'STANDARD' | 'PREMIUM';
  amount?: number;
  currency?: string;
  waitingForPlan?: boolean;
  waitingForEmail?: boolean;
  waitingForFirstName?: boolean;
  waitingForLastName?: boolean;
  waitingForPhoneNumber?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface BotContext extends Context {
  session?: BotSession;
}

/**
 * Session middleware to store user state
 */
export function sessionMiddleware() {
  const sessions = new Map<number, BotSession>();

  return async (ctx: BotContext, next: () => Promise<void>): Promise<void> => {
    const userId = ctx.from?.id;

    if (!userId) {
      // Log when userId is missing
      const { logger } = await import('../utils/logger');
      logger.warn('Session middleware: userId is missing', {
        hasFrom: !!ctx.from,
        updateType: ctx.update ? Object.keys(ctx.update)[1] : 'unknown',
      });
      return next();
    }

    // Get or create session
    if (!sessions.has(userId)) {
      sessions.set(userId, {});
      const { logger } = await import('../utils/logger');
      logger.info('Session created', { userId });
    }

    ctx.session = sessions.get(userId);

    // Clean up old sessions (optional - can be improved with TTL)
    // For now, sessions persist for the lifetime of the bot process

    try {
      await next();
    } catch (error) {
      const { logger } = await import('../utils/logger');
      logger.error('Error in session middleware next()', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  };
}
