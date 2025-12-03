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
      return next();
    }

    // Get or create session
    if (!sessions.has(userId)) {
      sessions.set(userId, {});
    }

    ctx.session = sessions.get(userId);

    // Clean up old sessions (optional - can be improved with TTL)
    // For now, sessions persist for the lifetime of the bot process

    await next();
  };
}
