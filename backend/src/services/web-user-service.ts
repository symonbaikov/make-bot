import { WebUser, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { Pool } from 'pg';

export interface LoginResult {
  user: Omit<WebUser, 'passwordHash'>;
  token: string;
}

// Direct PostgreSQL connection pool for bypassing Prisma issues
// Remove schema and sslmode parameters from URL for pg library
const dbUrl = (process.env.DATABASE_URL || '')
  .replace(/[?&]schema=[^&]*/g, '')
  .replace(/[?&]sslmode=[^&]*/g, '')
  .replace(/[?&]$/, '')
  .replace(/&&/g, '&')
  .replace(/&$/, '')
  .replace(/\?$/, '');
// Use port 5433 to connect to Docker PostgreSQL (5432 is used by local PostgreSQL)
const pool = new Pool({
  user: 'makebot',
  password: 'makebot123',
  host: '127.0.0.1',
  port: 5433,
  database: 'make_bot',
  connectionTimeoutMillis: 5000,
});

export class WebUserService {
  async findByEmail(email: string): Promise<WebUser | null> {
    try {
      return await prisma.webUser.findUnique({
        where: { email },
      });
    } catch (error) {
      // Fallback to direct SQL if Prisma fails
      const result = await pool.query('SELECT * FROM web_users WHERE email = $1', [email]);
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
    // Use direct SQL query to bypass Prisma connection issues
    let result;
    try {
      result = await pool.query(
        'SELECT id, email, password_hash, role, first_name, last_name, created_at, updated_at FROM web_users WHERE email = $1 LIMIT 1',
        [email]
      );
    } catch (error: any) {
      console.error('Database query error:', error.message);
      throw new Error(`Database connection failed: ${error.message}`);
    }

    const user = result.rows[0];
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role as Role,
      },
      secret,
      { expiresIn }
    ) as string;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as Role,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
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
}

export const webUserService = new WebUserService();
