import { prisma } from '../utils/prisma';
import { SessionStatus, Plan } from '@prisma/client';
import { Response } from 'express';
import { format as formatDate } from 'date-fns';

export interface ExportParams {
  status?: SessionStatus;
  plan?: Plan;
  startDate?: Date;
  endDate?: Date;
  format?: 'csv' | 'excel';
}

export class ExportService {
  async exportSessions(
    params: ExportParams,
    res: Response
  ): Promise<void> {
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

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
      },
    });

    const format = params.format || 'csv';

    if (format === 'csv') {
      await this.exportToCSV(sessions, res);
    } else {
      // For Excel, we'll use CSV format (can be opened in Excel)
      await this.exportToCSV(sessions, res, 'excel');
    }
  }

  private async exportToCSV(
    sessions: Array<{
      id: string;
      sessionId: string;
      txnId: string | null;
      plan: Plan;
      emailUser: string | null;
      emailPaypal: string | null;
      amount: number;
      currency: string;
      status: SessionStatus;
      paymentDate: Date | null;
      endDate: Date | null;
      createdAt: Date;
      user: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    }>,
    res: Response,
    format: 'csv' | 'excel' = 'csv'
  ): Promise<void> {
    const filename = `sessions-export-${formatDate(new Date(), 'yyyy-MM-dd')}.${format === 'excel' ? 'csv' : 'csv'}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // CSV Header
    const headers = [
      'Session ID',
      'Transaction ID',
      'Plan',
      'Email (User)',
      'Email (PayPal)',
      'Final Email',
      'Amount',
      'Currency',
      'Status',
      'Payment Date',
      'End Date',
      'Created At',
      'First Name',
      'Last Name',
    ];

    res.write(headers.join(',') + '\n');

    // CSV Rows
    for (const session of sessions) {
      const finalEmail = session.emailUser || session.emailPaypal || '';
      const row = [
        session.sessionId,
        session.txnId || '',
        session.plan,
        session.emailUser || '',
        session.emailPaypal || '',
        finalEmail,
        session.amount.toString(),
        session.currency,
        session.status,
        session.paymentDate ? formatDate(session.paymentDate, 'yyyy-MM-dd HH:mm:ss') : '',
        session.endDate ? formatDate(session.endDate, 'yyyy-MM-dd') : '',
        formatDate(session.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        session.user?.firstName || '',
        session.user?.lastName || '',
      ].map((field) => `"${String(field).replace(/"/g, '""')}"`);

      res.write(row.join(',') + '\n');
    }

    res.end();
  }
}

export const exportService = new ExportService();

