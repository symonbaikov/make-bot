import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { ReportData, ReportSummary } from './gemini-service';
import { format as formatDate } from 'date-fns';

export class PDFGenerator {
  async generateReport(
    sessions: ReportData[],
    summary: ReportSummary,
    res: Response
  ): Promise<void> {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: summary.title,
        Author: 'Make Bot Admin Panel',
        Subject: 'Payment Report',
        Keywords: 'payment, report, analytics',
      },
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Add content
    this.addHeader(doc, summary);
    this.addSummary(doc, summary);
    this.addMetrics(doc, summary);
    this.addInsights(doc, summary);
    this.addPlanBreakdown(doc, summary);
    this.addRecommendations(doc, summary);
    
    // Add page break before detailed table
    doc.addPage();
    this.addDetailedTable(doc, sessions);

    // Finalize PDF
    doc.end();
  }

  private addHeader(doc: PDFKit.PDFDocument, summary: ReportSummary) {
    // Add title with gradient effect (simulated with colors)
    doc
      .fontSize(24)
      .fillColor('#6366f1')
      .text(summary.title, { align: 'center' });

    doc
      .fontSize(12)
      .fillColor('#9ca3af')
      .text(`Generated on ${formatDate(new Date(), 'MMMM dd, yyyy')}`, {
        align: 'center',
      });

    doc.moveDown(2);

    // Add a line separator
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);
  }

  private addSummary(doc: PDFKit.PDFDocument, summary: ReportSummary) {
    doc.fontSize(16).fillColor('#1f2937').text('Executive Summary', { underline: true });

    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .fillColor('#4b5563')
      .text(summary.summary, { align: 'justify', lineGap: 5 });

    doc.moveDown(1.5);
  }

  private addMetrics(doc: PDFKit.PDFDocument, summary: ReportSummary) {
    doc.fontSize(16).fillColor('#1f2937').text('Key Metrics', { underline: true });

    doc.moveDown(0.5);

    const { keyMetrics } = summary;
    const startY = doc.y;

    // Create 2x3 grid for metrics
    const metrics = [
      {
        label: 'Total Sessions',
        value: keyMetrics.totalSessions.toString(),
        color: '#6366f1',
      },
      {
        label: 'Total Revenue',
        value: `$${keyMetrics.totalRevenue.toFixed(2)}`,
        color: '#10b981',
      },
      {
        label: 'Completed Payments',
        value: keyMetrics.completedPayments.toString(),
        color: '#8b5cf6',
      },
      {
        label: 'Average Amount',
        value: `$${keyMetrics.averageAmount.toFixed(2)}`,
        color: '#f59e0b',
      },
      {
        label: 'Conversion Rate',
        value: `${keyMetrics.conversionRate.toFixed(1)}%`,
        color: '#ec4899',
      },
    ];

    let x = 50;
    let y = startY;
    const boxWidth = 150;
    const boxHeight = 60;
    const gap = 25;

    metrics.forEach((metric, index) => {
      if (index > 0 && index % 3 === 0) {
        x = 50;
        y += boxHeight + gap;
      }

      // Draw metric box
      doc
        .roundedRect(x, y, boxWidth, boxHeight, 5)
        .fillColor('#f9fafb')
        .fill()
        .strokeColor('#e5e7eb')
        .stroke();

      // Label
      doc
        .fontSize(9)
        .fillColor('#6b7280')
        .text(metric.label, x + 10, y + 10, {
          width: boxWidth - 20,
          align: 'left',
        });

      // Value
      doc
        .fontSize(18)
        .fillColor(metric.color)
        .text(metric.value, x + 10, y + 28, {
          width: boxWidth - 20,
          align: 'left',
        });

      x += boxWidth + gap;
    });

    doc.y = y + boxHeight + gap + 10;
  }

  private addInsights(doc: PDFKit.PDFDocument, summary: ReportSummary) {
    doc.fontSize(16).fillColor('#1f2937').text('Key Insights', { underline: true });

    doc.moveDown(0.5);

    summary.insights.forEach((insight, index) => {
      doc
        .fontSize(11)
        .fillColor('#4b5563')
        .text(`${index + 1}. ${insight}`, { lineGap: 5 });
    });

    doc.moveDown(1.5);
  }

  private addPlanBreakdown(doc: PDFKit.PDFDocument, summary: ReportSummary) {
    doc.fontSize(16).fillColor('#1f2937').text('Plan Breakdown', { underline: true });

    doc.moveDown(0.5);

    const { planBreakdown } = summary;
    const startY = doc.y;
    const tableWidth = 500;
    const colWidths = [150, 100, 150, 100];
    const rowHeight = 30;

    // Table header
    let x = 50;
    let y = startY;

    doc
      .rect(x, y, tableWidth, rowHeight)
      .fillColor('#6366f1')
      .fill()
      .fillColor('#ffffff');

    const headers = ['Plan', 'Sessions', 'Revenue', 'Percentage'];
    headers.forEach((header, i) => {
      doc.fontSize(10).text(header, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 10, y + 10, {
        width: colWidths[i] - 20,
        align: 'left',
      });
    });

    y += rowHeight;

    // Table rows
    planBreakdown.forEach((plan, rowIndex) => {
      const fillColor = rowIndex % 2 === 0 ? '#f9fafb' : '#ffffff';
      doc.rect(x, y, tableWidth, rowHeight).fillColor(fillColor).fill();

      doc.fillColor('#1f2937');

      const data = [
        plan.plan,
        plan.count.toString(),
        `$${plan.revenue.toFixed(2)}`,
        `${plan.percentage.toFixed(1)}%`,
      ];

      data.forEach((text, i) => {
        doc.fontSize(9).text(text, x + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 10, y + 10, {
          width: colWidths[i] - 20,
          align: 'left',
        });
      });

      y += rowHeight;
    });

    // Table border
    doc
      .rect(50, startY, tableWidth, y - startY)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    doc.y = y + 20;
  }

  private addRecommendations(doc: PDFKit.PDFDocument, summary: ReportSummary) {
    doc.fontSize(16).fillColor('#1f2937').text('Recommendations', { underline: true });

    doc.moveDown(0.5);

    summary.recommendations.forEach((recommendation, index) => {
      doc
        .fontSize(11)
        .fillColor('#4b5563')
        .text(`${index + 1}. ${recommendation}`, { lineGap: 5 });
    });

    doc.moveDown(1.5);
  }

  private addDetailedTable(doc: PDFKit.PDFDocument, sessions: ReportData[]) {
    doc.fontSize(16).fillColor('#1f2937').text('Detailed Transaction List', { underline: true });

    doc.moveDown(0.5);

    if (sessions.length === 0) {
      doc.fontSize(10).fillColor('#6b7280').text('No sessions found for the selected period.');
      return;
    }

    const tableTop = doc.y;
    const rowHeight = 25;
    let y = tableTop;

    // Table headers
    const headers = ['Session ID', 'Plan', 'Amount', 'Status', 'Date'];
    const colWidths = [120, 80, 80, 90, 130];
    let x = 50;

    // Header background
    doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fillColor('#6366f1').fill();

    // Header text
    doc.fillColor('#ffffff').fontSize(9);
    headers.forEach((header, i) => {
      doc.text(header, x, y + 8, { width: colWidths[i], align: 'center' });
      x += colWidths[i];
    });

    y += rowHeight;

    // Table rows (limit to fit on page)
    const maxRows = Math.min(sessions.length, 15);

    sessions.slice(0, maxRows).forEach((session, index) => {
      const fillColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
      x = 50;

      doc.rect(x, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fillColor(fillColor).fill();

      doc.fillColor('#1f2937').fontSize(8);

      const data = [
        session.sessionId.substring(0, 16) + '...',
        session.plan.charAt(0) + session.plan.slice(1).toLowerCase(),
        `$${Number(session.amount).toFixed(2)}`,
        session.status.charAt(0) + session.status.slice(1).toLowerCase().replace('_', ' '),
        session.paymentDate ? formatDate(session.paymentDate, 'yyyy-MM-dd HH:mm') : 'N/A',
      ];

      data.forEach((text, i) => {
        doc.text(text, x, y + 8, { width: colWidths[i], align: 'center' });
        x += colWidths[i];
      });

      y += rowHeight;

      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
    });

    if (sessions.length > maxRows) {
      doc.moveDown(1);
      doc
        .fontSize(9)
        .fillColor('#6b7280')
        .text(`... and ${sessions.length - maxRows} more sessions`, { align: 'center' });
    }
  }
}

export const pdfGenerator = new PDFGenerator();

