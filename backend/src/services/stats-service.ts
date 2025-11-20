import { prisma } from '../utils/prisma';
import { Prisma, Plan, SessionStatus } from '@prisma/client';

export interface StatsParams {
  startDate?: Date;
  endDate?: Date;
}

export interface Stats {
  totalSessions: number;
  totalRevenue: number;
  conversionRate: number;
  revenueByPlan: {
    plan: Plan;
    count: number;
    revenue: number;
  }[];
  conversionFunnel: {
    started: number;
    awaitingPayment: number;
    paid: number;
    completed: number;
  };
  trends: {
    date: string;
    sessions: number;
    revenue: number;
  }[];
}

export class StatsService {
  async getStats(params: StatsParams = {}): Promise<Stats> {
    const where: Prisma.SessionWhereInput = {};

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        (where.createdAt as Prisma.DateTimeFilter).gte = params.startDate;
      }
      if (params.endDate) {
        (where.createdAt as Prisma.DateTimeFilter).lte = params.endDate;
      }
    }

    // Total sessions
    const totalSessions = await prisma.session.count({ where });

    // Total revenue (only completed sessions)
    const completedSessions = await prisma.session.findMany({
      where: {
        ...where,
        status: SessionStatus.COMPLETED,
      },
      select: {
        amount: true,
      },
    });

    const totalRevenue = completedSessions.reduce((sum: number, session) => {
      return sum + Number(session.amount);
    }, 0);

    // Revenue by plan
    const revenueByPlanData = await prisma.session.groupBy({
      by: ['plan'],
      where: {
        ...where,
        status: SessionStatus.COMPLETED,
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const revenueByPlan = revenueByPlanData.map(item => ({
      plan: item.plan,
      count: item._count.id,
      revenue: Number(item._sum.amount || 0),
    }));

    // Conversion funnel
    const funnelData = await prisma.session.groupBy({
      by: ['status'],
      where,
      _count: {
        id: true,
      },
    });

    const conversionFunnel = {
      started: 0,
      awaitingPayment: 0,
      paid: 0,
      completed: 0,
    };

    funnelData.forEach((item: { status: SessionStatus; _count: { id: number } }) => {
      const count = item._count.id;
      switch (item.status) {
        case SessionStatus.STARTED:
          conversionFunnel.started = count;
          break;
        case SessionStatus.AWAITING_PAYMENT:
        case SessionStatus.PAID_PENDING_EMAIL:
          conversionFunnel.awaitingPayment += count;
          break;
        case SessionStatus.PAID:
          conversionFunnel.paid = count;
          break;
        case SessionStatus.COMPLETED:
          conversionFunnel.completed = count;
          break;
      }
    });

    // Trends (last 30 days)
    const trendsStartDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendsEndDate = params.endDate || new Date();

    const trendsData = await prisma.$queryRaw<
      Array<{
        date: Date;
        sessions: bigint;
        revenue: bigint;
      }>
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::bigint as sessions,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END), 0)::bigint as revenue
      FROM sessions
      WHERE created_at >= ${trendsStartDate}
        AND created_at <= ${trendsEndDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const trends = trendsData.map((item: { date: Date; sessions: bigint; revenue: bigint }) => ({
      date: item.date.toISOString().split('T')[0],
      sessions: Number(item.sessions),
      revenue: Number(item.revenue),
    }));

    // Conversion rate
    const conversionRate =
      conversionFunnel.started > 0
        ? (conversionFunnel.completed / conversionFunnel.started) * 100
        : 0;

    return {
      totalSessions,
      totalRevenue,
      conversionRate,
      revenueByPlan,
      conversionFunnel,
      trends,
    };
  }
}

export const statsService = new StatsService();
