import { Prisma, ActionType } from '@prisma/client';
import { prisma } from '../utils/prisma';

export class ActionService {
  async create(data: {
    type: ActionType;
    ref?: string;
    sessionId?: string;
    payload?: Record<string, unknown>;
  }): Promise<Prisma.ActionGetPayload<Record<string, never>>> {
    return prisma.action.create({
      data: {
        type: data.type,
        ref: data.ref,
        sessionId: data.sessionId,
        payload: (data.payload || {}) as Prisma.InputJsonValue,
      },
    });
  }

  async findBySessionId(sessionId: string): Promise<Prisma.ActionGetPayload<Record<string, never>>[]> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return [];
    }

    return prisma.action.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async list(params: {
    page?: number;
    limit?: number;
    type?: ActionType;
    ref?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    data: Prisma.ActionGetPayload<{
      include: {
        session: {
          select: {
            id: true;
            sessionId: true;
            plan: true;
            status: true;
          };
        };
      };
    }>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ActionWhereInput = {};

    if (params.type) {
      where.type = params.type;
    }

    if (params.ref) {
      where.ref = { contains: params.ref, mode: 'insensitive' };
    }

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        (where.createdAt as Prisma.DateTimeFilter).gte = params.startDate;
      }
      if (params.endDate) {
        (where.createdAt as Prisma.DateTimeFilter).lte = params.endDate;
      }
    }

    const [data, total] = await Promise.all([
      prisma.action.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              sessionId: true,
              plan: true,
              status: true,
            },
          },
        },
      }),
      prisma.action.count({ where }),
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

export const actionService = new ActionService();

