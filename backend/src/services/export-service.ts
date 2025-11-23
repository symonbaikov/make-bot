import { prisma } from '../utils/prisma';
import { Prisma, Plan, SessionStatus } from '@prisma/client';
import { Response } from 'express';
import { format as formatDate } from 'date-fns';
import { geminiService, ReportData } from './gemini-service';
import { pdfGenerator } from './pdf-generator';
import { docxGenerator } from './docx-generator';
import { logger } from '../utils/logger';

export interface ExportParams {
  status?: SessionStatus;
  plan?: Plan;
  startDate?: Date;
  endDate?: Date;
  format?: 'csv' | 'excel' | 'pdf' | 'docx';
}

export class ExportService {
  async exportSessions(
    params: ExportParams,
    res: Response
  ): Promise<void> {
    const where: Prisma.SessionWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.plan) {
      where.plan = params.plan;
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
    } else if (format === 'excel') {
      await this.exportToCSV(sessions, res, 'excel');
    } else if (format === 'pdf' || format === 'docx') {
      await this.exportWithAI(sessions, params, res, format);
    }
  }

  private async exportWithAI(
    sessions: any[],
    params: ExportParams,
    res: Response,
    format: 'pdf' | 'docx'
  ): Promise<void> {
    try {
      logger.info(`Generating ${format.toUpperCase()} report with AI for ${sessions.length} sessions`);

      // Prepare data for AI
      const reportData: ReportData[] = sessions.map((session) => ({
        sessionId: session.sessionId,
        txnId: session.txnId,
        plan: session.plan,
        emailUser: session.emailUser,
        emailPaypal: session.emailPaypal,
        amount: Number(session.amount),
        currency: session.currency,
        status: session.status,
        paymentDate: session.paymentDate,
        endDate: session.endDate,
        createdAt: session.createdAt,
        user: session.user,
      }));

      // Generate AI summary
      const startDate = params.startDate
        ? formatDate(params.startDate, 'yyyy-MM-dd')
        : formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const endDate = params.endDate ? formatDate(params.endDate, 'yyyy-MM-dd') : formatDate(new Date(), 'yyyy-MM-dd');

      logger.info('Generating AI summary...');
      const summary = await geminiService.generateReportSummary(reportData, startDate, endDate);

      // Generate document
      if (format === 'pdf') {
        logger.info('Generating PDF document...');
        await pdfGenerator.generateReport(reportData, summary, res);
      } else {
        logger.info('Generating DOCX document...');
        await docxGenerator.generateReport(reportData, summary, res);
      }

      logger.info(`${format.toUpperCase()} report generated successfully`);
    } catch (error) {
      logger.error(`Error generating ${format.toUpperCase()} report:`, error);
      throw error;
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
      amount: number | Prisma.Decimal;
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
        Number(session.amount).toString(),
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

