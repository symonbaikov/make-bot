import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Create Prisma Client with current DATABASE_URL
 * This function should be called after DATABASE_URL is set
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    logger.warn('DATABASE_URL is not set, using fallback connection');
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl || 'postgresql://makebot:makebot123@127.0.0.1:5433/make_bot?schema=public',
      },
    },
  });
}

/**
 * Get or create Prisma Client instance
 * Lazy initialization ensures DATABASE_URL is set before creating the client
 */
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
    
    // Log database URL (without password) for debugging
    if (process.env.DATABASE_URL) {
      logger.debug('Prisma Client initialized', {
        databaseUrl: process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'),
      });
    }
  }
  
  return globalForPrisma.prisma;
}

// Export Prisma Client with lazy initialization
// Client will be created on first access, ensuring DATABASE_URL is set
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
}) as PrismaClient;

