import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validate DATABASE_URL
if (!process.env.DATABASE_URL) {
  logger.warn('DATABASE_URL is not set, Prisma will use fallback connection');
  logger.info('Using fallback database connection: postgresql://makebot:makebot123@127.0.0.1:5433/make_bot');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://makebot:makebot123@127.0.0.1:5433/make_bot?schema=public',
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

