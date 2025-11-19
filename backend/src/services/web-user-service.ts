import { WebUser, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { Pool } from 'pg';
import { emailService } from './email-service';
import { logger } from '../utils/logger';

export interface LoginResult {
  user: Omit<WebUser, 'passwordHash'>;
  token: string;
}

// Direct PostgreSQL connection pool for bypassing Prisma issues
// Will be initialized asynchronously on first use
let pool: Pool | null = null;
let poolInitializationPromise: Promise<void> | null = null;

/**
 * Initialize database pool with auto-detection
 */
async function initializePool(): Promise<void> {
  if (pool) return; // Already initialized

  try {
    const { detectDatabaseConnection } = await import('../utils/db-connection');
    const config = await detectDatabaseConnection();

    if (!config) {
      throw new Error(
        'No database connection available. Please ensure PostgreSQL is running:\n' +
          '  - Docker: docker start make-bot-postgres\n' +
          '  - Local: Check if PostgreSQL service is running on port 5432\n' +
          '  - Or set DATABASE_URL environment variable'
      );
    }

    // Update DATABASE_URL for Prisma if not set
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = config.connectionString;
    }

    pool = new Pool({
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
    });
  } catch (error) {
    logger.error('Failed to initialize database pool', { error });
    // Create a dummy pool that will fail gracefully
    pool = new Pool({
      connectionString: 'invalid',
      connectionTimeoutMillis: 1000,
    });
    throw error;
  }
}

/**
 * Get database pool, initializing if needed
 */
async function getPool(): Promise<Pool> {
  if (!poolInitializationPromise) {
    poolInitializationPromise = initializePool();
  }
  await poolInitializationPromise;
  if (!pool) {
    throw new Error('Database pool initialization failed');
  }
  return pool;
}

export class WebUserService {
  async findByEmail(email: string): Promise<WebUser | null> {
    try {
      return await prisma.webUser.findUnique({
        where: { email },
      });
    } catch (error) {
      // Fallback to direct SQL if Prisma fails
      const dbPool = await getPool();
      const result = await dbPool.query('SELECT * FROM web_users WHERE email = $1', [email]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role as Role,
        firstName: row.first_name,
        lastName: row.last_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }

  async findById(id: string): Promise<WebUser | null> {
    return prisma.webUser.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    password: string;
    role?: Role;
    firstName?: string;
    lastName?: string;
  }): Promise<Omit<WebUser, 'passwordHash'>> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.webUser.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role || Role.MANAGER,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    // Try Prisma first, fallback to direct SQL if needed
    let user: WebUser | null = null;

    try {
      // Try Prisma first
      logger.debug('Attempting Prisma query for user', { email });
      user = await prisma.webUser.findUnique({
        where: { email },
      });
      logger.debug('Prisma query successful', { email, found: !!user });
    } catch (prismaError: any) {
      const prismaErrorMessage = prismaError.message || String(prismaError);
      const isConnectionError =
        prismaErrorMessage.includes("Can't reach database server") ||
        prismaErrorMessage.includes('ECONNREFUSED') ||
        prismaErrorMessage.includes('connection');

      logger.warn('Prisma query failed, trying direct SQL', {
        error: prismaErrorMessage,
        stack: prismaError.stack,
        code: prismaError.code,
        isConnectionError,
      });

      // Fallback to direct SQL query
      try {
        logger.debug('Attempting direct SQL query', { email });
        const dbPool = await getPool();
        const result = await dbPool.query(
          'SELECT id, email, password_hash, role, first_name, last_name, created_at, updated_at FROM web_users WHERE email = $1 LIMIT 1',
          [email]
        );

        logger.debug('Direct SQL query successful', {
          email,
          rowsFound: result.rows.length,
        });

        if (result.rows.length > 0) {
          const row = result.rows[0];
          user = {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            role: row.role as Role,
            firstName: row.first_name,
            lastName: row.last_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }
      } catch (sqlError: any) {
        const dbPool = await getPool().catch(() => null);
        const poolHost = dbPool?.['options']?.host || 'localhost';
        const poolPort = dbPool?.['options']?.port || 5433;

        let errorMessage: string;
        if (sqlError.code === 'ECONNREFUSED') {
          errorMessage = `Database connection refused. Please ensure PostgreSQL is running on ${poolHost}:${poolPort}. `;
          if (poolPort === 5433) {
            errorMessage += 'If using Docker, run: docker start make-bot-postgres';
          } else {
            errorMessage += 'Check if PostgreSQL service is running.';
          }
        } else {
          errorMessage = `Database connection failed: ${sqlError.message}`;
        }

        logger.error('Direct SQL query also failed', {
          error: sqlError.message,
          code: sqlError.code,
          stack: sqlError.stack,
          poolConfig: {
            host: poolHost,
            port: poolPort,
            database: dbPool?.['options']?.database || 'unknown',
          },
        });

        // Throw AppError instead of generic Error for better error handling
        throw new Error(errorMessage);
      }
    }

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const signOptions = {
      expiresIn,
    } as SignOptions;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role as Role,
      },
      secret,
      signOptions
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.webUser.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async update(
    id: string,
    data: {
      email?: string;
      role?: Role;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<Omit<WebUser, 'passwordHash'>> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const updatedUser = await prisma.webUser.update({
      where: { id },
      data,
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async list(): Promise<Omit<WebUser, 'passwordHash'>[]> {
    const users = await prisma.webUser.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ passwordHash: _passwordHash, ...user }) => user);
  }

  /**
   * Request password reset code
   * Generates a 6-digit code and sends it via email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findByEmail(email);

    // Don't reveal if user exists or not for security
    if (!user) {
      logger.warn('Password reset requested for non-existent email', { email });
      // Still return success to prevent email enumeration
      return;
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Code expires in 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Invalidate all previous unused codes for this user
    await prisma.passwordResetCode.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Create new reset code
    await prisma.passwordResetCode.create({
      data: {
        code,
        userId: user.id,
        email: user.email,
        expiresAt,
      },
    });

    // Send email with code
    try {
      await emailService.sendPasswordResetCode(user.email, code);
      logger.info('Password reset code sent', { email: user.email });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error to prevent email enumeration
    }
  }

  /**
   * Login using password reset code
   * Returns JWT token if code is valid
   */
  async loginWithResetCode(email: string, code: string): Promise<LoginResult> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or code');
    }

    // Find valid reset code
    const resetCode = await prisma.passwordResetCode.findFirst({
      where: {
        code,
        userId: user.id,
        email: user.email,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetCode) {
      throw new UnauthorizedError('Invalid or expired code');
    }

    // Mark code as used
    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { used: true },
    });

    // Generate JWT token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const signOptions = {
      expiresIn,
    } as SignOptions;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role as Role,
      },
      secret,
      signOptions
    );

    logger.info('User logged in with reset code', { email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }
}

export const webUserService = new WebUserService();
