import { Pool } from 'pg';
import { logger } from './logger';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionString: string;
}

/**
 * Test database connection
 */
async function testConnection(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}): Promise<boolean> {
  const testPool = new Pool({
    ...config,
    connectionTimeoutMillis: 2000,
  });

  try {
    await testPool.query('SELECT 1');
    await testPool.end();
    return true;
  } catch (error) {
    await testPool.end().catch(() => {});
    return false;
  }
}

/**
 * Auto-detect available database connection
 * Tries Docker PostgreSQL (5433) first, then local PostgreSQL (5432)
 */
export async function detectDatabaseConnection(): Promise<DatabaseConfig | null> {
  // Priority 1: Use DATABASE_URL if provided
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      const config: DatabaseConfig = {
        host: url.hostname,
        port: url.port ? parseInt(url.port) : 5432,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1).split('?')[0],
        connectionString: process.env.DATABASE_URL,
      };

      logger.info('Testing DATABASE_URL connection...', {
        host: config.host,
        port: config.port,
        database: config.database,
      });

      if (await testConnection(config)) {
        logger.info('✅ DATABASE_URL connection successful');
        return config;
      } else {
        logger.warn('⚠️ DATABASE_URL connection failed, trying fallback options...');
      }
    } catch (error) {
      logger.warn('⚠️ Failed to parse DATABASE_URL, trying fallback options...', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Priority 2: Try Docker PostgreSQL (port 5433)
  const dockerConfig: DatabaseConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'makebot',
    password: process.env.DB_PASSWORD || 'makebot123',
    database: process.env.DB_NAME || 'make_bot',
    connectionString: `postgresql://${process.env.DB_USER || 'makebot'}:${process.env.DB_PASSWORD || 'makebot123'}@${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || '5433'}/${process.env.DB_NAME || 'make_bot'}?schema=public`,
  };

  logger.info('Testing Docker PostgreSQL connection (port 5433)...', {
    host: dockerConfig.host,
    port: dockerConfig.port,
    database: dockerConfig.database,
  });

  if (await testConnection(dockerConfig)) {
    logger.info('✅ Docker PostgreSQL connection successful');
    return dockerConfig;
  }

  // Priority 3: Try local PostgreSQL (port 5432) with makebot user
  const localConfigMakebot: DatabaseConfig = {
    host: '127.0.0.1',
    port: 5432,
    user: 'makebot',
    password: 'makebot123',
    database: process.env.DB_NAME || 'make_bot',
    connectionString: `postgresql://makebot:makebot123@127.0.0.1:5432/${process.env.DB_NAME || 'make_bot'}?schema=public`,
  };

  logger.info('Testing local PostgreSQL with makebot user (port 5432)...', {
    host: localConfigMakebot.host,
    port: localConfigMakebot.port,
    database: localConfigMakebot.database,
  });

  if (await testConnection(localConfigMakebot)) {
    logger.info('✅ Local PostgreSQL (makebot user) connection successful');
    return localConfigMakebot;
  }

  // Priority 4: Try local PostgreSQL (port 5432) with postgres user
  const localConfig: DatabaseConfig = {
    host: '127.0.0.1',
    port: 5432,
    user: process.env.DB_USER || process.env.USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'make_bot',
    connectionString: `postgresql://${process.env.DB_USER || process.env.USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@127.0.0.1:5432/${process.env.DB_NAME || 'make_bot'}?schema=public`,
  };

  logger.info('Testing local PostgreSQL connection (port 5432)...', {
    host: localConfig.host,
    port: localConfig.port,
    database: localConfig.database,
  });

  if (await testConnection(localConfig)) {
    logger.info('✅ Local PostgreSQL connection successful');
    return localConfig;
  }

  logger.error('❌ No database connection available');
  return null;
}

/**
 * Initialize database connection with auto-detection
 */
export async function initializeDatabaseConnection(): Promise<{
  pool: Pool;
  connectionString: string;
}> {
  const config = await detectDatabaseConnection();

  if (!config) {
    throw new Error(
      'No database connection available. Please ensure PostgreSQL is running:\n' +
      '  - Docker: docker start make-bot-postgres\n' +
      '  - Local: Check if PostgreSQL service is running on port 5432\n' +
      '  - Or set DATABASE_URL environment variable'
    );
  }

  // Update DATABASE_URL for Prisma
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = config.connectionString;
    logger.info('Set DATABASE_URL from detected connection', {
      host: config.host,
      port: config.port,
    });
  }

  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 5000,
  });

  logger.info('Database pool initialized', {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
  });

  return { pool, connectionString: config.connectionString };
}

