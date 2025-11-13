import {
  PrismaClient,
  Session,
  SessionStatus,
  Plan,
  ActionType,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { NotFoundError, ValidationError } from '../utils/errors';
import { actionService } from './action-service';
import { logger } from '../utils/logger';

export class SessionService {
  async findBySessionId(sessionId: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { sessionId },
      include: {
        user: true,
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async findByTxnId(txnId: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { txnId },
      include: {
        user: true,
      },
    });
  }

  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({
      where: { id },
      include: {
        user: true,
        actions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async create(data: {
    sessionId: string;
    plan: Plan;
    amount: number;
    currency?: string;
    userId?: string;
    meta?: Record<string, unknown>;
  }): Promise<Session> {
    const session = await prisma.session.create({
      data: {
        sessionId: data.sessionId,
        plan: data.plan,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: SessionStatus.STARTED,
        userId: data.userId,
        meta: data.meta || {},
      },
    });

    // Log session creation
    await actionService.create({
      type: ActionType.SESSION_CREATED,
      ref: session.sessionId,
      sessionId: session.id,
      payload: { plan: data.plan, amount: data.amount },
    });

    return session;
  }

  async upsertBySessionId(data: {
    sessionId: string;
    plan: Plan;
    amount: number;
    currency?: string;
    emailUser?: string;
    tgUserId?: string;
    firstName?: string;
    lastName?: string;
    meta?: Record<string, unknown>;
  }): Promise<Session> {
    // Find or create user if tgUserId provided
    let userId: string | undefined;
    if (data.tgUserId) {
      const user = await prisma.user.upsert({
        where: { tgUserId: data.tgUserId },
        update: {
          email: data.emailUser,
          firstName: data.firstName,
          lastName: data.lastName,
        },
        create: {
          tgUserId: data.tgUserId,
          email: data.emailUser,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
      userId = user.id;
    }

    // Upsert session
    const existingSession = await prisma.session.findUnique({
      where: { sessionId: data.sessionId },
    });

    const session = await prisma.session.upsert({
      where: { sessionId: data.sessionId },
      update: {
        emailUser: data.emailUser,
        userId,
        meta: data.meta || existingSession?.meta || {},
      },
      create: {
        sessionId: data.sessionId,
        plan: data.plan,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: SessionStatus.AWAITING_PAYMENT,
        emailUser: data.emailUser,
        userId,
        meta: data.meta || {},
      },
    });

    // Log email collection if email was provided
    if (data.emailUser && !existingSession?.emailUser) {
      await actionService.create({
        type: ActionType.EMAIL_COLLECTED,
        ref: session.sessionId,
        sessionId: session.id,
        payload: { email: data.emailUser, source: 'telegram_bot' },
      });
    }

    return session;
  }

  async updatePayment(data: {
    sessionId: string;
    txnId: string;
    emailPaypal?: string;
    paymentDate?: Date;
    status?: SessionStatus;
    meta?: Record<string, unknown>;
  }): Promise<Session> {
    const session = await this.findBySessionId(data.sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    // Check for duplicate txn_id
    const existingSessionWithTxn = await this.findByTxnId(data.txnId);
    if (existingSessionWithTxn && existingSessionWithTxn.id !== session.id) {
      throw new ValidationError('Transaction ID already exists');
    }

    const updatedSession = await prisma.session.update({
      where: { sessionId: data.sessionId },
      data: {
        txnId: data.txnId,
        emailPaypal: data.emailPaypal,
        paymentDate: data.paymentDate || new Date(),
        status: data.status || SessionStatus.PAID,
        meta: {
          ...((session.meta as Record<string, unknown>) || {}),
          ...(data.meta || {}),
        },
      },
    });

    // Log payment received
    await actionService.create({
      type: ActionType.PAYMENT_RECEIVED,
      ref: data.txnId,
      sessionId: session.id,
      payload: {
        txnId: data.txnId,
        emailPaypal: data.emailPaypal,
        paymentDate: data.paymentDate,
      },
    });

    return updatedSession;
  }

  async updateEmail(sessionId: string, email: string): Promise<Session> {
    const session = await this.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    const updatedSession = await prisma.session.update({
      where: { sessionId },
      data: {
        emailUser: email,
      },
    });

    await actionService.create({
      type: ActionType.EMAIL_UPDATED,
      ref: sessionId,
      sessionId: session.id,
      payload: { email, previousEmail: session.emailUser },
    });

    return updatedSession;
  }

  async updateStatus(
    sessionId: string,
    status: SessionStatus,
    meta?: Record<string, unknown>
  ): Promise<Session> {
    const session = await this.findBySessionId(sessionId);
    if (!session) {
      throw new NotFoundError('Session');
    }

    return prisma.session.update({
      where: { sessionId },
      data: {
        status,
        meta: {
          ...((session.meta as Record<string, unknown>) || {}),
          ...(meta || {}),
        },
      },
    });
  }

  /**
   * Get final email according to business rules:
   * email_user (if exists) ELSE email_paypal
   */
  getFinalEmail(session: Session): string | null {
    return session.emailUser || session.emailPaypal || null;
  }

  /**
   * Calculate end date: Payment Date + 60 days
   */
  calculateEndDate(paymentDate: Date): Date {
    const endDate = new Date(paymentDate);
    endDate.setDate(endDate.getDate() + 60);
    return endDate;
  }

  async list(params: {
    page?: number;
    limit?: number;
    status?: SessionStatus;
    plan?: Plan;
    search?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    data: Session[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.plan) {
      where.plan = params.plan;
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    if (params.search) {
      where.OR = [
        { sessionId: { contains: params.search, mode: 'insensitive' } },
        { txnId: { contains: params.search, mode: 'insensitive' } },
        { emailUser: { contains: params.search, mode: 'insensitive' } },
        { emailPaypal: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
        },
      }),
      prisma.session.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const sessionService = new SessionService();

